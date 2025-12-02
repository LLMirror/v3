import express from 'express';
import bodyparser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import https from 'https';
import utils from './utils/index.js';
import config from '././utils/config.js';
import wsService from './utils/webSocket.js';
import requestWhite from './utils/requestWhite.js';
import './utils/schedule.js';
import { errLog } from './utils/err.js';
import logs from './utils/logs.js';


// WebSocket 改为挂载到 HTTPS 同端口（WSS），在 HTTPS 服务创建后初始化

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

// 并行启动 HTTP 与 HTTPS 服务
// 1) HTTP 保持使用 config.apiPort，确保兼容现有客户端
server.listen(config.apiPort, () => {
  console.log(`后端 HTTP 接口启动成功，端口：${config.apiPort}`);
});

// 2) HTTPS 证书配置（支持环境变量覆盖）
const keyPath = config.httpsKeyPath;
const certPath = config.httpsCertPath;
const httpsPort = config.httpsPort || (config.apiPort + 1);
let httpsServer;

try {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  httpsServer = https.createServer(httpsOptions, server);
  httpsServer.listen(httpsPort, () => {
    console.log(`后端 HTTPS 接口启动成功，端口：${httpsPort}`);
  });
  // 初始化 WSS，使用同一个 HTTPS Server，并指定路径
  wsService.init({ server: httpsServer, path: '/ws' });
} catch (e) {
  errLog({ err: e, code: 500, msg: `HTTPS证书读取失败，跳过 HTTPS 启动。请设置 HTTPS_KEY_PATH/HTTPS_CERT_PATH 或确保默认路径存在。`, funName: 'https-init' });
}
