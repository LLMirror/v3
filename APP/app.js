import express from 'express';
import bodyparser from 'body-parser';
import cors from 'cors';
import utils from './utils/index.js';
import config from '././utils/config.js';
import wsService from './utils/webSocket.js';
import requestWhite from './utils/requestWhite.js';
import './utils/schedule.js';
import { errLog } from './utils/err.js';
import logs from './utils/logs.js';


wsService.init({
  port: config.socketPort,
})

const server = express();
server.use(express.json({ limit: '50mb' }));
server.use(express.urlencoded({ limit: '50mb', extended: true }));
// server.listen(config.apiPort);
server.use(cors({ origin: "*", }));
server.use(express.static('./public')); //用户的静态资源
server.use(bodyparser.json());
// server.use(bodyparser.urlencoded({//body中间件
// 	extended:false
// }));
server.use(async function (req, res, next) {
  const originalSend = res.send;
  //白名单，或者是文件http形式访问(期待有更好的区分方法)
  if (requestWhite.includes(req.url) || (!req.headers['accept'].includes('application') && req.method === 'GET')) return next();

  // 这个位置最好使用redis缓存用户status，避免每次都请求用户数据
  let user = await utils.getUserInfo({ req, res });
  if (user.status === 0) return res.send(utils.returnData({ code: 203, msg: "你账号已被禁用，请联系管理员！！", req }));

  //拦截响应
  res.send = function (body) {
    if (body && body.code === 1) logs.setLogs({ req, res, user })
    originalSend.call(this, body);
  };
  next();
})
process.on('unhandledRejection', (err) => {
  errLog({ err, code: 500, msg: "后端系统错误！", funName: "fatal" });
}).on('uncaughtException', err => {
  errLog({ err, code: 500, msg: "后端系统错误！！", funName: "fatal" });
});
import systemRouter from './router/system/index.js'; //管理菜单等路由
import fileRouter from './router/system/file.js'; //文件等路由
import testsRouter from './router/tests.js'; //测试信息路由
import componentsRouter from './router/components.js';//测试信息路由
server.use('/system', systemRouter);
server.use('/file', fileRouter);
server.use("/tests", testsRouter);
server.use("/components", componentsRouter);

server.listen(config.apiPort, () => {
  console.log(`后端接口启动成功，端口：${config.apiPort}`);
});