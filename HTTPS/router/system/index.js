import express from 'express';
import utils from '../../utils/index.js';
import {systemSettings} from '../../utils/menuString.js';
import pools from '../../utils/pools.js';
import svgCaptcha from 'svg-captcha';

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


export default router;
