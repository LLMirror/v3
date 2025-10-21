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



const router = express.Router();

//获取图形二维码
router.post("/getCaptcha", async (req, res) => {
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
//添加用户
router.post("/addUser", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.user.userAdd]});
    let sql = "INSERT INTO user(name,status,roles_id,remark,pwd,more_id,url) VALUES (?,?,?,?,?,?,?)", obj = req.body;
    await utils.existName({sql: "SELECT id FROM user WHERE  name=?", name: obj.name,res,msg:"用户名已被使用！",req});
    let {result}=await pools({sql,val:[obj.name, obj.status,obj.rolesId, obj.remark, obj.pwd, obj.moreId,obj.url||""],res,req});
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
    let sql = `SELECT a.id AS id,name,status,roles_id AS rolesId,remark,admin,more_id AS moreId,url,a.update_time AS updateTime,a.create_time AS createTime,b.menu_bg AS menuBg,b.menu_sub_bg AS menuSubBg,b.menu_text AS menuText,b.menu_active_text AS menuActiveText,b.menu_sub_active_text AS menuSubActiveText,b.menu_hover_bg AS menuHoverBg,b.el_theme AS elTheme,b.el_bg AS elBg,b.el_text AS elText FROM user AS a LEFT JOIN theme b ON a.id=b.user_id WHERE 1=1`;
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
    let sql = "UPDATE  user SET name=?,status=?,roles_id=?,remark=?,more_id=?,url=? WHERE id=?", obj = req.body;
    //总管理不能操作
    await utils.upAdmin({req,res,id:obj.id});
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM user WHERE  id=?",name:obj.name,id:obj.id,req,res});
    if (judgeUserNameRes === 1) await utils.existName({sql: "SELECT id FROM user WHERE  name=?", name: obj.name,res,msg:"用户名已被使用！",req});
    await pools({sql,val:[obj.name, obj.status,obj.rolesId, obj.remark, obj.moreId, obj.url,obj.id],res,req,run:false});
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
    let sql = "INSERT INTO more(name,remark) VALUES (?,?)", obj = req.body;
    await utils.existName({sql: "SELECT id FROM more WHERE  name=?", name: obj.name,res,msg:"账号名已存在！",req});
    await pools({sql,val:[obj.name, obj.remark],res,req,run:false});
});
//查询多账号
router.post("/getMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreQuery]});
    let obj=req.body;
    let sql = `SELECT id,name,remark,update_time AS updateTime,create_time AS createTime FROM more WHERE 1=1`;
    sql=utils.setLike(sql,"name",obj.name);
    let {total}=await utils.getSum({sql,name:"more",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));

});
//查询多账号 全部
router.post("/getMoreAll", async (req, res) => {
    let sql = "SELECT id,name,remark FROM more";
    await pools({sql,res,req,run:false});
});
//修改多账号
router.post("/upMore", async (req, res) => {
    await utils.checkPermi({req,res,role:[systemSettings.more.moreUp]});
    let sql = "UPDATE  more SET name=?,remark=? WHERE id=?", obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM more WHERE  id=?",sqlName:"name",name:obj.name,id:obj.id,req,res});
    if(judgeUserNameRes===1)await utils.existName({sql:"SELECT id FROM more WHERE name=?",name:obj.name,res,msg:"多账号名称已存在！",req});
    await pools({sql,val:[obj.name, obj.remark, obj.id],res,req,run:false});
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
                    sql: `SELECT MAX(seq) AS maxSeq FROM cash_records WHERE company=? AND bank=?`,
                    val: [company, bank],
                    res, req
                });
                let currentSeq = (maxSeqResult.result[0]?.maxSeq || 0);
                
                // 批量插入SQL
                let insertSql = `INSERT INTO cash_records
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
                sql: `SELECT MAX(seq) AS maxSeq FROM cash_records WHERE company=? AND bank=?`,
                val: [obj.data.company, obj.data.bank],
                res, req
            });
            const seq = (maxSeqResult.result[0]?.maxSeq || 0) + 1;

            // 插入新纪录（余额暂时置 0，后面统一更新）
            await pools({
                sql: `INSERT INTO cash_records
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
        sql: `SELECT company, bank FROM cash_records WHERE id=?`,
        val: [obj.data.id],
        res, req
    });
    if (!recordRes.result.length) {
        return res.send(utils.returnData({ code: 500, msg: '记录不存在' }));
    }
    const { company, bank } = recordRes.result[0];

    // 删除记录
    await pools({ sql: `DELETE FROM cash_records WHERE id=?`, val: [obj.data.id], res, req });

    await pools({
        sql: `UPDATE cash_records c
          JOIN (
              SELECT id, @rownum := @rownum + 1 AS new_seq
              FROM cash_records, (SELECT @rownum := 0) r
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
        sql: `UPDATE cash_records 
              SET date=?, company=?, bank=?, summary=?, income=?, expense=?, remark=?, invoice=? 
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
    const obj = req.body;

    let sql = `SELECT id, seq, LEFT(date, 10) AS date, company, bank, summary, income, expense, balance, remark, invoice, created_by AS createdBy, created_at AS createdAt
               FROM cash_records WHERE 1=1`;
    sql = utils.setLike(sql, 'company', obj.data.company);
    sql = utils.setLike(sql, 'bank', obj.data.bank);
    sql = utils.setLike(sql, 'summary', obj.data.summary);
    if (obj.data.dateFrom) sql += ` AND date >= '${dayjs(obj.data.dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (obj.data.dateTo) sql += ` AND date <= '${dayjs(obj.data.dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;

    let { total } = await utils.getSum({ sql, name: 'cash_records', res, req });
    sql += ' ORDER BY seq DESC';
    sql = utils.pageSize(sql, obj.data.page, obj.data.size);

    const { result } = await pools({ sql, res, req });
    res.send(utils.returnData({ data: result, total }));
});

/** 公共函数：重新计算余额 - 优化版本 */
async function recalcBalances(company, bank, res, req) {
    try {
        // 1. 首先获取所有记录
        const recordsRes = await pools({
            sql: `SELECT id, income, expense FROM cash_records 
                  WHERE company=? AND bank=? ORDER BY seq ASC`,
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
        let sql = "INSERT INTO cash_records (balance, id) VALUES";
        const placeholders = [];
        const values = [];
        
        updateValues.forEach(([bal, id], index) => {
            if (index > 0) sql += ",";
            sql += " (?, ?)";
            values.push(bal, id);
        });
        
        sql += " ON DUPLICATE KEY UPDATE balance = VALUES(balance)";
        
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
    let sql = `SELECT seq, date, company, bank, income, expense FROM cash_records WHERE 1=1`;
    sql = utils.setLike(sql, 'company', obj.data.company);
    sql = utils.setLike(sql, 'bank', obj.data.bank);
    if (obj.data.dateFrom) sql += ` AND date >= '${dayjs(obj.data.dateFrom).format('YYYY-MM-DD HH:mm:ss')}'`;
    if (obj.data.dateTo) sql += ` AND date <= '${dayjs(obj.data.dateTo).format('YYYY-MM-DD HH:mm:ss')}'`;
    sql += ` ORDER BY company, bank, seq ASC`;

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




/** 获取公司列表 */
router.post('/getCompanyList', async (req, res) => {
    const sql = `SELECT DISTINCT company FROM cash_records ORDER BY company`;
    const { result } = await pools({ sql, res, req });
    const data = result.map(r => r.company);
    res.send(utils.returnData({ data }));
});

/** 获取银行列表 */
router.post('/getBankList', async (req, res) => {
    const sql = `SELECT DISTINCT bank FROM cash_records ORDER BY bank`;
    const { result } = await pools({ sql, res, req });
    const data = result.map(r => r.bank);
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

    let sql = `SELECT DISTINCT summary 
               FROM cash_records 
               WHERE summary IS NOT NULL AND summary <> ''`;
    const params = [];

    if (company) {
      sql += ` AND company = ?`;
      params.push(company);
    }

    if (bank) {
      sql += ` AND bank = ?`;
      params.push(bank);
    }

    if (summary) {
      sql += ` AND summary LIKE ?`;
      params.push(`%${summary}%`);
    }

    sql += ` LIMIT 100`; // 排序并限制 100 条

    console.log('SQL:', sql, 'params:', params);

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

    // ✅ 构造插入数据
    const values = data.map(row => {
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
        { tableNames: ['pt-cw-zjmxb', '财务', '收支'], fields: ['日期', '摘要', '收入', '支出','备注'] },
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
        const defaultKeyFields = ['日期', '摘要', 'ID', '编号', '名称', '金额', '数量'];
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

      // user_id + 所有字段值 + name + unique_key
      const rowValues = [userId, ...keys.map(k => cleanRow[k] ?? ""),  uniqueKey];
      return rowValues;
    });

    // ✅ 插入字段 - 确保包含name字段
    const allFields = ["user_id", ...keys,"unique_key"].map(f => `\`${f}\``).join(",");
    

    // 每行占位符精确计算 - 增加name字段的占位符
    const rowPlaceholder = "(" + Array(1 + keys.length  + 1).fill("?").join(",") + ")";

    // 拼接 SQL
    const sql = `
      INSERT INTO \`${tableName}\` (${allFields})
      VALUES ${values.map(() => rowPlaceholder).join(",")}
      ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)
    `;

    // 执行 SQL
    await pools({ sql, val: values.flat(), res, req });

    res.send(utils.returnData({
      code: 1,
      msg: `✅ 成功导入 ${data.length} 条记录（重复将自动忽略）`,
      data: { count: data.length }
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
  // 公司 银行 有则查询 无责查询全部
  console.log(req.body);
  // 从selectedCompanyBank数组中提取公司和银行
  const selectedCompanyBank = req.body.selectedCompanyBank || [];
  const company = selectedCompanyBank[0]; // 第一个元素是公司
  const bank = selectedCompanyBank[1]; // 第二个元素是银行
  const user = await utils.getUserRole(req, res);
  const userId = user.user.id;
  
  const sql = `SELECT  日期,摘要,收入,支出,余额,备注,发票 FROM \`pt-cw-zjmxb\` WHERE user_id = ${userId} ${company ? `AND 公司 = '${company}'` : ''} ${bank ? `AND 银行 = '${bank}'` : ''} ORDER BY id ASC `;
  // const sql = `SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  const { result } = await pools({ sql, res });
  res.send(utils.returnData({ data: result }));
});

// 获取出纳表公司、银行
router.post("/getSettlementCompanyBank", async (req, res) => {
    const user = await utils.getUserRole(req, res);
    const userId = user.user.id;
  const sql = `SELECT DISTINCT 公司,银行 FROM \`pt-cw-zjmxb\` where user_id = ${userId} `;
  // const sql = `SELECT * FROM \`${tableName}\` ORDER BY id ASC LIMIT 5000`;
  const { result } = await pools({ sql, res });
  res.send(utils.returnData({ data: result }));
});

// 出纳表变更
router.post("/upSettlementData", async (req, res) => {
  console.log("📥 upSettlementData");

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

    // ✅ 构造插入数据
    const values = data.map(row => {
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
        { tableNames: ['finance_2025_10', '财务', '收支'], fields: ['日期', '摘要', '收入', '支出','备注'] },
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
        const defaultKeyFields = ['日期', '摘要', 'ID', '编号', '名称', '金额', '数量'];
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

      // user_id + 所有字段值 + name + unique_key
      const rowValues = [userId, ...keys.map(k => cleanRow[k] ?? ""),  uniqueKey];
      return rowValues;
    });

    // ✅ 插入字段 - 确保包含name字段
    const allFields = ["user_id", ...keys,"unique_key"].map(f => `\`${f}\``).join(",");
    

    // 每行占位符精确计算 - 增加name字段的占位符
    const rowPlaceholder = "(" + Array(1 + keys.length  + 1).fill("?").join(",") + ")";

    // 拼接 SQL
    const sql = `
      INSERT INTO \`${tableName}\` (${allFields})
      VALUES ${values.map(() => rowPlaceholder).join(",")}
      ON DUPLICATE KEY UPDATE created_at = VALUES(created_at)
    `;

    // 执行 SQL
    await pools({ sql, val: values.flat(), res, req });

    res.send(utils.returnData({
      code: 1,
      msg: `✅ 成功导入 ${data.length} 条记录（重复将自动忽略）`,
      data: { count: data.length }
    }));
  } catch (err) {
    console.error("❌ 导入 Excel 出错:", err);
    res.send(utils.returnData({ code: 500, msg: err.message }));
  }
});


export default router;
