import express from 'express';
import utils from '../utils/index.js';
import fileEvent from '../utils/file.js'
import {primary} from '../utils/roleString.js';
import pools from '../utils/pools.js';
import xlsx from 'node-xlsx';
import path from 'path';

const router = express.Router();

//添加测试账号
router.post("/addTests", async (req, res) => {
	let sql = "INSERT INTO tests(name,remark,more_id) VALUES (?,?,?)",
		obj = req.body;
	let user = await utils.getUserInfo({req, res});
	let moreId=user.moreId;
	//演示需要，总管理默认5
	if(user.admin===1) moreId=5;
	await pools({sql,val:[obj.name, obj.remark,moreId],run:false,res,req});
});

//查询测试账号
router.post("/getTests", async (req, res) => {
	let user = await utils.getUserInfo({req, res}),obj=req.body;
	let sql = `SELECT id,name,more_id AS moreId,remark,update_time AS updateTime,create_time AS createTime FROM tests WHERE 1=1`;
	sql=utils.setLike(sql,"name",obj.name);
	sql=utils.setMoreId(sql,user);
	let {total}=await utils.getSum({sql,name:"tests",res,req});
	sql+=` ORDER BY id DESC`;
	sql=utils.pageSize(sql,obj.page,obj.size);
	let {result}=await pools({sql,res,req});
	res.send(utils.returnData({ data: result ,total}));
});

//修改测试账号
router.post("/upTests", async (req, res) => {
	let sql = "UPDATE  tests SET name=?,remark=? WHERE id=?",
		obj = req.body;
	await pools({sql,val:[obj.name, obj.remark, obj.id],run:false,res,req});
});

//删除测试账号
router.post("/delTests", async (req, res) => {
	let sql = "DELETE FROM tests WHERE id=?",
		obj = req.body;
	await pools({sql,val:[obj.id],run:false,res,req});
});

//测试菜单接口权限
router.post("/checkMenu",async (req,res)=>{
	//需要有roleKey1 这个菜单权限才能请求！
	await utils.checkPermi({role:["roleKey1"],res,req});
	res.send(utils.returnData({data:{msg:"请求成功了！"}}));
});
//测试角色接口权限
router.post("/checkRole",async (req,res)=>{
	//需要有primary 这个角色权限才能请求！
	await utils.checkRole({req,res,role:[primary]});
	res.send(utils.returnData({data:{msg:"请求成功了！"}}));
});


//导入数据
router.post("/importTests",async (req,res)=>{
	let sql = "INSERT INTO tests(`name`,`remark`,`more_id`) VALUES ?";
	let fileArr=await fileEvent(req,res);
	let filename=fileArr[0].filename;
	//配置获取文件路径
	let xlsxRes = xlsx.parse(`${path.join(__dirname, '../','public/')}${filename}`, { cellDates: true });
	let list=xlsxRes[0].data;
	list.splice(0,1);
	await pools({sql,val:[list],run:false,res,req,msg:"请确认文档导入值没有问题！！！"});
});

//下载模板
router.post("/downloadTemplate",async (req,res)=>{
	let data =[ ['名称','备注','多账户编号']];
	let buffer = xlsx.build([{name:'sheet1',data}]);
	const filename = '测试模板.xlsx';
	const encodedFilename = encodeURI(filename);
	res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;filename='+encodedFilename);
	res.send(buffer);
});

//导出数据
router.post("/exportTest",async (req,res)=>{
	let user = await utils.getUserInfo({req, res}),obj=req.body;
	let sql = `SELECT id,name,more_id,remark FROM tests WHERE 1=1`;
	sql=utils.setLike(sql,"name",obj.name);
	sql=utils.setMoreId(sql,user);
	sql+=` ORDER BY id DESC`;
	sql=utils.pageSize(sql,obj.page,obj.size);
	let {result}=await pools({sql,res,req});
	let data =[ ['编号','名称','多账户编号','备注']];
	result.map(t=>{
		data.push(Object.values(t))
	})
	let buffer = xlsx.build([{name:'sheet1',data}]);
	const filename = '测试数据.xlsx';
	const encodedFilename = encodeURI(filename);
	res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;filename='+encodedFilename);
	res.send(buffer);
});

//添加合作联系方式
router.post("/addCooperation", async (req, res) => {
	let sql = "INSERT INTO cooperation(name,wechat,remark) VALUES (?,?,?)",
		obj = req.body;
	await pools({sql,val:[obj.name, obj.wechat, obj.remark||''],run:false,res,req});
});

export default router;
