import { UAParser } from 'ua-parser-js';
import os from 'os';
import pools from './pools.js';
import wsService from './webSocket.js';

export default {
  setLogs:async ({req,res,user})=>{
    const {url,baseUrl}=req;
    const path=baseUrl+url;
    //只记录指定请求
    const filterList=['/system/changeMenu','/system/delMenu','/system/upRoles','/system/delRoles','/system/upTheme','/system/upUser','/system/upUserInfo','/system/upUserPwdInfo','/system/upUserPwd','/system/upUserInfo','/system/delUser','/system/upMore','/system/delMore','/system/upDict','/system/delDict','/system/upDictItem','/system/delDictItem','/components/upFileMenu','/components/delFileMenu','/components/delFileBox'];
    if(!filterList.includes(path)) return;
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();
    let sql = "INSERT INTO logs(name,user_id,browser,system_name,host,port) VALUES (?,?,?,?,?,?)";
    let host = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '';
    // 如果有代理服务器，可以从headers中的x-forwarded-for获取原始客户端IP
    if (req.headers['x-forwarded-for'])host = req.headers['x-forwarded-for'].split(',')[0];
    await pools({sql,val:[user.name ,user.id,result.browser.name||'',os.type()||'',host,url],res,req});
    wsService.broadcast({code:1,msgCode:201,msg:"有一条新的高风险操作信息！！！请点击查看"})
  }
};