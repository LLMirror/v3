import multer from "multer";
import config from './config.js';
import utils from "./index.js";
import fs from "fs";
import path from "path";
//获取目前日期
const getToday=()=>{
    const today = new Date();
    const year = today.getFullYear();
    // 月份从0开始，所以要加1
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return {year,month,day,dayStr:`${year}${month}${day}`};
}

//上传的文件保存在 upload
const storage = multer.diskStorage({
    //存储的位置
    async destination(req, file, cb){
        // cb(null, config.fileSite);
        // 获取当前日期
        let {dayStr}=getToday();
        const menuName=await utils.getFileMenu(req);
        if(menuName) dayStr=menuName;
        // 构建文件夹路径
        const folderPath = path.join(config.fileSite, dayStr);
        // 检查文件夹是否存在，如果不存在则创建
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
        // 将文件存储到该文件夹中
        cb(null, folderPath);
    },
    //文件名字的确定 multer默认帮我们取一个没有扩展名的文件名，因此需要我们自己定义
    filename(req, file, cb){
        //处理中文名字乱码问题
        const original_name = Buffer.from(file.originalname, "latin1").toString("utf8");
        let math=Math.random();
        math=math.toString().replace(".","");//随机字符串
        cb(null, `${Date.now()}${math}-${original_name}`)
    }
});
//传入storage 除了这个参数我们还可以传入dest等参数
let upload = multer({
    storage
}).array(config.fileName);
//上传总函数
let fileEvent=(req,res)=>{
    return new Promise((resolve)=>{
        upload(req, res, async function  (err) {
            if (err) return res.send(utils.returnData({code:-1,msg:"上传文件错误~",req,err}));
            try{
                //循环处理
                let imgPath=[];
                for (const files of req.files) {
                    const regex = /^(.+)\.[^.]+$/;
                    const regexRes = files.originalname.match(regex);
                    let name="";
                    let {dayStr}=getToday();
                    const menuName=await utils.getFileMenu(req);
                    if(menuName) dayStr=menuName;
                    if (regexRes) name=Buffer.from(regexRes[1], "latin1").toString("utf8");
                    //获取临时文件的存储路径
                    imgPath.push({url:`/${dayStr}/${files.filename}`,name,originalname:Buffer.from(files.originalname, "latin1").toString("utf8"),filename:files.filename,folderName:dayStr});
                }
                resolve(imgPath)
            }catch(err){
                res.send(utils.returnData({code:-1,msg:"上传文件错误~",req,err}));
            }
        });
    });
};
export default fileEvent;
