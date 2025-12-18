import express from 'express';
import utils from '../../utils/index.js';
import {systemSettings} from '../../utils/menuString.js';
import pools from '../../utils/pools.js';
import svgCaptcha from 'svg-captcha';
import { v4 as uuidv4 } from "uuid";
import moment from 'moment';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import crypto from 'crypto';
import axios from 'axios';
import COS from 'cos-nodejs-sdk-v5';
import schedule from 'node-schedule';

// ================================
// 🕐 启动时加载定时任务
function startCheckDateJob() {
  console.log("定时任务启动中：每天凌晨 1:30 自动执行测试逻辑");

  // 每天凌晨  1:30 执行
 schedule.scheduleJob('37 1 * * *', async () => {
  try {
    const defaultDate = '2025-11-21'; // 目标日期
    const defaultDays = 7;            // 提前天数

    const today = new Date();
    const inputDate = new Date(defaultDate);

    // 计算剩余天数（正数代表还剩几天）
    const diffDays = Math.round((inputDate - today) / (1000 * 60 * 60 * 24));

    // 判断是否在目标日期前 7 天以内
    const isWithin = diffDays >= 0 && diffDays <= defaultDays;

    console.log(`[定时任务] 每天凌晨1:30执行测试：`, {
      today: today.toISOString().slice(0, 10),
      target: defaultDate,
      diffDays,
      isWithin
    });
  } catch (err) {
    console.error(`[定时任务错误]`, err);
  }
});
}

// 调用函数，启动任务
startCheckDateJob();
// ================================




const router = express.Router();
// ------------------------------钉钉相关------------------------------

// 获取钉钉的审批
async function getApprovalNumber(instanceId,token) {
    try {
        const url = `https://api.dingtalk.com/v1.0/workflow/processInstances`;
        const res = await axios.get(url, {
            params: { processInstanceId: instanceId },
            headers: {
                'x-acs-dingtalk-access-token': token
            }, timeout: 30000
        });
        console.log(res.data.result.businessId)
        return res.data.result.businessId;  // 返回完整响应数据
    } catch (error) {
        console.error('调用钉钉获取审批接口失败：', error.response?.data || error);
        throw error;
    }
}
// 查询审批编号


// 测试 token 是否有效（调用钉钉流程编码接口）
async function getProcessCodeByName(token, remark) {
  console.log("remark------ **********:", remark,token);
  try {
    const url = `https://api.dingtalk.com/v1.0/workflow/processCentres/schemaNames/processCodes`;
    const res = await axios.get(url, {
      params: { name: remark },
      headers: {
        'x-acs-dingtalk-access-token': token
      }
    });
    // 成功直接返回数据结构
    return { ok: true, data: res.data };
  } catch (error) {
    const errData = error.response?.data || {};
    console.log("errData------ **********:", errData);
    // 失败时返回统一结构，便于上层判断是否为 token 失效
    return { ok: false, error: errData };
  }
}
// 获取流程编码code
router.post("/getDingTalkToken", async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    // console.log("user------*********************:", user);
    await utils.checkPermi({ req, res, role: [systemSettings.user.userQuery] });

    // 1) 读取 appKey/appSecret 与流程名（remark）
    let moreSql = `SELECT id, name, remark, app_key AS appKey, app_secret AS appSecret, update_time AS updateTime, create_time AS createTime FROM more WHERE 1=1`;
    moreSql = utils.setAssign(moreSql, "id", user.moreId);
    let { result: moreRows } = await pools({ sql: moreSql, res, req });
    if (!moreRows || !moreRows.length) {
      return res.send(utils.returnData({ code: -1, msg: "未找到当前 moreId 的配置信息" }));
    }
    // console.log("moreRows------ **********:", moreRows);
    const appKey = moreRows[0].appKey;
    const appSecret = moreRows[0].appSecret;
    const remark = moreRows[0].remark; // 用作流程名称
    if (!appKey || !appSecret) {
      return res.send(utils.returnData({ code: -1, msg: "未配置钉钉 appKey 或 appSecret" }));
    }

    // 2) 如果已有 ddtk，则先校验 token 是否有效；否则申请新的 token
    let currentToken = user.ddtk;
    let refreshed = false;

    const ensureFreshToken = async () => {
      const dtRes = await axios.get('https://oapi.dingtalk.com/gettoken', {
        params: { appkey: appKey, appsecret: appSecret },
      });
      if (dtRes.data?.errcode === 0) {
        currentToken = dtRes.data.access_token;
        // 落库更新用户 ddtk
        const updateSql = `UPDATE user SET ddtk=?, update_time=? WHERE id=?`;
        const { result: updateResult } = await pools({ sql: updateSql, val: [currentToken, moment().format('YYYY-MM-DD HH:mm:ss'), user.id], res, req });
        if (!updateResult || updateResult.affectedRows === 0) {
          return res.send(utils.returnData({ code: -1, msg: "更新用户钉钉token失败" }));
        }
        refreshed = true;
      } else {
        return res.send(utils.returnData({ code: -1, msg: `钉钉获取token失败：${dtRes?.data?.errmsg || '未知错误'}` }));
      }
    };

    if (!currentToken) {
      console.log("!currentToken------ **********:", currentToken);
      await ensureFreshToken();
    } else {
      const check = await getProcessCodeByName(currentToken, remark);
         if (!check.ok) {
        // 兼容 errcode 或 code 的返回格式，40001 为 token 失效
        console.log("!check.ok------ **********:", check);
          await ensureFreshToken();
      }
      let data= await startDingTalkProcess(check.data.result.processCode,user,moreRows[0],req.body.payload)
      return res.send(utils.returnData(data));
    }

    // 3) 返回统一结构（包含是否刷新）
  } catch (error) {
    console.error("获取钉钉token异常：", error);
    return res.send(utils.returnData({ code: -1, msg: "获取钉钉token异常" }));
  }
})
// 调用 钉钉流程发起审批
 async function startDingTalkProcess  (startDingTalkProcess,user,moreRows,payload) {

  try {

    // 读取 more 表获取 appKey/appSecret 以及 remark(流程名称)
    let moreSql = `SELECT id, name, remark, app_key AS appKey, app_secret AS appSecret FROM more WHERE 1=1`;
    moreSql = utils.setAssign(moreSql, 'id', user.more_id);
    if (!moreRows ) {
      return { code: -1, msg: '未找到当前 moreId 的配置信息' };
    }
    const appKey = moreRows.appKey;
    const appSecret = moreRows.appSecret;
    if (!appKey || !appSecret) {
      return { code: -1, msg: '未配置钉钉 appKey 或 appSecret' };
    }

    // 校验/确保可用 token
    const originatorUserId = user.employeeUserId;
    const deptId = user.departmentId;
    let processCode = startDingTalkProcess;
    let formComponentValues =  payload;


    if (!originatorUserId || !deptId || !processCode) {
      return { code: -1, msg: '缺少必要参数：originatorUserId/deptId/processCode' };
    }

    const url = 'https://api.dingtalk.com/v1.0/workflow/processInstances';
    const dtRes = await axios.post(url, {
      processCode,
      originatorUserId,
      deptId,
      formComponentValues,
    }, {
      headers: {
        'x-acs-dingtalk-access-token': user.ddtk,
        'Content-Type': 'application/json',
      },
    });

   let code = await getApprovalNumber(dtRes.data.instanceId,user.ddtk);

    return { msg: '发起审批成功', data: {instanceId:dtRes.data.instanceId,code} };
  } catch (error) {
    const errmsg = error.response?.data?.message || error.response?.data?.errmsg || error.message || '未知错误';
     return { code: -1, msg: `发起审批失败：${errmsg}` };

  }
}


// ------------------------------钉钉相关------------------------------

//获取图形二维码
router.post("/getCaptcha", async (req, res) => {
  console.log("req.body------ **********:", req.body);
    const captcha = svgCaptcha.create({
        inverse: false, // 翻转颜色
        fontSize: 48, // 字体大小
        width:  110, // 宽度
        height: 36, // 高度
        size: 4, // 验证码长度
        ignoreChars: '0oO1iIg', // 验证码字符中排除 0o1i
        color: true, // 验证码是否有彩色
        noise: 2, // 干扰线几条
        background: '#f5f5f5', // 验证码图片背景颜色
    });
    res.setHeader('Access-Control-Expose-Headers', 'captcha');
    let captchaToken=utils.setToken({captcha:captcha.text.toLowerCase(),name:"captcha"});
    res.setHeader('captcha', captchaToken);
    res.send(utils.returnData({data:captcha.data}))
});

//登录
router.post("/login", async (req, res) => {
    let sql = "SELECT id,admin,more_id FROM user WHERE name=? AND pwd=?", {name,pwd,captcha} = req.body;
    let captchaRes=utils.verToken({token:req.headers.captcha,name:"captcha"});
    if(!captchaRes||captchaRes.captcha!==captcha.toLowerCase()) return res.send(utils.returnData({code: -1, msg: "验证码错误！！！",req}));
    let {result}=await pools({sql,val:[name, pwd],res,req});
    if (result.length === 0) return res.send(utils.returnData({code: -1, msg: "请输入正确的用户名和密码！",req}));
    let uid = result[0].id, admin = result[0].admin;
    let token = utils.setToken({uid});
    res.send(utils.returnData({data: {uid, name, token, admin}}));
});

//获取用户信息
router.post("/getUserInfo",async (req,res)=>{
    let user = await utils.getUserRole(req, res);
    let sql = `SELECT b.menu_bg AS menuBg,b.menu_sub_bg AS menuSubBg,b.menu_text AS menuText,b.menu_active_text AS menuActiveText,b.menu_sub_active_text AS menuSubActiveText,b.menu_hover_bg AS menuHoverBg,b.el_theme AS elTheme,b.el_bg AS elBg,b.el_text AS elText FROM theme AS b WHERE user_id=?`;
    let {result}=await pools({sql,val:[user.user.id],res,req});
    res.send(utils.returnData({data:{...user,theme:result[0]}}));
})

async function getRouter(req, res, sidebar = false) {
    // 基础SQL查询
    const sql = `
        SELECT id, parent_id AS parentId, path, hidden, redirect, 
        always_show AS alwaysShow, name, layout, parent_view AS parentView,
        meta, component, sort, alone, role_key AS roleKey, 
        menu_type AS menuType, title, icon, no_cache AS noCache,
        update_time AS updateTime, create_time AS createTime 
        FROM router_menu 
        ORDER BY sort ASC, create_time DESC
    `;

    // 获取用户角色并验证
    const userRole = await utils.getUserRole(req, res);
    if (userRole === -1) return res.send(utils.returnData({code: -1, req}));
    
    const roles = (userRole.userRole || "").split(",").filter(Boolean);
    const isAdmin = userRole.user.admin === 1 || userRole.roleAdmin;

    // 获取路由数据
    const {result} = await pools({sql, res, req});
    const routerArr = [];

    // 递归构建路由树
    const buildRouterTree = (items, parentId = 0, pathView = "") => {
        return items
            .filter(item => item.parentId === parentId)
            .map(item => {
                // 处理meta数据
                const meta = {
                    ...(typeof item.meta === 'string' ? JSON.parse(item.meta || '{}') : {}),
                    title: item.title,
                    icon: item.icon,
                    noCache: item.noCache
                };
                const router = {
                    ...item,
                    meta,
                    pathView: item.path,
                    path: pathView + item.path,
                    hidden: item.menuType === 'F' ? 1 : item.hidden
                };
                // 递归获取子路由
                const children = buildRouterTree(items, item.id, router.path);
                if (children.length) {
                    // 处理菜单类型为"C"的特殊情况
                    if (item.menuType === 'C') {
                        routerArr.push(...children);
                        if (sidebar) return {...router};
                    }
                    router.children = children;
                }
                // 权限过滤
                if (!isAdmin && !roles.includes(String(item.id))) return null;
                return router;
            })
            .filter(Boolean);
    };
    let routerMenu = buildRouterTree(result);
    // 处理独立路由
    if (sidebar) {
        routerMenu = routerMenu.map(route => {
            if (route.menuType === 'C' && (!route.children || !route.children.length)) return {
                ...route,
                layout: 1,
                path: '/' + Math.random(),
                name: '',
                children: [{
                    ...route,
                    layout: 0,
                    alone: 1,
                    children: undefined
                }]
            };
            return route;
        });
    }
    return {routerMenu, routerArr};
}
//获取路由 侧边栏
router.post("/getRouter", async (req, res) => {
    let {routerMenu,routerArr}=await getRouter(req,res,true);
    function bianpinghua(list){
        let arr=[];
        list.map(t=>{
            if(t.children&&t.children.length) arr.push(...bianpinghua(t.children))
            arr.push({...t,name:'',layout:1,path:"/"+Math.random(),children: [{...t,layout:0, alone:1, children:undefined}],hidden:1});
        })
        return arr
    }
    routerArr=bianpinghua(routerArr);
    routerArr= routerArr.filter((obj, index, self) => index === self.findIndex((t) => (t.id === obj.id)));
    res.send(utils.returnData({data:{routerMenu:routerMenu.concat(routerArr)}}))
});
//菜单管理获取
router.post("/getRouterSystem", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.menus.menuQuery]});
    let {routerMenu}=await getRouter(req,res);
    res.send(utils.returnData({data:{routerMenu}}));
})
//添加菜单
router.post("/addMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.menus.menuAdd]});
    let sql = "INSERT INTO router_menu(parent_id,path,hidden,name,layout,parent_view,component,sort,alone,role_key,menu_type,title,icon,no_cache,meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        obj = req.body;
    await utils.existName({sql:"SELECT id FROM router_menu WHERE role_key=?",name:obj.roleKey,res,msg:"权限字符已存在！",req});
    await utils.existName({sql:"SELECT id FROM router_menu WHERE name=?",name:obj.name,res,msg:"页面名称已存在！！",req});
    let meta = {};
    // meta.title = obj.title;
    // meta.icon = obj.icon;
    // meta.noCache = obj.noCache;
    await pools({sql,val:[obj.parentId, obj.path, obj.hidden, obj.name, obj.parentId == 0 ? 1 : 0, obj.parentView, obj.component, obj.sort, obj.alone, obj.roleKey, obj.menuType,obj.title,obj.icon,obj.noCache,JSON.stringify(meta)],run:false,res,req});
});
//修改菜单
router.post("/changeMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.menus.menuUp]});
    let sql = "UPDATE  router_menu SET parent_id=?,path=?,hidden=?,name=?,layout=?,parent_view=?,component=?,sort=?,alone=?,role_key=?,menu_type=?,title=?,icon=?,no_cache=?,meta=? WHERE id=?",
        obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT role_key FROM router_menu WHERE  id=?",sqlName:"role_key",name:obj.roleKey,id:obj.id,req,res});
    if(judgeUserNameRes===1)await utils.existName({sql:"SELECT id FROM router_menu WHERE role_key=?",name:obj.roleKey,res,msg:"权限字符已存在！",req});
    let judgeUserNameRes2 = await utils.judgeUserName({sql:"SELECT name FROM router_menu WHERE  id=?",sqlName:"name",name:obj.name,id:obj.id,req,res});
    if(judgeUserNameRes2===1)await utils.existName({sql:"SELECT id FROM router_menu WHERE name=?",name:obj.name,res,msg:"页面名称已存在！",req});
    let meta = {};
    // meta.title = obj.title;
    // meta.icon = obj.icon;
    // meta.noCache = obj.noCache;
    await pools({sql,val:[obj.parentId, obj.path, obj.hidden, obj.name, obj.parentId == 0 ? 1 : 0, obj.parentView, obj.component, obj.sort, obj.alone, obj.roleKey, obj.menuType,obj.title,obj.icon,obj.noCache,JSON.stringify(meta), obj.id],run:false,res,req});
});
//删除菜单
router.post("/delMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.menus.menuDelete]});
    let sql = "DELETE FROM router_menu WHERE id=?";
    let selectSql = "SELECT id FROM router_menu WHERE parent_id=?";
    let obj = req.body;
    let {result}=await pools({sql:selectSql,val:[obj.id],res,req});
    if (result.length !== 0) return res.send(utils.returnData({code: -1, msg: "删除失败，请先删除子级",req}));
    await pools({sql,val:[obj.id],run:false,res,req});
});
//查询角色
router.post("/getRoles", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.role.roleQuery]});
    let obj=req.body;
    let sql = `SELECT id,name,roles,checked_roles AS checkedRoles,role_key AS roleKey,update_time AS updateTime,create_time AS createTime FROM roles WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    sql=utils.setLike(sql,"role_key",obj.roleKey);
    let {total}=await utils.getSum({sql,name:"roles",res,req});
    sql+=` ORDER BY id ASC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({data: result,total}));
});
//查询角色全部
router.post("/getRolesAll", async (req, res) => {
    let sql = `SELECT id,name,roles,checked_roles AS checkedRoles,role_key AS roleKey FROM roles`;
    await pools({sql,res,req,run:false});
});
//添加角色
router.post("/addRoles", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.role.roleAdd]});
    let sql = "INSERT INTO roles(name,roles,role_key) VALUES (?,?,?)", obj = req.body;
    await utils.existName({sql:"SELECT id FROM roles WHERE role_key=?",name:obj.roleKey,res,msg:"权限字符已存在！",req});
    await pools({sql,val:[obj.name, obj.roles, obj.roleKey],res,req,run:false});
});
//修改角色
router.post("/upRoles", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.role.roleUp]});
    let sql = "UPDATE  roles SET roles=?,name=?,role_key=? WHERE id=?", obj = req.body;
    //总管理不能操作
    await utils.upAdminRole({req,res,id:obj.id});
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT role_key FROM roles WHERE  id=?",sqlName:"role_key",name:obj.roleKey,id:obj.id,req,res});
    if(judgeUserNameRes===1)await utils.existName({sql:"SELECT id FROM roles WHERE role_key=?",name:obj.roleKey,res,msg:"权限字符已存在！",req});
    await pools({sql,val:[obj.roles, obj.name, obj.roleKey,obj.id],res,req,run:false});
});
//删除角色
router.post("/delRoles", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.role.roleDelete]});
    let sql = "DELETE FROM roles WHERE id=?", obj = req.body;
    //总管理不能操作
    await utils.upAdminRole({req,res,id:obj.id});
    await pools({sql,val:[obj.id],res,req,run:false});
});
function getThemeDefaultSql(){
    return "SELECT menu_bg AS menuBg,menu_sub_bg AS menuSubBg,menu_text AS menuText,menu_active_text AS menuActiveText,menu_sub_active_text AS menuSubActiveText,menu_hover_bg AS menuHoverBg FROM theme_default WHERE id=1"
}
// 动态确保 user 表存在部门ID与员工userID列
async function ensureUserDeptEmployeeColumns(res, req) {
    try {
        const { result } = await pools({ sql: "SHOW COLUMNS FROM `user`", res, req });
        const colTypes = new Map(Array.isArray(result) ? result.map(c => [c.Field, (c.Type || '').toLowerCase()]) : []);
        // department_id: 数值型即可
        if (!colTypes.has("department_id")) {
            await pools({ sql: "ALTER TABLE `user` ADD COLUMN `department_id` INT DEFAULT NULL COMMENT '部门ID' AFTER more_id", res, req, run: false });
        }
        // employee_user_id: 可能包含前导0或超出INT范围，使用VARCHAR保留原始值
        if (!colTypes.has("employee_user_id")) {
            await pools({ sql: "ALTER TABLE `user` ADD COLUMN `employee_user_id` VARCHAR(64) DEFAULT NULL COMMENT '员工userID' AFTER department_id", res, req, run: false });
        } else {
            const t = colTypes.get("employee_user_id") || "";
            if (t.includes("int")) {
                await pools({ sql: "ALTER TABLE `user` MODIFY COLUMN `employee_user_id` VARCHAR(64) DEFAULT NULL COMMENT '员工userID' AFTER department_id", res, req, run: false });
            }
        }
    } catch (e) {
        console.error('ensureUserDeptEmployeeColumns error:', e?.message || e);
    }
}
//添加用户
router.post("/addUser", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userAdd]});
    await ensureUserDeptEmployeeColumns(res, req);
    let sql = "INSERT INTO user(name,status,roles_id,remark,pwd,more_id,url,department_id,employee_user_id) VALUES (?,?,?,?,?,?,?,?,?)", obj = req.body;
    await utils.existName({sql: "SELECT id FROM user WHERE  name=?", name: obj.name,res,msg:"用户名已被使用！",req});
    let {result}=await pools({sql,val:[obj.name, obj.status,obj.rolesId, obj.remark, obj.pwd, obj.moreId,obj.url||"", (obj.departmentId ?? obj.department_id ?? null), (obj.employeeUserId ?? obj.employee_user_id ?? null)],res,req});
    const themeDefault=await pools({sql:getThemeDefaultSql(),res,req,run:true});
    const themeData=themeDefault.result[0];
    let themeSql="INSERT INTO theme(user_id,menu_bg,menu_sub_bg,menu_text,menu_active_text,menu_sub_active_text,menu_hover_bg,el_bg,el_text) VALUES (?,?,?,?,?,?,?,?,?)";
    await pools({sql:themeSql,val:[result.insertId,themeData.menuBg,themeData.menuSubBg,themeData.menuText,themeData.menuActiveText,themeData.menuSubActiveText,themeData.menuHoverBg,themeData.menuBg,themeData.menuText],res,req,run:false});
});

router.post("/getTheme", async (req, res) => {
    await pools({sql:getThemeDefaultSql(),res,req,run:false});
})

//查询用户
router.post("/getUser", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userQuery]});
    let obj=req.body;
    await ensureUserDeptEmployeeColumns(res, req);
    let sql = `SELECT a.id AS id,name,status,roles_id AS rolesId,remark,admin,more_id AS moreId,url,department_id AS departmentId,employee_user_id AS employeeUserId,a.update_time AS updateTime,a.create_time AS createTime,b.menu_bg AS menuBg,b.menu_sub_bg AS menuSubBg,b.menu_text AS menuText,b.menu_active_text AS menuActiveText,b.menu_sub_active_text AS menuSubActiveText,b.menu_hover_bg AS menuHoverBg,b.el_theme AS elTheme,b.el_bg AS elBg,b.el_text AS elText FROM user AS a LEFT JOIN theme b ON a.id=b.user_id WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    sql=utils.setAssign(sql,"more_id",obj.moreId);
    sql=utils.setAssign(sql,"status",obj.status);
    let {total}=await utils.getSum({sql,name:"user",res,req});
    sql+=` ORDER BY id ASC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({data: result,total}));
});


//修改主题
router.post("/upTheme", async (req, res) => {
    let sql = "UPDATE  theme SET menu_bg=?,menu_sub_bg=?,menu_text=?,menu_active_text=?,menu_sub_active_text=?,menu_hover_bg=?,el_theme=?,el_bg=?,el_text=? WHERE user_id=?", obj = req.body;
    await pools({sql,val:[obj.menuBg,obj.menuSubBg,obj.menuText,obj.menuActiveText,obj.menuSubActiveText,obj.menuHoverBg,obj.elTheme,obj.elBg,obj.elText,obj.id],res,req,run:false});
});



//修改用户
router.post("/upUser", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userUp]});
    await ensureUserDeptEmployeeColumns(res, req);
    let sql = "UPDATE  user SET name=?,status=?,roles_id=?,remark=?,more_id=?,url=?,department_id=?,employee_user_id=? WHERE id=?", obj = req.body;
    //总管理不能操作
    await utils.upAdmin({req,res,id:obj.id});
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM user WHERE  id=?",name:obj.name,id:obj.id,req,res});
    if (judgeUserNameRes === 1) await utils.existName({sql: "SELECT id FROM user WHERE  name=?", name: obj.name,res,msg:"用户名已被使用！",req});
    await pools({sql,val:[obj.name, obj.status,obj.rolesId, obj.remark, obj.moreId, obj.url,(obj.departmentId ?? obj.department_id ?? null),(obj.employeeUserId ?? obj.employee_user_id ?? null),obj.id],res,req,run:false});
});

//修改我的信息
router.post("/upUserInfo", async (req, res) => {
    // await utils.checkPermi({req,res,role:[systemSettings.user.userUp]});
    let user=await utils.getUserInfo({req,res});
    let sql = "UPDATE  user SET name=?,url=? WHERE id=?", obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM user WHERE  id=?",name:obj.name,id:user.id,req,res});
    if (judgeUserNameRes === 1) await utils.existName({sql: "SELECT id FROM user WHERE  name=?", name: obj.name,res,msg:"登陆账号已被使用！",req});
    await pools({sql,val:[obj.name, obj.url,user.id],res,req,run:false});
});


//修改我的信息密码
router.post("/upUserPwdInfo", async (req, res) => {
    // await utils.checkPermi({req,res,role:[systemSettings.user.userPwd]});
    let user=await utils.getUserInfo({req,res});
    let sql = "UPDATE  user SET pwd=? WHERE id=?", obj = req.body;
    await pools({sql,val:[obj.pwd,user.id],res,req,run:false});
});


//修改用户密码
router.post("/upUserPwd", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userPwd]});
    let sql = "UPDATE  user SET pwd=? WHERE id=?", obj = req.body;
    let getUserIdRes=await utils.getUserId({id:obj.id,req,res});
    if(getUserIdRes.admin===1){
        let user=await utils.getUserInfo({req,res});
        if(user.admin!==1) return res.send(utils.returnData({code: -1,msg:"总管理密码只能总管理账号修改！",req}));
    }
    await pools({sql,val:[obj.pwd,obj.id],res,req,run:false});
});

//删除用户
router.post("/delUser", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userDelete]});
    let obj = req.body;
    //总管理不能操作
    await utils.upAdmin({req,res,id:obj.id});
    let user = await utils.getUserInfo({req, res});
    if (obj.id == user.id) return res.send(utils.returnData({code: -1, msg: "无法删除正在使用中的用户~",req}));
    let sql = "DELETE FROM user WHERE id=?";
    await pools({sql,val:[obj.id],res,req,run:false});
});


//添加多账号
router.post("/addMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreAdd]});
    // await ensureMoreAppColumns(res, req);
    let sql = "INSERT INTO more(name,remark,app_key,app_secret) VALUES (?,?,?,?)", obj = req.body;
    await utils.existName({sql: "SELECT id FROM more WHERE  name=?", name: obj.name,res,msg:"账号名已存在！",req});
    await pools({sql,val:[obj.name, obj.remark, (obj.appKey ?? obj.app_key ?? null), (obj.appsecret ?? obj.app_secret ?? null)],res,req,run:false});
});
//查询多账号
router.post("/getMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreQuery]});
    let obj=req.body;
    // await ensureMoreAppColumns(res, req);
    let sql = `SELECT id,name,remark,app_key ,app_secret ,update_time AS updateTime,create_time AS createTime FROM more WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    let {total}=await utils.getSum({sql,name:"more",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));

});
//查询多账号 全部
router.post("/getMoreAll", async (req, res) => {
    // await ensureMoreAppColumns(res, req);
    // 权限：rolesId 为 1/2/3 查看全部；否则仅查看绑定 moreId 的公司（匹配 more.id）
    const user = await utils.getUserRole(req, res);
    const rolesId = user?.user?.rolesId;
    const moreId = user?.user?.moreId;
    const isSuper = [1, 2, 3].includes(Number(rolesId));

    let sql = "SELECT id,name,remark,app_key ,app_secret  FROM more";
    if (!isSuper && moreId !== undefined && moreId !== null) {
      // moreId 可能是单个值 17，也可能是多值字符串 "17,8"
      const ids = String(moreId)
        .split(',')
        .map(id => id.trim())
        .filter(id => id !== '');

      if (ids.length === 0) {
        // 没有有效 id，直接返回空数据
        return res.send(utils.returnData({ data: [], total: 0 }));
      }

      const placeholders = ids.map(() => '?').join(',');
      sql += ` WHERE id IN (${placeholders})`;
      await pools({ sql, val: ids, res, req, run:false });
    } else {
      await pools({ sql, res, req, run:false });
    }
});
//修改多账号
router.post("/upMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreUp]});
    let sql = "UPDATE  more SET name=?,remark=?,app_key=?,app_secret=? WHERE id=?", obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM more WHERE  id=?",sqlName:"name",name:obj.name,id:obj.id,req,res});
    if(judgeUserNameRes===1)await utils.existName({sql:"SELECT id FROM more WHERE name=?",name:obj.name,res,msg:"多账号名称已存在！",req});
    await pools({sql,val:[obj.name, obj.remark, (obj.appKey ?? obj.app_key ?? null), (obj.appsecret ?? obj.app_secret ?? null), obj.id],res,req,run:false});
});
//删除多账号
router.post("/delMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreDelete]});
    let sql = "DELETE FROM more WHERE id=?", obj = req.body;
    await pools({sql,val:[ obj.id],res,req,run:false});
});

//添加字典
router.post("/addDict", async (req, res) => {
    let sql = "INSERT INTO dict(name,type,remark) VALUES (?,?,?)", obj = req.body;
    await utils.existName({sql: "SELECT id FROM dict WHERE  type=?", name: obj.type,res,msg:"字典类型已存在！",req});
    await pools({sql,val:[obj.name,obj.type,obj.remark],res,req,run:false});
});
//查询字典
router.post("/getDict", async (req, res) => {
    let obj=req.body;
    let sql = `SELECT id,name,remark,type,update_time AS updateTime,create_time AS createTime FROM dict WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    sql=utils.setLike(sql,"type",obj.type);
    let {total}=await utils.getSum({sql,name:"dict",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});

//查询字典(不分页)
router.post("/getDictAll", async (req, res) => {
    let obj=req.body;
    let sql = `SELECT id,name,create_time AS createTime,remark,type FROM dict WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    sql+=` ORDER BY id DESC`;
    await pools({sql,res,req,run:false});
});

//修改字典
router.post("/upDict", async (req, res) => {
    let sql = "UPDATE  dict SET name=?,type=?,remark=? WHERE id=?", obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT type FROM dict WHERE  id=?",name:obj.type,id:obj.id,sqlName:"type",req,res});
    if (judgeUserNameRes === 1) await utils.existName({sql: "SELECT id FROM dict WHERE  type=?", name: obj.type,res,msg:"字典类型已存在！",req});
    await pools({sql,val:[obj.name, obj.type, obj.remark, obj.id],res,req,run:false});
});

//删除字典
router.post("/delDict", async (req, res) => {
    let sql = "DELETE FROM dict WHERE id=?", obj = req.body;
    await pools({sql,val:[obj.id],res,req,run:false});
});

//添加字典项目
router.post("/addDictItem", async (req, res) => {
    let sql = "INSERT INTO dict_item(dict_id,dict_label,dict_value,dict_sort,dict_class,status,remark) VALUES (?,?,?,?,?,?,?)", obj = req.body;
    await pools({sql,val:[obj.dictId,obj.label,obj.value,obj.dictSort,obj.dictClass,obj.status,obj.remark],res,req,run:false});
});

//查询字典项目
router.post("/getDictItem", async (req, res) => {
    let obj=req.body;
    let sql = `SELECT a.id AS id,dict_id AS dictId,dict_label AS label,dict_value AS value,dict_sort AS dictSort,dict_class AS dictClass,status,a.update_time AS updateTime,a.create_time AS createTime,a.remark AS remark,type FROM dict_item AS a LEFT JOIN dict b ON a.dict_id=b.id WHERE dict_id=?`;
    sql=utils.setLike(sql,"a.dict_label",obj.label);
    sql=utils.setLike(sql,"a.dict_value",obj.value);
    sql+=" ORDER BY dict_sort ASC, a.create_time DESC";
    await pools({sql,val:[obj.dictId],res,req,run:false});
});

//修改字典项目
router.post("/upDictItem", async (req, res) => {
    let obj=req.body;
    let sql = `UPDATE  dict_item SET dict_label=?,dict_value=?,dict_sort=?,dict_class=?,status=?,remark=? WHERE id=?`;
    await pools({sql,val:[obj.label,obj.value,obj.dictSort,obj.dictClass,obj.status,obj.remark,obj.id],res,req,run:false});
});
//删除字典项目
router.post("/delDictItem", async (req, res) => {
    let sql = "DELETE FROM dict_item WHERE id=?", obj = req.body;
    await pools({sql,val:[obj.id],res,req,run:false});
});

//根据类型查询字典项目
router.post("/getDictType", async (req, res) => {
    let obj=req.body;
    let sql = `SELECT a.id AS id,dict_label AS label,dict_value AS value,dict_sort AS dictSort,dict_class AS dictClass,a.remark AS remark,type FROM dict_item AS a LEFT JOIN dict b ON a.dict_id=b.id WHERE b.type=? AND a.status=1 ORDER BY dict_sort ASC,  a.create_time DESC`;
    await pools({sql,val:[obj.type],res,req,run:false});
});

//查询日志
router.post("/getLogs", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.logs.logsQuery]});
    let obj=req.body;
    let sql = `SELECT id,name,browser,system_name AS systemName,host,place,port,remark,update_time AS updateTime,create_time AS createTime FROM logs WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    sql=utils.setLike(sql,"host",obj.host);
    sql=utils.setLike(sql,"port",obj.port);
    let {total}=await utils.getSum({sql,name:"logs",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});


//新增表


router.post("/importData", async (req, res) => {
    try {
        const { tableName, data, operator } = req.body; // operator 来自前端 userStore.name
        console.log("importData", data.length);
        if (!tableName || !Array.isArray(data) || !data.length || !operator) {
            return res.send(utils.returnData({ code: -1, msg: "参数错误", data: {} }));
        }

        // 1️⃣ 检查表是否存在
        let sql = `SHOW TABLES LIKE ?`;
        const { result: tableExists } = await pools({ sql, val: [tableName], res, req });

        const firstRow = data[0];
        const columns = Object.keys(firstRow);
        const columnDefs = columns.map(c => `\`${c}\` VARCHAR(255)`).join(",");

        if (!tableExists.length) {
            // 表不存在就创建
            sql = `CREATE TABLE \`${tableName}\` (
                id CHAR(36) PRIMARY KEY,
                operator VARCHAR(255),
                create_time DATETIME,
                ${columnDefs}
            )`;
            await pools({ sql, res, req });
            console.log(`表 ${tableName} 已创建`);
        } else {
            // 2️⃣ 表存在，检查缺失列并添加
            const { result: existingColumns } = await pools({ sql: `SHOW COLUMNS FROM \`${tableName}\``, res, req });
            const existingColumnNames = existingColumns.map(c => c.Field);

            if (!existingColumnNames.includes("operator")) {
                await pools({ sql: `ALTER TABLE \`${tableName}\` ADD COLUMN operator VARCHAR(255)`, res, req });
            }
            if (!existingColumnNames.includes("create_time")) {
                await pools({ sql: `ALTER TABLE \`${tableName}\` ADD COLUMN create_time DATETIME`, res, req });
            }
            for (const col of columns) {
                if (!existingColumnNames.includes(col)) {
                    await pools({ sql: `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` VARCHAR(255)`, res, req });
                }
            }
        }

        // 3️⃣ 批量插入
        const BATCH_SIZE = 1000;
        const total = data.length;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            const now = moment().format('YYYY-MM-DD HH:mm:ss');  // 格式化 DATETIME

            // 给每行添加 id, operator, create_time
            batch.forEach(row => {
                row.id = uuidv4();
                row.operator = operator;
                row.create_time = now;
            });

            const allColumns = [...columns, "id", "operator", "create_time"];
            const placeholders = batch.map(() => `(${allColumns.map(() => "?").join(",")})`).join(",");
            const values = batch.map(row => allColumns.map(c => row[c] || null)).flat();

            sql = `INSERT INTO \`${tableName}\` (${allColumns.map(c => `\`${c}\``).join(",")}) VALUES ${placeholders}`;
            await pools({ sql, val: values, res, req });

            console.log(`导入进度: ${Math.floor(((i + batch.length) / total) * 100)}%`);
        }

        res.send(utils.returnData({ code: 200, msg: "导入成功", data: {} }));
    } catch (err) {
        console.error(err);
        res.send(utils.returnData({ code: -1, msg: "服务器异常", data: {}, err }));
    }
});

// ---------------------------------------------------------------------------------出纳开始----------------------------------------------


// /** 新增现金记录 */
router.post('/addCashRecord', async (req, res) => {
    const obj = req.body;
    let insertedCount = 0;
    
    try {
        // 判断是单条插入还是批量插入
        if (Array.isArray(obj.data)) {
            // 批量插入处理
            // 按公司和银行分组
            const groupedData = {};
            obj.data.forEach(item => {
                const key = `${item.company}-${item.bank}`;
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(item);
            });
            
            // 处理每组数据
            for (const key in groupedData) {
                const group = groupedData[key];
                const [company, bank] = key.split('-');
                
                // 获取当前最大 seq
                const maxSeqResult = await pools({
                    sql: `SELECT MAX(seq) AS maxSeq FROM pt_cw_zjmxb WHERE company=? AND bank=?`,
                    val: [company, bank],
                    res, req
                });
                let currentSeq = (maxSeqResult.result[0]?.maxSeq || 0);
                
                // 批量插入SQL
                let insertSql = `INSERT INTO pt_cw_zjmxb
                      (id, seq, date, company, bank, summary, income, expense, balance, remark, invoice, created_by)
                      VALUES `;
                const values = [];
                
                // 准备批量插入数据
                group.forEach(item => {
                    currentSeq++;
                    const id = uuidv4();
                    const dateTimeStr = item.date ? dayjs(item.date).format('YYYY-MM-DD HH:mm:ss') : null;
                    
                    if (values.length > 0) {
                        insertSql += ',';
                    }
                    insertSql += '(?,?,?,?,?,?,?,?,?,?,?,?)';
                    
                    values.push(
                        id, currentSeq, dateTimeStr, item.company, item.bank, item.summary,
                        item.income || 0, item.expense || 0, 0,
                        item.remark, item.invoice, obj.username
                    );
                });
                
                // 执行批量插入
                await pools({
                    sql: insertSql,
                    val: values,
                    res, req
                });
                
                insertedCount += group.length;
                
                // 重新计算该公司和银行的余额
                await recalcBalances(company, bank, res, req);
            }
            
            res.send(utils.returnData({ msg: `批量新增成功，共${insertedCount}条记录` }));
        } else {
            // 单条插入处理（原有逻辑）
            const id = uuidv4();
            const dateTimeStr = obj.data.date ? dayjs(obj.data.date).format('YYYY-MM-DD HH:mm:ss') : null;

            // 获取当前最大 seq
            const maxSeqResult = await pools({
                sql: `SELECT MAX(seq) AS maxSeq FROM pt_cw_zjmxb WHERE company=? AND bank=?`,
                val: [obj.data.company, obj.data.bank],
                res, req
            });
            const seq = (maxSeqResult.result[0]?.maxSeq || 0) + 1;

            // 插入新纪录（余额暂时置 0，后面统一更新）
            await pools({
                sql: `INSERT INTO pt_cw_zjmxb
                      (id, seq, date, company, bank, summary, income, expense, balance, remark, invoice, created_by)
                      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                val: [
                    id, seq, dateTimeStr, obj.data.company, obj.data.bank, obj.data.summary,
                    obj.data.income || 0, obj.data.expense || 0, 0,
                    obj.data.remark, obj.data.invoice, obj.username
                ],
                res, req
            });

            // 重新计算余额
            await recalcBalances(obj.data.company, obj.data.bank, res, req);

            res.send(utils.returnData({ msg: '新增成功' }));
        }
    } catch (error) {
        console.error('插入现金记录失败:', error);
        res.send(utils.returnData({ 
            code: 500, 
            msg: insertedCount > 0 ? 
                `部分插入成功（${insertedCount}条），部分失败，请检查数据` : 
                '插入失败，请检查数据' 
        }));
    }
});

/** 删除现金记录 */
router.post('/deleteCashRecord', async (req, res) => {
    const obj = req.body;

    const recordRes = await pools({
        sql: `SELECT company, bank FROM pt_cw_zjmxb WHERE id=?`,
        val: [obj.data.id],
        res, req
    });
    if (!recordRes.result.length) {
        return res.send(utils.returnData({ code: 500, msg: '记录不存在' }));
    }
    const { company, bank } = recordRes.result[0];

    // 删除记录
    await pools({ sql: `DELETE FROM pt_cw_zjmxb WHERE id=?`, val: [obj.data.id], res, req });

    await pools({
        sql: `UPDATE pt_cw_zjmxb c
          JOIN (
              SELECT id, @rownum := @rownum + 1 AS new_seq
              FROM pt_cw_zjmxb, (SELECT @rownum := 0) r
              WHERE company=? AND bank=?
              ORDER BY date ASC, id ASC
          ) t ON c.id = t.id
          SET c.seq = t.new_seq`,
        val: [company, bank],
        res, req
    });

    // 重新计算余额
    await recalcBalances(company, bank, res, req);

    res.send(utils.returnData({ msg: '删除成功' }));
});

/** 修改现金记录 */
router.post('/updateCashRecord', async (req, res) => {
    console.log("updateCashRecord",req.body)
    const obj = req.body;
    const dateTimeStr = obj.data.date ? dayjs(obj.data.date).format('YYYY-MM-DD HH:mm:ss') : null;

    // 更新记录
    await pools({
        sql: `UPDATE pt_cw_zjmxb 
              SET 日期=?, 公司=?, 银行=?, 摘要=?, 收入=?, 支出=?, 备注=?, 发票=? 
              WHERE id=?`,
        val: [
            dateTimeStr, obj.data.company, obj.data.bank, obj.data.summary,
            obj.data.income || 0, obj.data.expense || 0,
            obj.data.remark, obj.data.invoice, obj.data.id
        ],
        res, req
    });

    // 重新计算余额
    await recalcBalances(obj.data.company, obj.data.bank, res, req);

    res.send(utils.returnData({ msg: '修改成功' }));
});

/** 查询现金记录 */
router.post('/getCashRecords', async (req, res) => {
    console.log("getCashRecords",req.body)  
    const obj = req.body;

    // 修复：缺少 WHERE 导致 AND 拼接到 FROM 后产生语法错误
    let sql = `SELECT id, 序号 AS seq,LEFT(日期, 10) AS date, 公司 AS company, 银行 AS bank, 摘要 AS summary, 收入 AS income, 支出 AS expense, 余额 AS balance, 备注 AS remark, 发票 AS invoice, user_id AS createdBy, created_at AS createdAt
               FROM pt_cw_zjmxb WHERE 1=1`;
    sql = utils.setLike(sql, '公司', obj.company);
    sql = utils.setLike(sql, '银行', obj.bank);
    sql = utils.setLike(sql, '摘要', obj.summary);
    // 支持按“系列”筛选
    sql = utils.setLike(sql, '系列', obj.series);
    if (obj.dateFrom) sql += ` AND 日期 >= '${dayjs(obj.dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (obj.dateTo) sql += ` AND 日期 <= '${dayjs(obj.dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;

    let { total } = await utils.getSum({ sql, name: 'pt_cw_zjmxb', res, req });
    // sql += ' ORDER BY 序号 DESC';
    sql = utils.pageSize(sql, obj.page, obj.size);

    const { result } = await pools({ sql, res, req });
    res.send(utils.returnData({ data: result, total }));
});

/** 公共函数：重新计算余额 - 优化版本 */
async function recalcBalances(company, bank, res, req) {
    try {
        // 1. 首先获取所有记录
        const recordsRes = await pools({
            sql: `SELECT id, 收入 AS income, 支出 AS expense FROM pt_cw_zjmxb 
                  WHERE 公司=? AND 银行=? ORDER BY 序号 ASC`,
            val: [company, bank],
            res, req
        });

        if (!recordsRes.result || recordsRes.result.length === 0) {
            return; // 没有记录需要更新，直接返回
        }

        // 2. 计算所有记录的新余额
        let balance = 0;
        const updateValues = [];
        
        for (let r of recordsRes.result) {
            balance = balance + Number(r.income || 0) - Number(r.expense || 0);
            updateValues.push([balance, r.id]);
        }

        // 3. 使用批量更新而不是单条更新，减少数据库连接使用
        // MySQL批量更新语法
        let sql = "INSERT INTO pt_cw_zjmxb (余额, id) VALUES";
        const placeholders = [];
        const values = [];
        
        updateValues.forEach(([bal, id], index) => {
            if (index > 0) sql += ",";
            sql += " (?, ?)";
            values.push(bal, id);
        });
        
        sql += " ON DUPLICATE KEY UPDATE 余额 = VALUES(余额)";
        
        await pools({
            sql: sql,
            val: values,
            res, req
        });
        
    } catch (error) {
        console.error("重新计算余额失败:", error);
        // 发生错误时仍然继续，让调用者处理响应
        throw error;
    }
}




/** 汇总 */
router.post('/getCashSummary', async (req, res) => {
    const obj = req.body;

    // 先查询每条明细
    let sql = `SELECT 序号 AS seq,LEFT(日期, 10) AS date, 公司 AS company, 银行 AS bank, 收入 AS income, 支出 AS expense FROM pt_cw_zjmxb WHERE 1=1`;
    sql = utils.setLike(sql, '公司', obj.data.company);
    sql = utils.setLike(sql, '银行', obj.data.bank);
    if (obj.data.dateFrom) sql += ` AND 日期 >= '${dayjs(obj.data.dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (obj.data.dateTo) sql += ` AND 日期 <= '${dayjs(obj.data.dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;
    sql += ` ORDER BY 公司, 银行, 序号 ASC`;

    const { result } = await pools({ sql, res, req });

    // 按公司+银行分组累加余额
    const summaryMap = {};
    for (const r of result) {
        const key = `${r.company}||${r.bank}`;
        if (!summaryMap[key]) {
            summaryMap[key] = { company: r.company, bank: r.bank, totalIncome: 0, totalExpense: 0, balance: 0 };
        }
        summaryMap[key].totalIncome += parseFloat(r.income || 0);
        summaryMap[key].totalExpense += parseFloat(r.expense || 0);
        summaryMap[key].balance += parseFloat(r.income || 0) - parseFloat(r.expense || 0);
    }

    // 保留两位小数
    const summary = Object.values(summaryMap).map(item => ({
        ...item,
        totalIncome: Number(item.totalIncome.toFixed(2)),
        totalExpense: Number(item.totalExpense.toFixed(2)),
        balance: Number(item.balance.toFixed(2))
    }));

    res.send(utils.returnData({ data: summary }));
});

/** 资金驾驶舱总览 */
router.post('/dashboard/cashOverview', async (req, res) => {
  try {
    const payload = (req.body && req.body.data) ? req.body.data : req.body || {};

    const dateFrom = payload.dateFrom ? dayjs(payload.dateFrom).format('YYYY-MM-DD HH:mm:ss') : null;
    const dateTo = payload.dateTo ? dayjs(payload.dateTo).format('YYYY-MM-DD HH:mm:ss') : null;
    const company = payload.company ? String(payload.company).trim() : '';
    const bank = payload.bank ? String(payload.bank).trim() : '';
    const series = payload.series ? String(payload.series).trim() : '';
    const today = dayjs().format('YYYY-MM-DD');

    // 可选参数：阈值与分析配置
    let runwayThresholdDays = Number(payload.runwayThresholdDays ?? 30);
    let anomalyZ = Number(payload.anomalyZ ?? 2);
    let concentrationTopN = Number(payload.concentrationTopN ?? 3);
    let concentrationThresholdPct = Number(payload.concentrationThresholdPct ?? 0.7);
    // 合理边界
    if (!Number.isFinite(runwayThresholdDays) || runwayThresholdDays <= 0) runwayThresholdDays = 30;
    if (!Number.isFinite(anomalyZ) || anomalyZ <= 0) anomalyZ = 2;
    if (!Number.isFinite(concentrationTopN) || concentrationTopN <= 0) concentrationTopN = 3;
    if (!Number.isFinite(concentrationThresholdPct) || concentrationThresholdPct <= 0 || concentrationThresholdPct >= 1) concentrationThresholdPct = 0.7;

    // 公共Where子句（全量，不按用户过滤）
    let whereBase = ` WHERE 1=1 `;
    if (dateFrom) whereBase += ` AND 日期 >= '${dateFrom}'`;
    if (dateTo) whereBase += ` AND 日期 <= '${dateTo}'`;
    if (company) whereBase += ` AND 公司 = '${company}'`;
    if (bank) whereBase += ` AND 银行 = '${bank}'`;
    if (series) whereBase += ` AND 系列 = '${series}'`;

    // 1) 每个公司可用资金（收入-支出）
    let sqlCompany = `SELECT 公司 AS company, ROUND(SUM(收入),2) AS totalIncome, ROUND(SUM(支出),2) AS totalExpense, ROUND(SUM(收入) - SUM(支出),2) AS balance
                      FROM pt_cw_zjmxb ${whereBase}
                      GROUP BY 公司
                      ORDER BY balance DESC`;
    const companyRes = await pools({ sql: sqlCompany, res, req });

    // 2) 每家银行资金余额（收入-支出）
    let sqlBank = `SELECT 银行 AS bank, ROUND(SUM(收入),2) AS totalIncome, ROUND(SUM(支出),2) AS totalExpense, ROUND(SUM(收入) - SUM(支出),2) AS balance
                   FROM pt_cw_zjmxb ${whereBase}
                   GROUP BY 银行
                   ORDER BY balance DESC`;
    const bankRes = await pools({ sql: sqlBank, res, req });

    // 3) 每天收入支出（按天聚合）
    let sqlDaily = `SELECT LEFT(日期,10) AS date, ROUND(SUM(收入),2) AS income, ROUND(SUM(支出),2) AS expense, ROUND(SUM(收入) - SUM(支出),2) AS net
                    FROM pt_cw_zjmxb ${whereBase}
                    GROUP BY LEFT(日期,10)
                    ORDER BY date ASC`;
    const dailyRes = await pools({ sql: sqlDaily, res, req });

    // 3.1) 每日实时余额（按公司+银行当日最后一条记录的余额求和）
    // 使用子查询选出每个公司/银行在当日的最大序号记录，再汇总余额
    let sqlDailyBalance = `
      SELECT s.date, ROUND(SUM(s.balance), 2) AS balance
      FROM (
        SELECT LEFT(t.日期,10) AS date, t.公司 AS company, t.银行 AS bank, t.余额 AS balance
        FROM pt_cw_zjmxb t
        JOIN (
          SELECT 公司, 银行, LEFT(日期,10) AS d, MAX(序号) AS maxSeq
          FROM pt_cw_zjmxb ${whereBase}
          GROUP BY 公司, 银行, LEFT(日期,10)
        ) m ON t.公司 = m.公司 AND t.银行 = m.银行 AND LEFT(t.日期,10) = m.d AND t.序号 = m.maxSeq
      ) s
      GROUP BY s.date
      ORDER BY s.date ASC`;
    const dailyBalanceRes = await pools({ sql: sqlDailyBalance, res, req });

    // 4) 当日收付情况（汇总）
    let todayWhere = ` WHERE LEFT(日期,10) = '${today}'`;
    if (company) todayWhere += ` AND 公司 LIKE '%${company}%'`;
    if (bank) todayWhere += ` AND 银行 LIKE '%${bank}%'`;
    if (series) todayWhere += ` AND 系列 LIKE '%${series}%'`;
    let sqlTodaySum = `SELECT ROUND(SUM(收入),2) AS income, ROUND(SUM(支出),2) AS expense, ROUND(SUM(收入) - SUM(支出),2) AS net
                       FROM pt_cw_zjmxb ${todayWhere}`;
    const todaySumRes = await pools({ sql: sqlTodaySum, res, req });

    // 5) 当日收付明细
    let sqlTodayDetails = `SELECT id, LEFT(日期, 19) AS date, 公司 AS company, 银行 AS bank, 摘要 AS summary, 收入 AS income, 支出 AS expense, 余额 AS balance, 备注 AS remark, 发票 AS invoice
                           FROM pt_cw_zjmxb ${todayWhere}
                           ORDER BY 日期 ASC, id ASC LIMIT 500`;
    const todayDetailsRes = await pools({ sql: sqlTodayDetails, res, req });

    // 6) Top摘要频次（额外分析）
    let sqlTopSummary = `SELECT 摘要 AS summary, COUNT(*) AS count, ROUND(SUM(收入),2) AS totalIncome, ROUND(SUM(支出),2) AS totalExpense, ROUND(SUM(收入) - SUM(支出),2) AS net
                         FROM pt_cw_zjmxb ${whereBase}
                         GROUP BY 摘要
                         ORDER BY count DESC
                         LIMIT 10`;
    const topSummaryRes = await pools({ sql: sqlTopSummary, res, req });

    // ---------------- 额外分析：现金跑道、账户集中度、异常波动 ----------------
    const bankList = bankRes.result || [];
    const totalBalance = bankList.reduce((s, b) => s + Number(b.balance || 0), 0);
    const sortedBank = [...bankList].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    const topBanksRaw = sortedBank.slice(0, concentrationTopN).map(b => ({ bank: b.bank, balance: Number(b.balance || 0) }));
    const topBalance = topBanksRaw.reduce((s, b) => s + b.balance, 0);
    const concentrationRatio = totalBalance > 0 ? Number((topBalance / totalBalance).toFixed(4)) : 0;
    const topBanks = topBanksRaw.map(tb => ({ ...tb, ratio: totalBalance > 0 ? Number((tb.balance / totalBalance).toFixed(4)) : 0 }));

    const dailyList = dailyRes.result || [];
    const balanceList = dailyBalanceRes.result || [];
    const balanceMap = new Map(balanceList.map(b => [b.date, Number(b.balance || 0)]));
    const mergedDaily = dailyList.map(d => ({ ...d, balance: balanceMap.get(d.date) ?? null }));
    const last30 = dailyList.slice(Math.max(0, dailyList.length - 30));
    const avgExpense30 = last30.length ? last30.reduce((s, d) => s + Number(d.expense || 0), 0) / last30.length : 0;
    const runwayDays = avgExpense30 > 0 ? Number((totalBalance / avgExpense30).toFixed(2)) : null;

    const last30Net = last30.map(d => Number(d.net || 0));
    const meanNet = last30Net.length ? last30Net.reduce((s, v) => s + v, 0) / last30Net.length : 0;
    const stdNet = last30Net.length ? Math.sqrt(last30Net.reduce((s, v) => s + Math.pow(v - meanNet, 2), 0) / last30Net.length) : 0;
    const anomalies = last30.filter(d => {
      const netVal = Number(d.net || 0);
      const z = stdNet > 0 ? Math.abs((netVal - meanNet) / stdNet) : 0;
      return z >= anomalyZ;
    }).map(d => ({
      date: d.date,
      net: Number(d.net || 0),
      zScore: stdNet > 0 ? Number(((Number(d.net || 0) - meanNet) / stdNet).toFixed(2)) : 0
    })).slice(0, 20);

    res.send(utils.returnData({
      data: {
        companyFunds: companyRes.result || [],
        bankBalances: bankRes.result || [],
        dailyTrend: mergedDaily || [],
        todaySummary: (todaySumRes.result && todaySumRes.result[0]) ? todaySumRes.result[0] : { income: 0, expense: 0, net: 0 },
        todayDetails: todayDetailsRes.result || [],
        topSummaries: topSummaryRes.result || [],
        analytics: {
          runwayDays,
          runwayThresholdDays,
          runwayWarning: runwayDays !== null && runwayDays < runwayThresholdDays,
          concentrationTopN,
          concentrationRatio,
          concentrationThresholdPct,
          concentrationWarning: concentrationRatio > concentrationThresholdPct,
          topBanks,
          anomalies
        }
      }
    }));
  } catch (error) {
    console.error('dashboard/cashOverview error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

// pt_cw_zjmxb


/** 获取公司列表 */
router.post('/getCompanyList', async (req, res) => {
  try {
    console.log('getCompanyList', req.body);
    let sql = `SELECT DISTINCT 公司 AS company FROM pt_cw_zjmxb WHERE 公司 IS NOT NULL AND 公司 <> ''`;
    const params = [];
    const body = req.body || {};
    const seriesRaw = body.series;
    const series = seriesRaw ? String(seriesRaw).trim() : '';
    if (series) {
      sql += ` AND 系列 = ?`;
      params.push(series);
    }
    sql += ` ORDER BY 公司`;
    const { result } = await pools({ sql, val: params, res, req });
    const data = (result || []).map(r => r.company);
    res.send(utils.returnData({ data }));
  } catch (err) {
    utils.err(err, res);
  }
});

/** 获取银行列表 */
router.post('/getBankList', async (req, res) => {
    const sql = `SELECT DISTINCT 银行 AS bank FROM pt_cw_zjmxb ORDER BY 银行`;
    const { result } = await pools({ sql, res, req });
    const data = result.map(r => r.bank);
    res.send(utils.returnData({ data }));
});

/** 获取系列列表（从数据库去重） */
router.post('/getSeriesList', async (req, res) => {
    const sql = `SELECT DISTINCT 系列 AS series FROM pt_cw_zjmxb WHERE 系列 IS NOT NULL AND 系列 <> '' ORDER BY 系列`;
    const { result } = await pools({ sql, res, req });
    const data = (result || []).map(r => r.series);
    res.send(utils.returnData({ data }));
});

router.post('/getCashSummaryList', async (req, res) => {
  console.log('getCashSummaryList', req.body);
  try {
    const payload = (req.body && req.body.data) ? req.body.data : req.body;
    let { company, bank, summary } = payload || {};

    company = company ? String(company).trim() : '';
    bank = bank ? String(bank).trim() : '';
    summary = summary ? String(summary).trim() : '';

    let sql = `SELECT DISTINCT 摘要 AS summary 
               FROM pt_cw_zjmxb 
               WHERE 摘要 IS NOT NULL AND 摘要 <> ''`;
    const params = [];

    if (company) {
      sql += ` AND 公司 = ?`;
      params.push(company);
    }

    if (bank) {
      sql += ` AND 银行 = ?`;
      params.push(bank);
    }

    if (summary) {
      sql += ` AND 摘要 LIKE ?`;
      params.push(`%${summary}%`);
    }

    sql += ` LIMIT 100`; // 排序并限制 100 条

    // console.log('SQL:', sql, 'params:', params);

    // ⚠️ pools 返回结果统一处理成 rows
   const rows = await pools({ sql, val: params, res, req });
    const summaries = (rows?.result || []).map(r => r.summary || '');

    res.send(utils.returnData({ data: summaries }));
    console.log('获取历史摘要成功, count=', summaries.length);
  } catch (err) {
     console.error('获取历史摘要失败', err);
    res.send(utils.returnData({
        code: 500,
        msg: '获取历史摘要失败',
        err
    }));
  }
});




// ---------------------------------------------------------------------------------出纳结束----------------------------------------------

// ==================== 标签维护(pt_biaoqian) ====================

/** 新增标签 */
router.post('/biaoqian/add', async (req, res) => {
  try {
    const payload = (req.body && req.body.data) ? req.body.data : req.body || {};
    const rolesId = payload.roles_id ?? payload.rolesId ?? '';
    const parent = payload['大类'] ?? payload.parent ?? '';
    const child = payload['子类'] ?? payload.child ?? '';
    const remark = payload['备注'] ?? payload.remark ?? '';
    const id = uuidv4();

    if (!String(parent).trim() || !String(child).trim()) {
      return res.send(utils.returnData({ code: -1, msg: '大类/子类不能为空', req }));
    }

    // 重复校验：同 roles_id + 大类 + 子类 不允许重复
    const dupSql = `SELECT id FROM pt_biaoqian WHERE 1=1`;
    let checkSql = dupSql;
    const params = [];
    if (rolesId !== '') { checkSql += ` AND roles_id = ?`; params.push(rolesId); }
    checkSql += ` AND 大类 = ? AND 子类 = ?`;
    params.push(String(parent).trim(), String(child).trim());
    const dup = await pools({ sql: checkSql, val: params, res, req });
    if (dup.result && dup.result.length) {
      return res.send(utils.returnData({ code: -1, msg: '该标签已存在', req }));
    }

    const insertSql = `INSERT INTO pt_biaoqian (id, roles_id, 大类, 子类, 备注) VALUES (?,?,?,?,?)`;
    const insertVal = [id, rolesId || null, String(parent).trim(), String(child).trim(), remark || null];
    await pools({ sql: insertSql, val: insertVal, res, req });
    res.send(utils.returnData({ msg: '新增成功' }));
  } catch (error) {
    console.error('biaoqian/add error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

/** 查询标签列表（支持分页、模糊查询） */
router.post('/biaoqian/get', async (req, res) => {
  try {
    const obj = (req.body && req.body.data) ? req.body.data : req.body || {};
    let sql = `SELECT id, roles_id AS rolesId, 大类 AS parent, 子类 AS child, 备注 AS remark FROM pt_biaoqian WHERE 1=1`;

    // 根据登录用户权限控制数据范围：rolesId 为 1/2/3 查看全部，否则仅查看自己绑定 moreId（匹配 pt_biaoqian.roles_id）
    const user = await utils.getUserRole(req, res);
    const rolesId = user?.user?.rolesId;
    const moreId = user?.user?.moreId;
    console.log(user.user)
    const isSuper = [1, 2, 3].includes(Number(rolesId));
    if (!isSuper && moreId !== undefined && moreId !== null) {
      sql = utils.setAssign(sql, 'roles_id', moreId);
    } else {
      // 超管可选按传入的 roles_id 过滤
      if (obj.roles_id !== undefined) sql = utils.setAssign(sql, 'roles_id', obj.roles_id);
    }

    // 过滤条件
    sql = utils.setLike(sql, '大类', obj.parent ?? obj['大类']);
    sql = utils.setLike(sql, '子类', obj.child ?? obj['子类']);
    sql = utils.setLike(sql, '备注', obj.remark ?? obj['备注']);

    // 统计总数
    const { total } = await utils.getSum({ sql, name: 'pt_biaoqian', res, req });
    // 排序 + 分页
    sql += ` ORDER BY id DESC`;
    sql = utils.pageSize(sql, obj.page, obj.size);
    const { result } = await pools({ sql, res, req });
    res.send(utils.returnData({ data: result, total }));
  } catch (error) {
    console.error('biaoqian/get error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

/** 更新标签 */
router.post('/biaoqian/up', async (req, res) => {
  try {
    const payload = (req.body && req.body.data) ? req.body.data : req.body || {};
    const id = payload.id;
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少 id', req }));

    const rolesId = payload.roles_id ?? payload.rolesId ?? '';
    const parent = payload['大类'] ?? payload.parent ?? '';
    const child = payload['子类'] ?? payload.child ?? '';
    const remark = payload['备注'] ?? payload.remark ?? '';

    const upSql = `UPDATE pt_biaoqian SET roles_id = ?, 大类 = ?, 子类 = ?, 备注 = ? WHERE id = ?`;
    const upVal = [rolesId || null, String(parent).trim(), String(child).trim(), remark || null, id];
    await pools({ sql: upSql, val: upVal, res, req });
    res.send(utils.returnData({ msg: '修改成功' }));
  } catch (error) {
    console.error('biaoqian/up error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

/** 删除标签 */
router.post('/biaoqian/del', async (req, res) => {
  try {
    const payload = (req.body && req.body.data) ? req.body.data : req.body || {};
    const id = payload.id;
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少 id', req }));

    const delSql = `DELETE FROM pt_biaoqian WHERE id = ?`;
    await pools({ sql: delSql, val: [id], res, req });
    res.send(utils.returnData({ msg: '删除成功' }));
  } catch (error) {
    console.error('biaoqian/del error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

/** 获取当前登录公司标签（按用户 roles_id 限制） */
router.post('/biaoqian/tagsByUser', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return; // 已在内部返回错误
    // 先判断 roles_id 是否包含 1/2/3（超管）；否则根据 roles_id（可能多值）筛选
    const rolesStr = String(user.rolesId || '').trim();
    const rolesArr = rolesStr ? rolesStr.split(',').map(v => Number(v)).filter(v => !Number.isNaN(v)) : [];
    const showAll = rolesArr.some(v => [1, 2, 3].includes(v));
    const sql = showAll
      ? `SELECT DISTINCT 子类 AS tag FROM pt_biaoqian ORDER BY 子类 ASC`
      : `SELECT DISTINCT 子类 AS tag FROM pt_biaoqian WHERE FIND_IN_SET(roles_id, ?) ORDER BY 子类 ASC`;
    const { result } = showAll
      ? await pools({ sql, res, req })
      : await pools({ sql, val: [user.moreId], res, req });
    const tags = (result || []).map(r => r.tag).filter(t => t !== null && t !== undefined && String(t).trim() !== '');
    res.send(utils.returnData({ data: tags }));
  } catch (error) {
    console.error('biaoqian/tagsByUser error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});


// ==================== 数据库管理系统(ty-dbwh)相关 API ====================

/**
 * 数据表结构定义：
 * ty_dbwh_data - 数据库管理系统数据表
 *   id - 主键ID
 *   user_id - 创建用户ID
 *   table_name - 表名
 *   table_desc - 表描述
 *   columns_config - 列配置(JSON格式)
 *   status - 状态(0禁用/1启用)
 *   create_time - 创建时间
 *   update_time - 更新时间
 */

/**
 * 确保数据表存在
 * @param {String} tableName 表名
 * @param {String} createTableSql 创建表SQL
 */
async function ensureDbwhTableExists(tableName, createTableSql) {
  try {
    // 检查表是否存在
    const checkSql = `SHOW TABLES LIKE '${tableName}'`;
    const checkResult = await pools({ sql: checkSql, run: true });
    
    // 如果表不存在，则创建
    if (checkResult.result.length === 0) {
      await pools({ sql: createTableSql, run: true });
      console.log(`创建表 ${tableName} 成功`);
    }
  } catch (error) {
    console.error(`确保表 ${tableName} 存在时出错:`, error);
    throw error;
  }
}

// 确保数据库管理系统表存在
(async () => {
  try {
    await ensureDbwhTableExists('ty_dbwh_data', `
      CREATE TABLE ty_dbwh_data (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT '创建用户ID',
        table_name VARCHAR(100) NOT NULL COMMENT '表名',
        table_desc VARCHAR(200) COMMENT '表描述',
        columns_config TEXT COMMENT '列配置(JSON格式)',
        status TINYINT DEFAULT 1 COMMENT '状态(0禁用/1启用)',
        create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        UNIQUE KEY uk_user_table (user_id, table_name)
      ) COMMENT='数据库管理系统数据表'
    `);
  } catch (error) {
    console.error('初始化数据库表时出错:', error);
  }
})();

/**
 * 获取数据库表列表
 * @api {post} /ty-dbwh/data/list
 * @return {Array} 表列表
 */
router.post('/ty-dbwh/data/list', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const obj = req.body || {};
    let sql = `SELECT id, table_name AS tableName, table_desc AS tableDesc, status, 
               DATE_FORMAT(create_time, '%Y-%m-%d %H:%i:%s') AS createTime, 
               DATE_FORMAT(update_time, '%Y-%m-%d %H:%i:%s') AS updateTime 
               FROM ty_dbwh_data WHERE user_id = ?`;
    
    // 搜索条件
    sql = utils.setLike(sql, 'table_name', obj.tableName);
    sql = utils.setLike(sql, 'table_desc', obj.tableDesc);
    if (obj.status !== undefined) {
      sql = utils.setAssign(sql, 'status', obj.status);
    }
    
    // 获取总数
    const { total } = await utils.getSum({ sql, name: 'ty_dbwh_data', res, req });
    
    // 排序和分页
    sql += ` ORDER BY update_time DESC`;
    sql = utils.pageSize(sql, obj.page, obj.size);
    
    const { result } = await pools({ sql, val: [user.id], res, req });
    res.send(utils.returnData({ data: result, total }));
  } catch (error) {
    console.error('获取数据库表列表失败:', error);
    res.send(utils.returnData({ code: -1, msg: '获取列表失败', req }));
  }
});

/**
 * 获取数据库表详情
 * @api {post} /ty-dbwh/data/detail
 * @return {Object} 表详情
 */
router.post('/ty-dbwh/data/detail', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const { id } = req.body;
    if (!id) return res.send(utils.returnData({ code: -1, msg: '参数错误', req }));
    
    const sql = `SELECT id, table_name AS tableName, table_desc AS tableDesc, 
               columns_config AS columnsConfig, status 
               FROM ty_dbwh_data WHERE id = ? AND user_id = ?`;
    
    const { result } = await pools({ sql, val: [id, user.id], res, req });
    if (result.length === 0) {
      return res.send(utils.returnData({ code: -1, msg: '记录不存在', req }));
    }
    
    // 解析JSON字符串为对象
    const data = result[0];
    if (data.columnsConfig) {
      data.columnsConfig = JSON.parse(data.columnsConfig);
    }
    
    res.send(utils.returnData({ data }));
  } catch (error) {
    console.error('获取数据库表详情失败:', error);
    res.send(utils.returnData({ code: -1, msg: '获取详情失败', req }));
  }
});

/**
 * 添加数据库表
 * @api {post} /ty-dbwh/data/add
 */
router.post('/ty-dbwh/data/add', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const obj = req.body;
    if (!obj.tableName) return res.send(utils.returnData({ code: -1, msg: '表名不能为空', req }));
    
    // 检查表名是否已存在
    const checkSql = `SELECT id FROM ty_dbwh_data WHERE table_name = ? AND user_id = ?`;
    const checkResult = await pools({ sql: checkSql, val: [obj.tableName, user.id], run: true });
    if (checkResult.result.length > 0) {
      return res.send(utils.returnData({ code: -1, msg: '表名已存在', req }));
    }
    
    // 保存列配置为JSON字符串
    const columnsConfig = obj.columnsConfig ? JSON.stringify(obj.columnsConfig) : '[]';
    
    const sql = `INSERT INTO ty_dbwh_data(user_id, table_name, table_desc, columns_config, status) 
               VALUES(?, ?, ?, ?, ?)`;
    
    await pools({ 
      sql, 
      val: [user.id, obj.tableName, obj.tableDesc || '', columnsConfig, obj.status || 1], 
      res, 
      req, 
      run: false 
    });
    
    res.send(utils.returnData({ msg: '添加成功' }));
  } catch (error) {
    console.error('添加数据库表失败:', error);
    res.send(utils.returnData({ code: -1, msg: '添加失败', req }));
  }
});

/**
 * 修改数据库表
 * @api {post} /ty-dbwh/data/update
 */
router.post('/ty-dbwh/data/update', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const obj = req.body;
    if (!obj.id) return res.send(utils.returnData({ code: -1, msg: '参数错误', req }));
    
    // 检查记录是否存在且属于当前用户
    const checkSql = `SELECT id FROM ty_dbwh_data WHERE id = ? AND user_id = ?`;
    const checkResult = await pools({ sql: checkSql, val: [obj.id, user.id], run: true });
    if (checkResult.result.length === 0) {
      return res.send(utils.returnData({ code: -1, msg: '记录不存在', req }));
    }
    
    // 如果修改表名，检查新表名是否已存在
    if (obj.tableName) {
      const nameCheckSql = `SELECT id FROM ty_dbwh_data WHERE table_name = ? AND user_id = ? AND id != ?`;
      const nameCheckResult = await pools({ sql: nameCheckSql, val: [obj.tableName, user.id, obj.id], run: true });
      if (nameCheckResult.result.length > 0) {
        return res.send(utils.returnData({ code: -1, msg: '表名已存在', req }));
      }
    }
    
    // 构建更新SQL
    const updateFields = [];
    const updateValues = [];
    
    if (obj.tableName !== undefined) updateFields.push('table_name = ?'), updateValues.push(obj.tableName);
    if (obj.tableDesc !== undefined) updateFields.push('table_desc = ?'), updateValues.push(obj.tableDesc);
    if (obj.columnsConfig !== undefined) {
      updateFields.push('columns_config = ?');
      updateValues.push(JSON.stringify(obj.columnsConfig));
    }
    if (obj.status !== undefined) updateFields.push('status = ?'), updateValues.push(obj.status);
    
    if (updateFields.length === 0) {
      return res.send(utils.returnData({ msg: '没有需要更新的字段' }));
    }
    
    updateValues.push(obj.id, user.id);
    const sql = `UPDATE ty_dbwh_data SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`;
    
    await pools({ sql, val: updateValues, res, req, run: false });
    res.send(utils.returnData({ msg: '更新成功' }));
  } catch (error) {
    console.error('修改数据库表失败:', error);
    res.send(utils.returnData({ code: -1, msg: '更新失败', req }));
  }
});

/**
 * 删除数据库表
 * @api {post} /ty-dbwh/data/delete
 */
router.post('/ty-dbwh/data/delete', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const { id } = req.body;
    if (!id) return res.send(utils.returnData({ code: -1, msg: '参数错误', req }));
    
    // 检查记录是否存在且属于当前用户
    const checkSql = `SELECT id FROM ty_dbwh_data WHERE id = ? AND user_id = ?`;
    const checkResult = await pools({ sql: checkSql, val: [id, user.id], run: true });
    if (checkResult.result.length === 0) {
      return res.send(utils.returnData({ code: -1, msg: '记录不存在', req }));
    }
    
    const sql = `DELETE FROM ty_dbwh_data WHERE id = ? AND user_id = ?`;
    await pools({ sql, val: [id, user.id], res, req, run: false });
    res.send(utils.returnData({ msg: '删除成功' }));
  } catch (error) {
    console.error('删除数据库表失败:', error);
    res.send(utils.returnData({ code: -1, msg: '删除失败', req }));
  }
});

/**
 * 切换数据库表状态
 * @api {post} /ty-dbwh/data/changeStatus
 */
router.post('/ty-dbwh/data/changeStatus', async (req, res) => {
  try {
    const user = await utils.getUserInfo({ req, res });
    if (!user) return res.send(utils.returnData({ code: -1, msg: '用户未登录', req }));
    
    const { id, status } = req.body;
    if (id === undefined || status === undefined) {
      return res.send(utils.returnData({ code: -1, msg: '参数错误', req }));
    }
    
    const sql = `UPDATE ty_dbwh_data SET status = ? WHERE id = ? AND user_id = ?`;
    const { result } = await pools({ sql, val: [status, id, user.id], run: true });
    
    if (result.affectedRows === 0) {
      return res.send(utils.returnData({ code: -1, msg: '记录不存在或无权限操作', req }));
    }
    
    res.send(utils.returnData({ msg: '状态更新成功' }));
  } catch (error) {
    console.error('切换数据库表状态失败:', error);
    res.send(utils.returnData({ code: -1, msg: '操作失败', req }));
  }
});

/**
 * 📥 导入 Excel 数据写入数据库
 */
router.post("/importExcelData", async (req, res) => {
  console.log("📥 importExcelData");

  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    const userName = user.user.name; // 录入人

    const { tableName, data } = req.body;
    if (!tableName || !Array.isArray(data) || data.length === 0) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少参数或数据为空" }));
    }

    // 处理字段：将“录入人”统一替换成 name
    const rawKeys = Object.keys(data[0]);
    // 处理字段：将“录入人”统一替换成 name
let keys = Object.keys(data[0]).map(k => (k === "录入人" ? "name" : k));
// 去掉重复的 name
keys = [...new Set(keys)];

    // 创建字段 SQL
    const createCols = keys.map(k => `\`${k}\` TEXT`).join(",");

    // ✅ 创建表
    const createSQL = `
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        ${createCols},
   
        unique_key VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pools({ sql: createSQL, res, req });

    // 判断是否已有 name 字段
    // const hasNameField = keys.includes("name");

    // ✅ 预处理行，生成唯一键与插入值
    const prepared = data.map(row => {
      const cleanRow = { ...row };
      // “录入人”映射成 name
      // if ("录入人" in cleanRow) cleanRow.name = cleanRow["录入人"];
      // 如果 Excel 没有录入人字段，自动填当前用户
      // if (!hasNameField) cleanRow.name = userName;

      // 辅助函数：截断过长字段值
      function truncateField(value, maxLength = 50) {
        if (typeof value !== 'string') {
          value = String(value || '');
        }
        // 如果字段值超过最大长度，只保留前maxLength个字符
        return value.length > maxLength ? value.substring(0, maxLength) : value;
      }
      
      // 使用数组存储tableName和对应字段的映射关系
      const tableFieldMappings = [
        // 财务类表映射
        { tableNames: ['pt_cw_zjmxb', '财务', '收支'], fields: ['日期','系列', '公司','银行','摘要', '收入', '支出','备注','余额'] },
        // 订单类表映射
        { tableNames: ['pt-cw-yqdz', '订单'], fields: ['订单号', '渠道打车订单号', '下单时间'] },
        // 库存类表映射
        { tableNames: ['stock', '库存', '物资'], fields: ['物料号', '物料名称', '批次', '数量'] },
        // 人事类表映射
        { tableNames: ['hr', '人事', '员工'], fields: ['工号', '姓名', '部门', '入职日期'] },
        // 客户类表映射
        { tableNames: ['customer', '客户'], fields: ['客户编号', '客户名称', '联系人', '电话'] },
        // 产品类表映射
        { tableNames: ['product', '产品', '商品'], fields: ['产品编号', '产品名称', '规格', '单价'] }
      ];
      
      let uniqueStr = '';
      let foundMapping = false;
      
      // 查找匹配的tableName映射
      for (const mapping of tableFieldMappings) {
        if (mapping.tableNames.some(keyword => tableName.includes(keyword))) {
          // 获取可用的字段值并拼接，对过长字段进行截断
          const fieldValues = [];
          for (const field of mapping.fields) {
            // 对于日期字段，尝试主字段和备用字段
            if (field === '订单日期' && !cleanRow[field] && cleanRow['日期']) {
              fieldValues.push(truncateField(cleanRow['日期']));
            } else if (cleanRow[field]) {
              // 对摘要字段使用更短的截断长度（例如20字符）
              const maxLength = field === '摘要' ? 20 : 50;
              fieldValues.push(truncateField(cleanRow[field], maxLength));
            }
          }
          uniqueStr = fieldValues.join('|');
          foundMapping = true;
          break;
        }
      }
      
      // 如果没有找到匹配的映射，使用默认逻辑
      if (!foundMapping) {
        // 默认关键字段
        const defaultKeyFields = ['日期','系列', '公司','银行','摘要', '收入', '支出','备注','余额'];
        const availableFields = defaultKeyFields.filter(field => field in cleanRow && cleanRow[field]);
        
        if (availableFields.length > 0) {
          // 使用可用的关键字段，对过长字段进行截断
          uniqueStr = availableFields.map(field => {
            // 对摘要字段使用更短的截断长度
            const maxLength = field === '摘要' ? 20 : 50;
            return truncateField(cleanRow[field], maxLength);
          }).join('|');
        } else {
          // 如果没有关键字段，使用所有非空字段（限制数量和长度避免过长）
          const allNonEmptyFields = Object.keys(cleanRow).filter(key => cleanRow[key]);
          uniqueStr = allNonEmptyFields.slice(0, 5).map(field => {
            // 根据字段名称调整截断长度
            let maxLength = 50;
            if (field === '摘要' || field.includes('描述') || field.includes('说明')) {
              maxLength = 20;
            }
            return truncateField(cleanRow[field], maxLength);
          }).join('|');
        }
      }
      
      // 如果生成的uniqueStr为空，使用时间戳作为备用
      if (!uniqueStr.trim()) {
        uniqueStr = Date.now().toString();
      }
      const uniqueKey = crypto.createHash("md5").update(uniqueStr).digest("hex");

      // user_id + 所有字段值 + unique_key
      const rowValues = [userId, ...keys.map(k => cleanRow[k] ?? ""), uniqueKey];
      return { uniqueKey, rowValues, cleanRow };
    });

    // ✅ 插入字段 - 确保包含name字段
    const allFields = ["user_id", ...keys,"unique_key"].map(f => `\`${f}\``).join(",");
    

    // 每行占位符精确计算 - 增加name字段的占位符
    const rowPlaceholder = "(" + Array(1 + keys.length  + 1).fill("?").join(",") + ")";

    // 读取参数：是否保留重复（由前端弹窗确认）
    const { keepDuplicates } = req.body;

    // 查询数据库中已存在的 unique_key（当前用户）
    const allKeys = prepared.map(p => p.uniqueKey);
    let existingKeysSet = new Set();
    if (allKeys.length > 0) {
      // 使用显式占位符展开，避免 IN (?) 无法绑定数组导致未命中已有键
      const placeholders = allKeys.map(() => '?').join(',');
      const existingQuery = `SELECT unique_key FROM \`${tableName}\` WHERE user_id = ? AND unique_key IN (${placeholders})`;
      const existingResult = await pools({ sql: existingQuery, val: [userId, ...allKeys], isReturn: true });
      const existingRows = existingResult && Array.isArray(existingResult) ? existingResult :
        (existingResult && Array.isArray(existingResult.result) ? existingResult.result : []);
      existingKeysSet = new Set(existingRows.map(r => r.unique_key));
    }

    // 检测同批导入内的重复 unique_key，保留首条，其余视为重复
    const seenKeys = new Set();
    const incomingDupRows = [];
    const uniquePrepared = [];
    for (const p of prepared) {
      if (seenKeys.has(p.uniqueKey)) {
        incomingDupRows.push(p);
      } else {
        seenKeys.add(p.uniqueKey);
        uniquePrepared.push(p);
      }
    }

    // 划分新增与重复（数据库中已存在的重复 + 同批内重复）
    const newRows = uniquePrepared.filter(p => !existingKeysSet.has(p.uniqueKey));
    const dbDupRows = uniquePrepared.filter(p => existingKeysSet.has(p.uniqueKey));
    const dupRows = [...dbDupRows, ...incomingDupRows];

    // 先插入新增
    if (newRows.length > 0) {
      const insertNewSql = `INSERT INTO \`${tableName}\` (${allFields}) VALUES ${newRows.map(() => rowPlaceholder).join(",")}`;
      try {
        await pools({ sql: insertNewSql, val: newRows.flatMap(p => p.rowValues), res, req });
      } catch (e) {
        // 兜底：若仍因唯一键冲突报错，记录并返回重复提示，避免 500
        console.error('导入新增时报唯一键冲突，兜底提示重复：', e?.message || e);
        return res.send(utils.returnData({
          code: 2,
          msg: `⚠️ 发现重复 ${dupRows.length} 条，已导入 ${newRows.length} 条。是否保留重复？`,
          data: {
            inserted: newRows.length,
            duplicates: dupRows.map(d => ({ unique_key: d.uniqueKey, row: d.cleanRow }))
          }
        }));
      }
    }

    // 如果存在重复且前端未确认保留，返回重复明细，不插入重复
    if (dupRows.length > 0 && !keepDuplicates) {
      return res.send(utils.returnData({
        code: 2,
        msg: `⚠️ 发现重复 ${dupRows.length} 条，已导入 ${newRows.length} 条。是否保留重复？`,
        data: {
          inserted: newRows.length,
          duplicates: dupRows.map(d => ({ unique_key: d.uniqueKey, row: d.cleanRow }))
        }
      }));
    }

    // 保留重复：为重复行的 unique_key 增加前缀 cfbl_ 后再插入
    if (dupRows.length > 0 && keepDuplicates) {
      // 为重复项生成唯一前缀，避免同批重复再次冲突：cfbl_<序号>_<md5>
      const keyRepeatCounter = new Map();
      const dupRowsWithPrefix = dupRows.map(d => {
        const count = (keyRepeatCounter.get(d.uniqueKey) || 0) + 1;
        keyRepeatCounter.set(d.uniqueKey, count);
        const prefixedKey = `cfbl_${count}_${d.uniqueKey}`;
        const rowVals = [...d.rowValues];
        rowVals[rowVals.length - 1] = prefixedKey; // 替换 unique_key 为带前缀
        return { rowValues: rowVals, cleanRow: d.cleanRow, uniqueKey: prefixedKey };
      });

      const insertDupSql = `INSERT INTO \`${tableName}\` (${allFields}) VALUES ${dupRowsWithPrefix.map(() => rowPlaceholder).join(",")}`;
      await pools({ sql: insertDupSql, val: dupRowsWithPrefix.flatMap(p => p.rowValues), res, req });
    }

    // 成功返回统计
    res.send(utils.returnData({
      code: 1,
      msg: `✅ 导入完成：新增 ${newRows.length} 条${dupRows.length ? `，保留重复 ${keepDuplicates ? dupRows.length : 0} 条` : ''}${dupRows.length && !keepDuplicates ? '（重复未保留）' : ''}`,
      data: {
        inserted: newRows.length,
        keptDuplicates: keepDuplicates ? dupRows.length : 0,
        duplicatesFound: dupRows.length
      }
    }));
  } catch (err) {
    console.error("❌ 导入 Excel 出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});

/**
 * 📤 获取数据库数据
 */
router.post("/getExcelData", async (req, res) => {
  const { tableName } = req.body;
  if (!tableName) return res.send(utils.returnData({ code: 400, msg: "缺少表名" }));
  const sql = `SELECT  日期,摘要,收入,支出,余额,备注,发票 FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  // const sql = `SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  const { result } = await pools({ sql, res });
  res.send(utils.returnData({ data: result }));
});

// 获取出纳结算数据
router.post("/getSettlementData", async (req, res) => {
  // 参考 getCashRecords 的过滤与分页模式
  console.log("getSettlementData", req.body);
  const obj = req.body || {};

  // 登录用户
  const user = await utils.getUserRole(req, res);
  console.log(user)
  const userId = user.user.id;

  // 兼容两种前端传参形式：selectedCompanyBank/dateRange 与 data 结构
  const selectedCompanyBank = obj.selectedCompanyBank || [];
  const dateRange = obj.dateRange || [];
  const data = obj.data || {};

  const company = data.company ?? selectedCompanyBank[0];
  const bank = data.bank ?? selectedCompanyBank[1];
  const summary = data.summary ?? undefined;
  const dateFrom = data.dateFrom ?? dateRange[0];
  const dateTo = data.dateTo ?? dateRange[1];

  // 基础查询：先判断 more_id 是否为 1/2/3，若是则全量；否则根据 roles_id（可能多值）筛选
  // 修正为：先以 roles_id 判定超管（包含 1/2/3 即超管），否则才按 more_id 做公司过滤
  const rolesStr = String(user.user?.rolesId || '').trim();
  const rolesArr = rolesStr ? rolesStr.split(',').map(v => Number(v)).filter(v => !Number.isNaN(v)) : [];
  const isSuper = rolesArr.some(v => [1, 2, 3].includes(v));
  let sql = `SELECT id, 日期, 公司, 银行, 摘要, 收入, 支出, 余额,标签 , 备注, 发票 FROM \`pt_cw_zjmxb\``;
  sql += ` WHERE 1=1`;
  if (!isSuper) {
    const moreIdNum = Number(user.user?.moreId);
    if (!Number.isNaN(moreIdNum)) sql += ` AND more_id = ${moreIdNum}`;
  }
  // 模糊匹配
  sql = utils.setLike(sql, '公司', company);
  sql = utils.setLike(sql, '银行', bank);
  sql = utils.setLike(sql, '摘要', summary);
  // 日期区间
  if (dateFrom) sql += ` AND 日期 >= '${dayjs(dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
  if (dateTo) sql += ` AND 日期 <= '${dayjs(dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;

  // 排序 + 分页
  sql += ' ORDER BY id ASC';
  const page = Number(data.page) || 1;
  const size = Number(data.size) || 1000;
  let { total } = await utils.getSum({ sql, name: 'pt_cw_zjmxb', res, req });
  sql = utils.pageSize(sql, page, size);

  const { result } = await pools({ sql, res, req });
  // 保持前端兼容：返回 data 为数组
  res.send(utils.returnData({ data: result, total }));
});

// 导出出纳结算数据为 Excel
router.post("/hy-exportSettlementExcel", async (req, res) => {
  try {
    // 读取参数，兼容与 hy-getSettlementData 相同的结构
    const obj = req.body || {};
    const selectedCompanyBank = obj.selectedCompanyBank || [];
    const dateRange = obj.dateRange || [];
    const data = obj.data || {};

    // 登录用户
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;

    // 条件参数
    const company = data.company ?? selectedCompanyBank[0];
    const bank = data.bank ?? selectedCompanyBank[1];
    const summary = data.summary ?? undefined; // 前端将订单状态映射到摘要
    const dateFrom = data.dateFrom ?? dateRange[0];
    const dateTo = data.dateTo ?? dateRange[1];

    // 基础查询（不分页），复用 hy-getSettlementData 的过滤逻辑
    let baseSql = 'SELECT q.*, ' +
      "CASE WHEN mt.`sp订单号` IS NOT NULL THEN '美团˙已对账' ELSE NULL END AS `对账状态` " +
      'FROM `hy-cw-gl` q ' +
      'LEFT JOIN `hy-cw-mt` mt ON mt.`sp订单号` = q.`运力主单ID` ' +
      'WHERE q.user_id = ' + userId;
    baseSql = utils.setLike(baseSql, '公司', company);
    baseSql = utils.setLike(baseSql, '银行', bank);
    baseSql = utils.setLike(baseSql, '摘要', summary);
    if (dateFrom) baseSql += ` AND 日期 >= '${dayjs(dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (dateTo) baseSql += ` AND 日期 <= '${dayjs(dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;
    baseSql += ' ORDER BY q.id ASC';

    // 统计总数（传入正确的表名，避免连字符导致的解析错误）
    const { total } = await utils.getSum({ sql: baseSql.replace(/\bq\./g, ''), name: '`hy-cw-gl`', res, req });

    // 响应头：流式下载
    const fileName = encodeURIComponent('GL结算.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Transfer-Encoding', 'chunked');

    // 使用 ExcelJS 流式写入，避免大数据占用内存导致超时
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: res,
      useSharedStrings: true,
      useStyles: false,
    });
    const worksheet = workbook.addWorksheet('GL结算');

    // 先获取一行用于确定列顺序
    const headSql = baseSql + ' LIMIT 1';
    const { result: headRows } = await pools({ sql: headSql, res, req });
    const keys = Array.isArray(headRows) && headRows.length ? Object.keys(headRows[0]) : [];
    const ordered = keys.includes('序号') ? ['序号', ...keys.filter(k => k !== '序号')] : keys;

    // 写入表头
    if (ordered.length === 0) {
      worksheet.addRow(['无数据']).commit();
    } else {
      worksheet.addRow(ordered).commit();
      // 分块查询，逐行写入
      const chunkSize = 5000; // 每次提取 5000 行
      let offset = 0;
      while (offset < total) {
        const chunkSql = `${baseSql} LIMIT ${chunkSize} OFFSET ${offset}`;
        const { result: chunk } = await pools({ sql: chunkSql, res, req });
        for (const row of (chunk || [])) {
          worksheet.addRow(ordered.map(k => row[k])).commit();
        }
        offset += chunkSize;
      }
    }

    // 结束写入（这将结束响应流）
    await worksheet.commit();
    await workbook.commit();
  } catch (err) {
    console.error('❌ 导出失败:', err);
    try {
      // 如果尚未开始写入，则返回错误 JSON
      if (!res.headersSent) {
        res.send(utils.returnData({ code: 500, msg: `导出失败: ${err.message || '未知错误'}` }));
      } else {
        // 已开始写入流，安全结束连接
        res.end();
      }
    } catch (_) {
      // 忽略
    }
  }
});

// 进度存储（内存级，按 jobId 记录）
const exportProgress = Object.create(null);

// CSV 导出：按 10 万/页分页下载，节省资源
router.post('/hy-exportSettlementCsv', async (req, res) => {
  try {
    const obj = req.body || {};
    const selectedCompanyBank = obj.selectedCompanyBank || [];
    const dateRange = obj.dateRange || [];
    const data = obj.data || {};

    // 登录用户
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;

    // 过滤参数（与 hy-getSettlementData 一致）
    const company = data.company ?? selectedCompanyBank[0];
    const bank = data.bank ?? selectedCompanyBank[1];
    const summary = data.summary ?? undefined;
    const dateFrom = data.dateFrom ?? dateRange[0];
    const dateTo = data.dateTo ?? dateRange[1];

    // 基础查询
    let baseSql = 'SELECT q.*, ' +
      "CASE WHEN mt.`sp订单号` IS NOT NULL THEN '美团˙已对账' ELSE NULL END AS `对账状态` " +
      'FROM `hy-cw-gl` q ' +
      'LEFT JOIN `hy-cw-mt` mt ON mt.`sp订单号` = q.`运力主单ID` ' +
      'WHERE q.user_id = ' + userId;
    baseSql = utils.setLike(baseSql, '公司', company);
    baseSql = utils.setLike(baseSql, '银行', bank);
    baseSql = utils.setLike(baseSql, '摘要', summary);
    if (dateFrom) baseSql += ` AND 日期 >= '${dayjs(dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (dateTo) baseSql += ` AND 日期 <= '${dayjs(dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;
    baseSql += ' ORDER BY q.id ASC';

    // 总数
    const { total } = await utils.getSum({ sql: baseSql.replace(/\bq\./g, ''), name: '`hy-cw-gl`', res, req });

    // 分页参数：默认每页 100000
    const pageSize = Math.max(1, Number(data.pageSize) || 100000);
    const page = Math.max(1, Number(data.page) || 1);
    const offset = (page - 1) * pageSize;
    const remain = Math.max(0, total - offset);
    const pageCount = Math.min(pageSize, remain);

    // 进度：为本次导出生成/使用 jobId，并初始化进度
    const jobId = data.jobId || uuidv4();
    exportProgress[jobId] = {
      total: pageCount,
      processed: 0,
      percent: 0,
      status: 'running',
      page,
      pageSize,
      updatedAt: Date.now(),
    };

    // 响应头
    const fileName = encodeURIComponent(`GL结算_p${page}.csv`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // 写入 UTF-8 BOM，便于 Excel 正确识别中文
    res.write('\ufeff');

    // 确定表头顺序
    const headSql = baseSql + ' LIMIT 1';
    const { result: headRows } = await pools({ sql: headSql, res, req });
    const keys = Array.isArray(headRows) && headRows.length ? Object.keys(headRows[0]) : [];
    const ordered = keys.includes('序号') ? ['序号', ...keys.filter(k => k !== '序号')] : keys;

    // CSV 转义
    const esc = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      const needQuote = /[",\n\r]/.test(s);
      const inner = s.replace(/"/g, '""');
      return needQuote ? `"${inner}"` : inner;
    };

    if (ordered.length === 0 || pageCount <= 0) {
      res.write('无数据\n');
      return res.end();
    }

    // 写表头
    res.write(ordered.map(esc).join(',') + '\n');

    // 分块查询当前页数据并写入，同时更新进度
    const chunkSize = 5000;
    let fetched = 0;
    while (fetched < pageCount) {
      const size = Math.min(chunkSize, pageCount - fetched);
      const chunkSql = `${baseSql} LIMIT ${size} OFFSET ${offset + fetched}`;
      const { result: chunk } = await pools({ sql: chunkSql, res, req });
      for (const row of (chunk || [])) {
        const line = ordered.map(k => esc(row[k])).join(',');
        res.write(line + '\n');
      }
      fetched += size;
      const prog = exportProgress[jobId];
      if (prog) {
        prog.processed = fetched;
        prog.percent = pageCount ? Math.round((prog.processed / pageCount) * 100) : 100;
        prog.updatedAt = Date.now();
      }
    }

    // 完成：更新进度并结束响应
    const prog = exportProgress[jobId];
    if (prog) {
      prog.processed = pageCount;
      prog.percent = 100;
      prog.status = 'done';
      prog.updatedAt = Date.now();
    }
    res.end();
    // 清理进度（5分钟后）
    setTimeout(() => { delete exportProgress[jobId]; }, 5 * 60 * 1000);
  } catch (err) {
    console.error('❌ CSV 导出失败:', err);
    if (!res.headersSent) {
      res.send(utils.returnData({ code: 500, msg: `导出失败: ${err.message || '未知错误'}` }));
    } else {
      res.end();
    }
  }
});

// 查询 CSV 导出进度
router.post('/hy-exportSettlementCsvProgress', async (req, res) => {
  try {
    const jobId = req.body?.jobId;
    const prog = jobId ? exportProgress[jobId] : null;
    res.send(utils.returnData({ data: prog || { status: 'not_found', total: 0, processed: 0, percent: 0 } }));
  } catch (err) {
    res.send(utils.returnData({ code: 500, msg: `进度查询失败: ${err.message || '未知错误'}` }));
  }
});

// 获取出纳表公司、银行
router.post("/getSettlementCompanyBank", async (req, res) => {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    
    // 逻辑对齐：先判断 roles_id 是否包含 1/2/3（超管）；否则根据 more_id 筛选
    const rolesStr = String(user.user?.rolesId || '').trim();
    const rolesArr = rolesStr ? rolesStr.split(',').map(v => Number(v)).filter(v => !Number.isNaN(v)) : [];
    const isSuper = rolesArr.some(v => [1, 2, 3].includes(v));

    let sql = `SELECT DISTINCT 公司,银行 FROM \`pt_cw_zjmxb\` WHERE 1=1`;
    
    if (!isSuper) {
      const moreIdNum = Number(user.user?.moreId);
      if (!Number.isNaN(moreIdNum)) sql += ` AND more_id = ${moreIdNum}`;
    }
    
    sql += ` AND 公司 IS NOT NULL AND 公司 <> '' AND 银行 IS NOT NULL AND 银行 <> ''`;

  // const sql = `SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  const { result } = await pools({ sql, res });
  res.send(utils.returnData({ data: result }));
});

// 获取唯一 系列/公司/银行（支持条件过滤）
// 请求体兼容两种形式：
// - { data: { series?, company? } }
// - { series?, company? }
// 返回：{ series: string[], companies: string[], banks: string[] }
router.post('/getUniqueSeriesCompanyBank', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;

    const payload = (req.body && req.body.data) ? req.body.data : (req.body || {});
    const series = (payload.series || '').trim();
    const company = (payload.company || '').trim();

    // 基础 WHERE 子句（限定当前用户数据）
    const baseWhere = [
      `user_id = ${userId}`,
      // 按需追加过滤条件（精确匹配）
      series ? `系列 = '${series.replace(/'/g, "''")}'` : '',
      company ? `公司 = '${company.replace(/'/g, "''")}'` : ''
    ].filter(Boolean).join(' AND ');

    const companiesSql = `SELECT DISTINCT 公司 AS company FROM \`pt_cw_zjmxb\` WHERE ${baseWhere} ORDER BY 公司`;
    const banksSql = `SELECT DISTINCT 银行 AS bank FROM \`pt_cw_zjmxb\` WHERE ${baseWhere} ORDER BY 银行`;
    // 系列通常全局唯一集合（不受公司过滤影响）
    const seriesWhere = `user_id = ${userId}`;
    const seriesSql = `SELECT DISTINCT 系列 AS series FROM \`pt_cw_zjmxb\` WHERE ${seriesWhere} AND 系列 IS NOT NULL AND 系列 <> '' ORDER BY 系列`;

    // 根据传参决定查询范围：
    // - 传 series + company：仅返回 banks（该系列-公司下唯一银行）
    // - 仅传 series：返回 companies（该系列下唯一公司）与 banks（该系列下唯一银行）
    // - 不传：返回全量 series/companies/banks
    let companies = [];
    let banks = [];
    let seriesArr = [];

    if (!series && !company) {
      const [sRes, cRes, bRes] = await Promise.all([
        pools({ sql: seriesSql, res, req }),
        pools({ sql: `SELECT DISTINCT 公司 AS company FROM \`pt_cw_zjmxb\` WHERE ${seriesWhere} ORDER BY 公司`, res, req }),
        pools({ sql: `SELECT DISTINCT 银行 AS bank FROM \`pt_cw_zjmxb\` WHERE ${seriesWhere} ORDER BY 银行`, res, req })
      ]);
      seriesArr = (sRes.result || []).map(r => r.series);
      companies = (cRes.result || []).map(r => r.company);
      banks = (bRes.result || []).map(r => r.bank);
    } else if (series && !company) {
      const [cRes, bRes] = await Promise.all([
        pools({ sql: companiesSql, res, req }),
        pools({ sql: banksSql, res, req })
      ]);
      companies = (cRes.result || []).map(r => r.company);
      banks = (bRes.result || []).map(r => r.bank);
    } else {
      // series && company 都传：仅返回银行集合
      const bRes = await pools({ sql: banksSql, res, req });
      banks = (bRes.result || []).map(r => r.bank);
    }

    res.send(utils.returnData({ data: { series: seriesArr, companies, banks } }));
  } catch (error) {
    console.error('getUniqueSeriesCompanyBank error:', error);
    res.send(utils.returnData({ code: -1, msg: '服务器异常', err: error?.message }));
  }
});

// ===================== 应收/应付明细录入（新表） =====================
// 表结构：
// - 应付表：pt_cw_zjmxbfk（增加列：实付金额）
// - 应收表：pt_cw_zjmxbsk（增加列：实收金额）
// 若不存在则依据结构自动创建；所有数据按 user_id 归属

// 生成创建“应付”表的SQL
function getCreatePayableTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS \`pt_cw_zjmxbfk\` (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL COMMENT '创建用户ID',
      系列 VARCHAR(100) COMMENT '系列',
      公司 VARCHAR(200) COMMENT '公司',
      对方公司名字 VARCHAR(200) COMMENT '对方公司名字',
      账号 VARCHAR(200) COMMENT '账号/银行',
      分类 VARCHAR(100) COMMENT '分类',
      车牌 VARCHAR(100) COMMENT '车牌',
      车架号 VARCHAR(200) COMMENT '车架号',
      还款日期 DATE COMMENT '还款日期',
      金额 DECIMAL(18,2) DEFAULT 0 COMMENT '金额',
      实付金额 DECIMAL(18,2) DEFAULT 0 COMMENT '实付金额',
      商业保单号 VARCHAR(200) COMMENT '商业保单号',
      车损 DECIMAL(18,2) DEFAULT 0 COMMENT '车损',
      三者 DECIMAL(18,2) DEFAULT 0 COMMENT '三者',
      司机 DECIMAL(18,2) DEFAULT 0 COMMENT '司机',
      乘客 DECIMAL(18,2) DEFAULT 0 COMMENT '乘客',
      交强单号 VARCHAR(200) COMMENT '交强单号',
      交强金额 DECIMAL(18,2) DEFAULT 0 COMMENT '交强金额',
      出单日期 DATE COMMENT '出单日期',
      备注 TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_user(user_id),
      INDEX idx_sc(系列, 公司),
      INDEX idx_acc(账号)
    ) COMMENT='应付明细表';
  `;
}

// 生成创建“应收”表的SQL
function getCreateReceivableTableSql() {
  return `
    CREATE TABLE IF NOT EXISTS \`pt_cw_zjmxbsk\` (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL COMMENT '创建用户ID',
      系列 VARCHAR(100) COMMENT '系列',
      公司 VARCHAR(200) COMMENT '公司',
      对方公司名字 VARCHAR(200) COMMENT '对方公司名字',
      账号 VARCHAR(200) COMMENT '账号/银行',
      分类 VARCHAR(100) COMMENT '分类',
      车牌 VARCHAR(100) COMMENT '车牌',
      车架 VARCHAR(200) COMMENT '车架',
      金额 DECIMAL(18,2) DEFAULT 0 COMMENT '金额',
      实收金额 DECIMAL(18,2) DEFAULT 0 COMMENT '实收金额',
      应收月份 VARCHAR(20) COMMENT 'YYYY-MM',
      开始日期 DATE COMMENT '开始日期',
      结束日期 DATE COMMENT '结束日期',
      赠送天数 INT DEFAULT 0 COMMENT '赠送天数',
      备注 TEXT COMMENT '备注',
      create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      INDEX idx_user(user_id),
      INDEX idx_sc(系列, 公司),
      INDEX idx_acc(账号)
    ) COMMENT='应收明细表';
  `;
}

// 确保两张表存在
async function ensureSettlementDetailTables() {
  await ensureDbwhTableExists('pt_cw_zjmxbfk', getCreatePayableTableSql());
  await ensureDbwhTableExists('pt_cw_zjmxbsk', getCreateReceivableTableSql());
}

// 确保“应收”表存在列：续签日期
async function ensureReceivableRenewDateColumn(res, req) {
  try {
    const { result } = await pools({ sql: "SHOW COLUMNS FROM `pt_cw_zjmxbsk` LIKE '续签日期'", res, req });
    if (!Array.isArray(result) || result.length === 0) {
      await pools({ sql: "ALTER TABLE `pt_cw_zjmxbsk` ADD COLUMN `续签日期` DATE COMMENT '续签日期' AFTER `结束日期`", res, req });
    }
  } catch (e) {
    console.error('ensureReceivableRenewDateColumn error:', e);
  }
}
// 确保两张表存在列：对方公司名字
async function ensureTargetCompanyNameColumns(res, req) {
  try {
    // 应付表新增列
    const { result: fkCols } = await pools({ sql: "SHOW COLUMNS FROM `pt_cw_zjmxbfk` LIKE '对方公司名字'", res, req });
    if (!Array.isArray(fkCols) || fkCols.length === 0) {
      await pools({ sql: "ALTER TABLE `pt_cw_zjmxbfk` ADD COLUMN `对方公司名字` VARCHAR(200) COMMENT '对方公司名字' AFTER `公司`", res, req });
    }
    // 应收表新增列
    const { result: skCols } = await pools({ sql: "SHOW COLUMNS FROM `pt_cw_zjmxbsk` LIKE '对方公司名字'", res, req });
    if (!Array.isArray(skCols) || skCols.length === 0) {
      await pools({ sql: "ALTER TABLE `pt_cw_zjmxbsk` ADD COLUMN `对方公司名字` VARCHAR(200) COMMENT '对方公司名字' AFTER `公司`", res, req });
    }
  } catch (e) {
    console.error('ensureTargetCompanyNameColumns error:', e);
  }
}

// 新增-应付
router.post('/addPayable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();
    await ensureTargetCompanyNameColumns(res, req);

    const payload = req.body?.data || req.body || {};
    const fields = {
      系列: payload.series || payload['系列'] || '',
      公司: payload.company || payload['公司'] || '',
      对方公司名字: payload.targetCompanyName || payload['对方公司名字'] || '',
      账号: payload.account || payload['账号'] || payload['银行'] || '',
      分类: payload.category || payload['分类'] || '',
      车牌: payload.plate || payload['车牌'] || '',
      车架号: payload.vin || payload['车架号'] || '',
      还款日期: payload.repayDate || payload['还款日期'] || null,
      金额: Number(payload.amount || payload['金额'] || 0),
      实付金额: Number(payload.actualPayAmount || payload['实付金额'] || 0),
      商业保单号: payload.policyCommercial || payload['商业保单号'] || '',
      车损: Number(payload.carDamage || payload['车损'] || 0),
      三者: Number(payload.thirdParty || payload['三者'] || 0),
      司机: Number(payload.driver || payload['司机'] || 0),
      乘客: Number(payload.passenger || payload['乘客'] || 0),
      交强单号: payload.policyMandatory || payload['交强单号'] || '',
      交强金额: Number(payload.mandatoryAmount || payload['交强金额'] || 0),
      出单日期: payload.issueDate || payload['出单日期'] || null,
      备注: payload.remark || payload['备注'] || ''
    };

    const cols = Object.keys(fields);
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT INTO \`pt_cw_zjmxbfk\` (user_id, ${cols.join(',')}) VALUES (?, ${placeholders})`;
    const vals = [userId, ...cols.map(k => fields[k])];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应付新增成功' }));
  } catch (error) {
    console.error('addPayable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应付新增失败', err: error?.message }));
  }
});

// 新增-应收
router.post('/addReceivable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();
    await ensureReceivableRenewDateColumn(res, req);
    await ensureTargetCompanyNameColumns(res, req);

    const payload = req.body?.data || req.body || {};
    const fields = {
      系列: payload.series || payload['系列'] || '',
      公司: payload.company || payload['公司'] || '',
      对方公司名字: payload.targetCompanyName || payload['对方公司名字'] || '',
      账号: payload.account || payload['账号'] || payload['银行'] || '',
      分类: payload.category || payload['分类'] || '',
      车牌: payload.plate || payload['车牌'] || '',
      车架: payload.vin || payload['车架'] || '',
      金额: Number(payload.amount || payload['金额'] || 0),
      实收金额: Number(payload.actualReceiveAmount || payload['实收金额'] || 0),
      应收月份: payload.receivableMonth || payload['应收月份'] || '',
      开始日期: payload.leaseStartDate || payload['开始日期'] || null,
      结束日期: payload.leaseEndDate || payload['结束日期'] || null,
      续签日期: payload.renewDate || payload['续签日期'] || null,
      赠送天数: Number(payload.giftDays || payload['赠送天数'] || 0),
      备注: payload.remark || payload['备注'] || ''
    };

    const cols = Object.keys(fields);
    const placeholders = cols.map(() => '?').join(',');
    const sql = `INSERT INTO \`pt_cw_zjmxbsk\` (user_id, ${cols.join(',')}) VALUES (?, ${placeholders})`;
    const vals = [userId, ...cols.map(k => fields[k])];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应收新增成功' }));
  } catch (error) {
    console.error('addReceivable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应收新增失败', err: error?.message }));
  }
});

// 列表-应付（支持按系列/公司/账号过滤）
router.post('/getPayableList', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();

    const payload = req.body?.data || req.body || {};
    const series = (payload.series || '').trim();
    const company = (payload.company || '').trim();
    const account = (payload.account || payload.bank || '').trim();

    let sql = `SELECT id, 系列, 公司, 对方公司名字, 账号, 分类, 车牌, 车架号, 还款日期, 金额, 实付金额, 商业保单号, 车损, 三者, 司机, 乘客, 交强单号, 交强金额, 出单日期, 备注, create_time FROM \`pt_cw_zjmxbfk\` WHERE user_id=${userId}`;
    sql = utils.setLike(sql, '系列', series);
    sql = utils.setLike(sql, '公司', company);
    sql = utils.setLike(sql, '账号', account);
    sql += ' ORDER BY id DESC LIMIT 2000';
    const { result } = await pools({ sql, res, req });
    res.send(utils.returnData({ data: result }));
  } catch (error) {
    console.error('getPayableList error:', error);
    res.send(utils.returnData({ code: -1, msg: '获取应付列表失败', err: error?.message }));
  }
});

// 列表-应收（支持按系列/公司/账号过滤）
router.post('/getReceivableList', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();
    await ensureReceivableRenewDateColumn(res, req);

    const payload = req.body?.data || req.body || {};
    const series = (payload.series || '').trim();
    const company = (payload.company || '').trim();
    const account = (payload.account || payload.bank || '').trim();

    let sql = `SELECT id, 系列, 公司, 对方公司名字, 账号, 分类, 车牌, 车架, 金额, 实收金额, 应收月份, 开始日期, 结束日期, 续签日期, 赠送天数, 备注, create_time FROM \`pt_cw_zjmxbsk\` WHERE user_id=${userId}`;
    sql = utils.setLike(sql, '系列', series);
    sql = utils.setLike(sql, '公司', company);
    sql = utils.setLike(sql, '账号', account);
    sql += ' ORDER BY id DESC LIMIT 2000';
    const { result } = await pools({ sql, res, req });
    res.send(utils.returnData({ data: result }));
  } catch (error) {
    console.error('getReceivableList error:', error);
    res.send(utils.returnData({ code: -1, msg: '获取应收列表失败', err: error?.message }));
  }
});

// 更新-应付
router.post('/updatePayable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();

    const payload = req.body?.data || req.body || {};
    const id = Number(payload.id || payload.ID || payload.Id);
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少id' }));

  const fields = {
    系列: payload.series ?? payload['系列'],
    公司: payload.company ?? payload['公司'],
    对方公司名字: payload.targetCompanyName ?? payload['对方公司名字'],
    账号: payload.account ?? payload['账号'] ?? payload['银行'],
    分类: payload.category ?? payload['分类'],
    车牌: payload.plate ?? payload['车牌'],
    车架号: payload.vin ?? payload['车架号'],
    还款日期: payload.repayDate ?? payload['还款日期'],
      金额: payload.amount ?? payload['金额'],
      实付金额: payload.actualPayAmount ?? payload['实付金额'],
      商业保单号: payload.policyCommercial ?? payload['商业保单号'],
      车损: payload.carDamage ?? payload['车损'],
      三者: payload.thirdParty ?? payload['三者'],
      司机: payload.driver ?? payload['司机'],
      乘客: payload.passenger ?? payload['乘客'],
      交强单号: payload.policyMandatory ?? payload['交强单号'],
      交强金额: payload.mandatoryAmount ?? payload['交强金额'],
      出单日期: payload.issueDate ?? payload['出单日期'],
      备注: payload.remark ?? payload['备注']
    };

    const setCols = Object.keys(fields).filter(k => fields[k] !== undefined);
    if (!setCols.length) return res.send(utils.returnData({ code: -1, msg: '无可更新字段' }));
    const setSql = setCols.map(k => `\`${k}\`=?`).join(',');
    const sql = `UPDATE \`pt_cw_zjmxbfk\` SET ${setSql} WHERE id=? AND user_id=?`;
    const vals = [...setCols.map(k => fields[k]), id, userId];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应付更新成功' }));
  } catch (error) {
    console.error('updatePayable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应付更新失败', err: error?.message }));
  }
});

// 删除-应付
router.post('/deletePayable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();

    const payload = req.body?.data || req.body || {};
    const id = Number(payload.id || payload.ID || payload.Id);
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少id' }));
    const sql = 'DELETE FROM `pt_cw_zjmxbfk` WHERE id=? AND user_id=?';
    const vals = [id, userId];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应付删除成功' }));
  } catch (error) {
    console.error('deletePayable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应付删除失败', err: error?.message }));
  }
});

// 更新-应收
router.post('/updateReceivable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();
    await ensureReceivableRenewDateColumn(res, req);

    const payload = req.body?.data || req.body || {};
    const id = Number(payload.id || payload.ID || payload.Id);
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少id' }));

  const fields = {
    系列: payload.series ?? payload['系列'],
    公司: payload.company ?? payload['公司'],
    对方公司名字: payload.targetCompanyName ?? payload['对方公司名字'],
    账号: payload.account ?? payload['账号'] ?? payload['银行'],
    分类: payload.category ?? payload['分类'],
    车牌: payload.plate ?? payload['车牌'],
    车架: payload.vin ?? payload['车架'],
    金额: payload.amount ?? payload['金额'],
      实收金额: payload.actualReceiveAmount ?? payload['实收金额'],
      应收月份: payload.receivableMonth ?? payload['应收月份'],
      开始日期: payload.leaseStartDate ?? payload['开始日期'],
      结束日期: payload.leaseEndDate ?? payload['结束日期'],
      续签日期: payload.renewDate ?? payload['续签日期'],
      赠送天数: payload.giftDays ?? payload['赠送天数'],
      备注: payload.remark ?? payload['备注']
    };

    const setCols = Object.keys(fields).filter(k => fields[k] !== undefined);
    if (!setCols.length) return res.send(utils.returnData({ code: -1, msg: '无可更新字段' }));
    const setSql = setCols.map(k => `\`${k}\`=?`).join(',');
    const sql = `UPDATE \`pt_cw_zjmxbsk\` SET ${setSql} WHERE id=? AND user_id=?`;
    const vals = [...setCols.map(k => fields[k]), id, userId];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应收更新成功' }));
  } catch (error) {
    console.error('updateReceivable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应收更新失败', err: error?.message }));
  }
});

// 删除-应收
router.post('/deleteReceivable', async (req, res) => {
  try {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    await ensureSettlementDetailTables();

    const payload = req.body?.data || req.body || {};
    const id = Number(payload.id || payload.ID || payload.Id);
    if (!id) return res.send(utils.returnData({ code: -1, msg: '缺少id' }));
    const sql = 'DELETE FROM `pt_cw_zjmxbsk` WHERE id=? AND user_id=?';
    const vals = [id, userId];
    await pools({ sql, val: vals, res, req });
    res.send(utils.returnData({ msg: '应收删除成功' }));
  } catch (error) {
    console.error('deleteReceivable error:', error);
    res.send(utils.returnData({ code: -1, msg: '应收删除失败', err: error?.message }));
  }
});

// 出纳表 - 新增单条记录
router.post("/addSettlementData", async (req, res) => {
  console.log(req.body);
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    const moreId = user.user.moreId;
    const rolesId = user.user.rolesId;
    const userName = user.user.name; // 录入人

    const { tableName, data } = req.body;
    
    if (!tableName || !data || !data.id) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少必要参数" }));
    }
    
    // 检查是否已存在
    const checkSQL = `SELECT id FROM \`${tableName}\` WHERE user_id = ? AND id = ?`;
    const { result: checkResult } = await pools({
      sql: checkSQL,
      val: [userId, data.id],
      res,
      req
    });
    
    if (Array.isArray(checkResult) && checkResult.length > 0) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 记录已存在" }));
    }
    
    // 执行新增（同时写入 user_id、more_id、roles_id）
    const insertSQL = `INSERT INTO \`${tableName}\` (user_id, more_id, roles_id, 日期, 公司, 银行, 摘要, 收入, 支出, 余额, 备注, 发票, 序号, 录入人, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await pools({
      sql: insertSQL,
      val: [
        userId,
        moreId ?? null,
        rolesId ?? '',
        data['日期'] || '',
        data['公司'] || '',
        data['银行'] || '',
        data['摘要'] || '',
        data['收入'] || 0,
        data['支出'] || 0,
        data['余额'] || 0,
        data['备注'] || '',
        data['发票'] || '',
        data['序号'] || '',
        userName || '',
        data.id || ''
      ],
      res,
      req
    });
    
    res.send(utils.returnData({ code: 1, msg: "✅ 新增成功" }));
  } catch (err) {
    console.error("❌ 新增数据出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});

  router.post("/getMaxId", async (req, res) => {
    try {
      const tableName = req.body.tableName || 'pt_cw_zjmxb';
      const sql = `SELECT MAX(id) AS maxId FROM \`${tableName}\``;
      const { result } = await pools({ sql, res, req });
      const nextId = (result && result[0] && Number(result[0].maxId) + 1) || 0;
      res.send(utils.returnData({ code: 1, msg: "✅ 获取成功", data: nextId }));
    } catch (err) {
      res.send(utils.returnData({ code: 500, msg: `❌ 获取失败: ${err.message || '未知错误'}` }));
    }
  });

// 出纳表 - 更新单条记录
router.post("/updateSettlementData", async (req, res) => {
    console.log(req.body);
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    console.log(user)
    const userId = user.user.id;
    const moreId = user.user.moreId;
    const rolesId = user.user.rolesId;

    const { tableName, data } = req.body;
    
    if (!tableName || !data || !data.id) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少必要参数" }));
    }

    // 先检查录入人是否一致
    const checkSql = `SELECT user_id FROM \`${tableName}\` WHERE id = ?`;
    const { result: checkResult } = await pools({ sql: checkSql, val: [data.id], res, req });
    
    if (checkResult && checkResult.length > 0) {
      const recordUserId = checkResult[0].user_id;
      // moreId为1,2,3则是超级管理员，可以修改所有；否则只能修改自己的
      const isSuper = [1, 2, 3].includes(Number(rolesId));
      if (!isSuper && recordUserId != userId) {
        return res.send(utils.returnData({ code: -1, msg: "请联系录入人员修改" }));
      }
    } else {
        return res.send(utils.returnData({ code: -1, msg: "记录不存在" }));
    }
    
    // 执行更新（同时写入 roles_id、more_id）
    const updateSQL = `UPDATE \`${tableName}\` SET unique_key = ?, 日期 = ?, 公司 = ?, 银行 = ?, 摘要 = ?, 收入 = ?, 支出 = ?, 余额 = ?, 备注 = ?, 标签 = ?,  发票 = ?, 序号 = ?, roles_id = ?, more_id = ? WHERE id = ?`;
    await pools({ 
      sql: updateSQL, 
      val: [
        data['unique_key'] || '',
        data['日期'] || '',
        data['公司'] || '',
        data['银行'] || '',
        data['摘要'] || '',
        data['收入'] || 0,
        data['支出'] || 0,
        data['余额'] || 0,
        data['备注'] || '',
        data['标签'] || '',
        data['发票'] || '',
        data['序号'] || '',
        rolesId ?? '',
        moreId ?? null,
        data.id || ''

      ], 
      isReturn: true 
    });
    
    res.send(utils.returnData({ code: 1, msg: "✅ 更新成功" }));
  } catch (err) {
    console.error("❌ 更新数据出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});

// 出纳表 - 删除单条记录
router.post("/deleteSettlementData", async (req, res) => {
  console.log(req.body);
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    const rolesId = user.user.rolesId;

    const { tableName, id } = req.body;
    
    if (!tableName || !id) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少必要参数" }));
    }
    
    // Check permission
    const checkSql = `SELECT user_id FROM \`${tableName}\` WHERE id = ?`;
    const { result: checkResult } = await pools({ sql: checkSql, val: [id], res, req });
    
    if (checkResult && checkResult.length > 0) {
      const recordUserId = checkResult[0].user_id;
      // rolesId为1,2,3则是超级管理员，可以删除所有；否则只能删除自己的
      const isSuper = [1, 2, 3].includes(Number(rolesId));
      if (!isSuper && recordUserId != userId) {
        return res.send(utils.returnData({ code: -1, msg: "只能删除自己录入的数据" }));
      }
    } else {
        return res.send(utils.returnData({ code: -1, msg: "记录不存在" }));
    }

    // 执行删除
    const deleteSQL = `DELETE FROM \`${tableName}\` WHERE id = ?`;
    await pools({ 
      sql: deleteSQL, 
      val: [id], 
      isReturn: true 
    });
    console.log("result");
    res.send(utils.returnData({ code: 1, msg: "✅ 删除成功" }));
  } catch (err) {
    console.error("❌ 删除数据出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});

// 出纳表 - 批量同步数据（保留原功能）
router.post("/upSettlementData", async (req, res) => {
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    
    const { tableName, data } = req.body;
    
    if (!tableName || !Array.isArray(data) || data.length === 0) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少参数或数据为空" }));
    }
    
    // 1. 获取所有唯一键
    const importedUniqueKeys = data.map(item => item.unique_key);
    
    // 2. 批量查询现有数据
    const existingDataQuery = `SELECT unique_key, 日期, 公司, 银行, 摘要, 收入, 支出, 余额, 备注, 发票, 序号 FROM \`${tableName}\` WHERE user_id = ? AND unique_key IN (?)`;
    const queryResult = await pools({ 
      sql: existingDataQuery, 
      val: [userId, importedUniqueKeys], 
      isReturn: true 
    });
    
    // 确保existingData是数组类型
    const existingData = queryResult && Array.isArray(queryResult) ? queryResult : 
                       (queryResult && Array.isArray(queryResult.result) ? queryResult.result : []);
    
    // 3. 创建数据映射以便快速查找
    const existingDataMap = new Map();
    existingData.forEach(row => {
      if (row && row.unique_key) {
        existingDataMap.set(row.unique_key, row);
      }
    });
    
    // 4. 初始化计数器
    let insertedCount = 0;
    let updatedCount = 0;
    
    // 5. 处理每条记录
    for (const rowData of data) {
      const uniqueKey = rowData.unique_key;
      const existingRow = existingDataMap.get(uniqueKey);
      
      // 准备更新字段
      const updateFields = {
        '日期': rowData['日期'],
        '公司': rowData['公司'],
        '银行': rowData['银行'],
        '摘要': rowData['摘要'],
        '收入': rowData['收入'],
        '支出': rowData['支出'],
        '余额': rowData['余额'],
        '备注': rowData['备注'],
        '发票': rowData['发票'],
        '序号': rowData['序号']
      };
      
      if (!existingRow) {
        // 不存在则新增
        const insertSQL = `INSERT INTO \`${tableName}\` (user_id, unique_key, 日期, 公司, 银行, 摘要, 收入, 支出, 余额, 备注, 发票, 序号) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pools({ 
          sql: insertSQL, 
          val: [
            userId, 
            uniqueKey, 
            rowData['日期'],
            rowData['公司'],
            rowData['银行'],
            rowData['摘要'],
            rowData['收入'],
            rowData['支出'],
            rowData['余额'],
            rowData['备注'],
            rowData['发票'],
            rowData['序号']
          ], 
          isReturn: true 
        });
        insertedCount++;
      } else {
        // 存在则比较数据是否一致
        let hasChanges = false;
        for (const [field, value] of Object.entries(updateFields)) {
          if (existingRow[field] !== value) {
            hasChanges = true;
            break;
          }
        }
        
        if (hasChanges) {
          // 数据有变动才更新
          const updateSQL = `UPDATE \`${tableName}\` SET 日期 = ?, 公司 = ?, 银行 = ?, 摘要 = ?, 收入 = ?, 支出 = ?, 余额 = ?, 备注 = ?, 发票 = ?, 序号 = ? WHERE user_id = ? AND unique_key = ?`;
          await pools({ 
            sql: updateSQL, 
            val: [
              rowData['日期'],
              rowData['公司'],
              rowData['银行'],
              rowData['摘要'],
              rowData['收入'],
              rowData['支出'],
              rowData['余额'],
              rowData['备注'],
              rowData['发票'],
              rowData['序号'],
              userId,
              uniqueKey
            ], 
            isReturn: true 
          });
          updatedCount++;
        }
      }
    }
    
    // 6. 执行删除操作：删除数据库中存在但不在导入数据中的记录
    let deletedCount = 0;
    if (importedUniqueKeys.length > 0) {
      const countDeletedSQL = `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE user_id = ? AND unique_key NOT IN (?)`;
      const deletedCountQueryResult = await pools({ 
        sql: countDeletedSQL, 
        val: [userId, importedUniqueKeys], 
        isReturn: true 
      });
      // 确保正确获取删除记录数
      const deletedCountResult = deletedCountQueryResult && Array.isArray(deletedCountQueryResult) ? deletedCountQueryResult : 
                                (deletedCountQueryResult && Array.isArray(deletedCountQueryResult.result) ? deletedCountQueryResult.result : []);
      deletedCount = deletedCountResult[0]?.count || 0;
      
      const deleteSQL = `DELETE FROM \`${tableName}\` WHERE user_id = ? AND unique_key NOT IN (?)`;
      await pools({ 
        sql: deleteSQL, 
        val: [userId, importedUniqueKeys], 
        isReturn: true 
      });
    }
    
    // 7. 返回结果
    res.send(utils.returnData({
      code: 1,
      msg: `✅ 数据同步完成：新增 ${insertedCount} 条，更新 ${updatedCount} 条，删除 ${deletedCount} 条`,
      data: { 
        inserted: insertedCount, 
        updated: updatedCount, 
        deleted: deletedCount,
        total: data.length 
      }
    }));
  } catch (err) {
    console.error("❌ 同步数据出错:", err);
    if (!res.headersSent) {
      res.send(utils.returnData({ 
        code: 500, 
        msg: `❌ 数据同步失败: ${err.message || '未知错误'}` 
      }));
    }
  }
});

// 环亚---------------------------------------------------------
// 出纳表 - 批量同步数据（保留原功能）
router.post("/hy-upSettlementData", async (req, res) => {
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    
    const { tableName, data } = req.body;
    
    if (!tableName || !Array.isArray(data) || data.length === 0) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少参数或数据为空" }));
    }
    
    // 1. 获取所有唯一键
    const importedUniqueKeys = data.map(item => item.unique_key);
    
    // 2. 批量查询现有数据
    const existingDataQuery = `SELECT unique_key, 日期, 公司, 银行, 摘要, 收入, 支出, 余额, 备注, 发票, 序号 FROM \`${tableName}\` WHERE user_id = ? AND unique_key IN (?)`;
    const queryResult = await pools({ 
      sql: existingDataQuery, 
      val: [userId, importedUniqueKeys], 
      isReturn: true 
    });
    
    // 确保existingData是数组类型
    const existingData = queryResult && Array.isArray(queryResult) ? queryResult : 
                       (queryResult && Array.isArray(queryResult.result) ? queryResult.result : []);
    
    // 3. 创建数据映射以便快速查找
    const existingDataMap = new Map();
    existingData.forEach(row => {
      if (row && row.unique_key) {
        existingDataMap.set(row.unique_key, row);
      }
    });
    
    // 4. 初始化计数器
    let insertedCount = 0;
    let updatedCount = 0;
    
    // 5. 处理每条记录
    for (const rowData of data) {
      const uniqueKey = rowData.unique_key;
      const existingRow = existingDataMap.get(uniqueKey);
      
      // 准备更新字段
      const updateFields = {
        '日期': rowData['日期'],
        '公司': rowData['公司'],
        '银行': rowData['银行'],
        '摘要': rowData['摘要'],
        '收入': rowData['收入'],
        '支出': rowData['支出'],
        '余额': rowData['余额'],
        '备注': rowData['备注'],
        '发票': rowData['发票'],
        '序号': rowData['序号']
      };
      
      if (!existingRow) {
        // 不存在则新增
        const insertSQL = `INSERT INTO \`${tableName}\` (user_id, unique_key, 日期, 公司, 银行, 摘要, 收入, 支出, 余额, 备注, 发票, 序号) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        await pools({ 
          sql: insertSQL, 
          val: [
            userId, 
            uniqueKey, 
            rowData['日期'],
            rowData['公司'],
            rowData['银行'],
            rowData['摘要'],
            rowData['收入'],
            rowData['支出'],
            rowData['余额'],
            rowData['备注'],
            rowData['发票'],
            rowData['序号']
          ], 
          isReturn: true 
        });
        insertedCount++;
      } else {
        // 存在则比较数据是否一致
        let hasChanges = false;
        for (const [field, value] of Object.entries(updateFields)) {
          if (existingRow[field] !== value) {
            hasChanges = true;
            break;
          }
        }
        
        if (hasChanges) {
          // 数据有变动才更新
          const updateSQL = `UPDATE \`${tableName}\` SET 日期 = ?, 公司 = ?, 银行 = ?, 摘要 = ?, 收入 = ?, 支出 = ?, 余额 = ?, 备注 = ?, 发票 = ?, 序号 = ? WHERE user_id = ? AND unique_key = ?`;
          await pools({ 
            sql: updateSQL, 
            val: [
              rowData['日期'],
              rowData['公司'],
              rowData['银行'],
              rowData['摘要'],
              rowData['收入'],
              rowData['支出'],
              rowData['余额'],
              rowData['备注'],
              rowData['发票'],
              rowData['序号'],
              userId,
              uniqueKey
            ], 
            isReturn: true 
          });
          updatedCount++;
        }
      }
    }
    
    // 6. 执行删除操作：删除数据库中存在但不在导入数据中的记录
    let deletedCount = 0;
    if (importedUniqueKeys.length > 0) {
      const countDeletedSQL = `SELECT COUNT(*) as count FROM \`${tableName}\` WHERE user_id = ? AND unique_key NOT IN (?)`;
      const deletedCountQueryResult = await pools({ 
        sql: countDeletedSQL, 
        val: [userId, importedUniqueKeys], 
        isReturn: true 
      });
      // 确保正确获取删除记录数
      const deletedCountResult = deletedCountQueryResult && Array.isArray(deletedCountQueryResult) ? deletedCountQueryResult : 
                                (deletedCountQueryResult && Array.isArray(deletedCountQueryResult.result) ? deletedCountQueryResult.result : []);
      deletedCount = deletedCountResult[0]?.count || 0;
      
      const deleteSQL = `DELETE FROM \`${tableName}\` WHERE user_id = ? AND unique_key NOT IN (?)`;
      await pools({ 
        sql: deleteSQL, 
        val: [userId, importedUniqueKeys], 
        isReturn: true 
      });
    }
    
    // 7. 返回结果
    res.send(utils.returnData({
      code: 1,
      msg: `✅ 数据同步完成：新增 ${insertedCount} 条，更新 ${updatedCount} 条，删除 ${deletedCount} 条`,
      data: { 
        inserted: insertedCount, 
        updated: updatedCount, 
        deleted: deletedCount,
        total: data.length 
      }
    }));
  } catch (err) {
    console.error("❌ 同步数据出错:", err);
    if (!res.headersSent) {
      res.send(utils.returnData({ 
        code: 500, 
        msg: `❌ 数据同步失败: ${err.message || '未知错误'}` 
      }));
    }
  }
});

// 获取出纳结算数据
router.post("/hy-getSettlementData", async (req, res) => {
  // 参考 getCashRecords 的过滤与分页模式
  console.log("getSettlementData", req.body);
  const obj = req.body || {};

  // 登录用户
  const user = await utils.getUserRole(req, res);
  const userId = user.user.id;

  // 兼容两种前端传参形式：selectedCompanyBank/dateRange 与 data 结构
  const selectedCompanyBank = obj.selectedCompanyBank || [];
  const dateRange = obj.dateRange || [];
  const data = obj.data || {};

  const company = data.company ?? selectedCompanyBank[0];
  const bank = data.bank ?? selectedCompanyBank[1];
  const summary = data.summary ?? undefined;
  const dateFrom = data.dateFrom ?? dateRange[0];
  const dateTo = data.dateTo ?? dateRange[1];

  // 基础查询：使用 LEFT JOIN 标注美团对账状态，避免模板字符串中的反引号造成解析问题
  let sql = 'SELECT q.*, ' +
    "CASE WHEN mt.`sp订单号` IS NOT NULL THEN '美团˙已对账' ELSE NULL END AS `对账状态` " +
    'FROM `hy-cw-gl` q ' +
    'LEFT JOIN `hy-cw-mt` mt ON mt.`sp订单号` = q.`运力主单ID` ' +
    'WHERE q.user_id = ' + userId;
  // 模糊匹配
  sql = utils.setLike(sql, '公司', company);
  sql = utils.setLike(sql, '银行', bank);
  sql = utils.setLike(sql, '摘要', summary);
  // 日期区间
  if (dateFrom) sql += ` AND 日期 >= '${dayjs(dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
  if (dateTo) sql += ` AND 日期 <= '${dayjs(dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;

  // 排序 + 分页
  sql += ' ORDER BY q.id ASC';
  const page = Number(data.page) || 1;
  const size = Number(data.size) || 1000;
  // 统计总数：传入正确的表名（包含反引号，避免连字符导致的解析错误）
  let { total } = await utils.getSum({ sql: sql.replace(/\bq\./g, ''), name: '`hy-cw-gl`', res, req });
  sql = utils.pageSize(sql, page, size);

  const { result } = await pools({ sql, res, req });
  // 保持前端兼容：返回 data 为数组
  res.send(utils.returnData({ data: result, total }));
});

// 获取出纳表公司、银行
router.post("/hy-getSettlementCompanyBank", async (req, res) => {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
  const sql = `SELECT DISTINCT 公司,银行 FROM \`pt_cw_zjmxb\` where user_id = ${userId} AND 公司 IS NOT NULL AND 公司 <> '' AND 银行 IS NOT NULL AND 银行 <> ''`;
  // const sql = `SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  const { result } = await pools({ sql, res });
  res.send(utils.returnData({ data: result }));
});

// 出纳表 - 更新单条记录
router.post("/hy-updateSettlementData", async (req, res) => {
    console.log(req.body);
  try {
    // 获取登录用户信息
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
    const moreId = user.user.moreId;
    const rolesId = user.user.rolesId;

    const { tableName, data } = req.body;
    
    if (!tableName || !data || !data.id) {
      return res.send(utils.returnData({ code: 400, msg: "❌ 缺少必要参数" }));
    }
    
    // 执行更新（同时写入 roles_id、more_id）
    const updateSQL = `UPDATE \`${tableName}\` SET unique_key = ?, 日期 = ?, 公司 = ?, 银行 = ?, 摘要 = ?, 收入 = ?, 支出 = ?, 余额 = ?, 备注 = ?, 发票 = ?, 序号 = ?, roles_id = ?, more_id = ? WHERE user_id = ? AND id = ?`;
    await pools({ 
      sql: updateSQL, 
      val: [
        data['unique_key'] || '',
        data['日期'] || '',
        data['公司'] || '',
        data['银行'] || '',
        data['摘要'] || '',
        data['收入'] || 0,
        data['支出'] || 0,
        data['余额'] || 0,
        data['备注'] || '',
        data['发票'] || '',
        data['序号'] || '',
        rolesId ?? '',
        moreId ?? null,
        userId,
        data.id || ''

      ], 
      isReturn: true 
    });
    
    res.send(utils.returnData({ code: 1, msg: "✅ 更新成功" }));
  } catch (err) {
    console.error("❌ 更新数据出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});

// 获取最大 id
router.post("/hy-getMaxId", async (req, res) => {
    try {
      const tableName = req.body.tableName || 'pt-cw-zjmxb';
      const sql = `SELECT MAX(id) AS maxId FROM \`${tableName}\``;
      const data = await pools({ sql, isReturn: true });
      res.send(utils.returnData({ code: 1, msg: "✅ 获取成功", data: data.result[0].maxId+1 || 0 }));
    } catch (err) {
      res.send(utils.returnData({ code: 500, msg: `❌ 获取失败: ${err.message || '未知错误'}` }));
    }
});




export default router;
  
