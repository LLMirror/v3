import express from 'express';
import utils from '../utils/index.js';
import config from '../utils/config.js';
import pools from '../utils/pools.js';
import fs from 'fs';
import path from 'path';
import {fileAdmins} from '../utils/menuString.js';

const router = express.Router();

//添加文件
router.post("/addFile", async (req, res) => {
    let sql = "INSERT INTO files(val,type) VALUES (?,?)",
        obj = req.body;
    await pools({sql,val:[obj.val, obj.type],run:false,res,req});
});

//查询图片
router.post("/getImg", async (req, res) => {
    let sql = `SELECT id,val,update_time AS updateTime,create_time AS createTime FROM files WHERE type=1`,obj=req.body;
    sql=utils.setAssign(sql,'id',obj.id);
    let {total}=await utils.getSum({sql,name:"files",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});
//查询文件
router.post("/getFile", async (req, res) => {
    let sql = `SELECT id,val,update_time AS updateTime,create_time AS createTime FROM files WHERE type=2`,obj=req.body;
    sql=utils.setAssign(sql,'id',obj.id);
    let {total}=await utils.getSum({sql,name:"files",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});
//修改文件
router.post("/upFile", async (req, res) => {
    let sql = "UPDATE  files SET val=? WHERE id=?",
        obj = req.body;
    await pools({sql,val:[obj.val,obj.id],run:false,res,req});
});
//删除文件
router.post("/delFile", async (req, res) => {
    let sql = "DELETE FROM files WHERE id=?",
        obj = req.body;
    await pools({sql,val:[obj.id],run:false,res,req});
});

//添加富文本
router.post("/addDitor", async (req, res) => {
    let sql = "INSERT INTO ditor(val) VALUES (?)",
        obj = req.body;
    await pools({sql,val:[obj.val],run:false,res,req});
});

//查询富文本
router.post("/getDitor", async (req, res) => {
    let sql = `SELECT id,val,update_time AS updateTime,create_time AS createTime FROM ditor WHERE 1=1`,obj=req.body;
    sql=utils.setAssign(sql,'id',obj.id);
    let {total}=await utils.getSum({sql,name:"ditor",res,req});
    sql+=` ORDER BY id DESC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});

//修改富文本
router.post("/upDitor", async (req, res) => {
    let sql = "UPDATE  ditor SET val=? WHERE id=?",
        obj = req.body;
    await pools({sql,val:[obj.val,obj.id],run:false,res,req});
});

//删除富文本
router.post("/delDitor", async (req, res) => {
    let sql = "DELETE FROM ditor WHERE id=?",
        obj = req.body;
    await pools({sql,val:[obj.id],run:false,res,req});
});

//查询图片管理菜单
router.post("/getFileMenu", async (req, res) => {
    let sql = `SELECT id,name,sort,update_time AS updateTime,create_time AS createTime FROM file_menu WHERE 1=1`,obj=req.body;
    if(obj.isMore){
        let user = await utils.getUserInfo({req, res})
        sql=utils.setMoreId(sql,user);
    }
    sql+=` ORDER BY sort ASC, create_time DESC`;
    await pools({sql,res,req,run:false});
});

//添加图片管理菜单
router.post("/addFileMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[fileAdmins.menu.fileMenuAdd]});
    let sql = "INSERT INTO file_menu(name,more_id,sort) VALUES (?,?,?)",
        obj = req.body;
    await utils.existName({sql: "SELECT id FROM file_menu WHERE  name=?", name: obj.name,res,msg:"分类名称已存在！",req});
    let user = await utils.getUserInfo({req, res})
    await pools({sql,val:[obj.name,obj.isMore?user.moreId||null:null,obj.sort],run:false,res,req});
});

//修改图片管理菜单
router.post("/upFileMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[fileAdmins.menu.fileMenuUp]});
    let sql = "UPDATE  file_menu SET name=?,sort=? WHERE id=?",
        obj = req.body;
    let judgeUserNameRes = await utils.judgeUserName({sql:"SELECT name FROM file_menu WHERE  id=?",sqlName:"name",name:obj.name,id:obj.id,req,res});
    if(judgeUserNameRes===1)await utils.existName({sql:"SELECT id FROM file_menu WHERE name=?",name:obj.name,res,msg:"分类名称已存在！",req});
    await pools({sql,val:[obj.name,obj.sort,obj.id],run:false,res,req});
});

//删除图片管理菜单
router.post("/delFileMenu", async (req, res) => {
    await utils.checkPermi({req,res,role:[fileAdmins.menu.fileMenuDelete]});
    let sql = "DELETE FROM file_menu WHERE id=?",
        obj = req.body;
    let sql2="SELECT url FROM file_box WHERE menu_id=?"
    let {result}=await pools({sql:sql2,val:[obj.id],res,req});
    if(result.length>0) return res.send(utils.returnData({code:-1,msg:"该菜单下还有图片，无法删除"}))
    //如果放开，将删除对应名称文件夹以及里面所有文件，影响很大。因为修改分类名称，图片并不会相对于修改，再删除将可能删全部错图片。
    // try {
    //     const menuName=await utils.getFileMenu(req);
    //     if(!menuName) return ;
    //     const folderPath = path.join(config.fileSite, menuName);
    //     fs.rmSync(folderPath, { recursive: true, force: true });
    // }catch (e) {
    //     console.log("文件夹删除错误",e);
    // }
    await pools({sql,val:[obj.id],run:false,res,req});

});

//查询图片管理列表
router.post("/getFileBox", async (req, res) => {
    let sql = `SELECT id,url,name,menu_id AS menuId,update_time AS updateTime,create_time AS createTime FROM file_box WHERE 1=1`,obj=req.body;
    sql=utils.setAssign(sql,"menu_id",obj.menuId);
    sql=utils.setLike(sql,"name",obj.name);
    if(obj.moreFileNum) sql=utils.setAssign(sql,"type",obj.moreFileNum);
    if(obj.isMore){
        let user = await utils.getUserInfo({req, res})
        sql=utils.setMoreId(sql,user);
    }
    let {total}=await utils.getSum({sql,name:"file_box",res,req});
    sql+=` ORDER BY id ASC`;
    sql=utils.pageSize(sql,obj.page,obj.size);
    let {result}=await pools({sql,res,req});
    res.send(utils.returnData({ data: result ,total}));
});

//添加图片管理列表
router.post("/addFileBox", async (req, res) => {
    await utils.checkPermi({req,res,role:[fileAdmins.file.fileAdd]});
    let sql = "INSERT INTO file_box(`url`,`name`,`menu_id`,`type`,`more_id`) VALUES ?",
        obj = req.body;
    let user = await utils.getUserInfo({req, res})
    let arr=obj.imgArr.reduce((res,item)=>{
        res.push([item.url,item.originalname,item.menuId,item.type,obj.isMore?user.moreId||null:null])
        return res
    },[])
    await pools({sql,val:[arr],run:false,res,req});
});

//删除图片管理图片
router.post("/delFileBox", async (req, res) => {
    await utils.checkPermi({req,res,role:[fileAdmins.file.fileDelete]});
    let sql = "DELETE FROM file_box WHERE id IN (?)",
        obj = req.body;
    try {
        let sql2=`SELECT url FROM file_box WHERE id IN (?)`;
        let {result}=await pools({sql:sql2,val:[obj.id],res,req});
        const pathArr=result.map(item=>item.url);
        pathArr.map(file => {
            const filePath = path.join(config.fileSite, file);
            fs.unlink(filePath, (err) => {})
        });
    }catch (e) {
        console.log(e,"删除本地图片失败，看情况处理")
    }
    await pools({sql,val:[obj.id],run:false,res,req});
});




export default router;
