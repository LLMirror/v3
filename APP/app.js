import express from 'express';
import bodyparser from 'body-parser';
import cors from 'cors';
import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
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

// 调试日志：打印静态资源请求路径
server.use((req, res, next) => {
  if (req.method === 'GET') {
    let decoded = '';
    try { decoded = decodeURIComponent(req.url || ''); } catch (e) { decoded = '(decode failed)'; }
    console.log('[Debug Static]', {
      method: req.method,
      url: req.url,
      originalUrl: req.originalUrl,
      path: req.path,
      decoded
    });
  }
  next();
});
// 计算 ESM 环境下的绝对静态目录（避免工作目录差异）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticRoot = path.join(__dirname, 'public');
server.use(express.static(staticRoot)); // 用户的静态资源（绝对路径）
server.use(bodyparser.json());
// server.use(bodyparser.urlencoded({//body中间件
// 	extended:false
// }));
server.use(async function (req, res, next) {
  const originalSend = res.send;
  // 白名单，或者是文件 http 形式访问（避免查询参数/尾斜杠导致误拦截）
  const reqPath = req.path;
  const isWhitelisted = requestWhite.some((p) => reqPath === p || reqPath.startsWith(p + '/'));
  const isStaticGet = (!req.headers['accept']?.includes('application') && req.method === 'GET');
  if (isWhitelisted || isStaticGet) return next();

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
server.use('/', systemRouter); // 兼容无前缀访问
server.use('/file', fileRouter);
server.use("/tests", testsRouter);
server.use("/components", componentsRouter);

// 并行启动 HTTP 与 HTTPS 服务
// 1) HTTP 保持使用 config.apiPort，确保兼容现有客户端
const httpServer = server.listen(config.apiPort, () => {
  console.log(`后端 HTTP 接口启动成功，端口：${config.apiPort}`);
});

// 2) HTTPS 证书配置（支持环境变量覆盖）
const keyPath = config.httpsKeyPath;
const certPath = config.httpsCertPath;
const httpsPort = config.httpsPort;
let httpsServer;

if (config.enableHttps) {
  try {
    const httpsOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    };
    httpsServer = https.createServer(httpsOptions, server);
    httpsServer.listen(httpsPort, () => {
      console.log(`后端 HTTPS 接口启动成功，端口：${httpsPort}`);
    });
  } catch (e) {
    const isPrivilegedPortError = e && e.code === 'EACCES' && httpsPort < 1024;
    const msg = isPrivilegedPortError
      ? `HTTPS端口 ${httpsPort} 权限不足（低于 1024 需要特权）。已跳过 HTTPS 启动，请改用 Nginx 在 443 终止 TLS 并反代到 HTTP 端口 ${config.apiPort}，或将 HTTPS_PORT 设为高位端口（如 8443/3132）。`
      : `HTTPS 初始化失败，已跳过。请检查证书路径或端口占用。`;
    errLog({ err: e, code: 500, msg, funName: 'https-init' });
  }
}

// 初始化 WebSocket，优先使用 HTTPS Server，否则回退到 HTTP Server
wsService.init({ server: httpsServer || httpServer, path: '/ws' });
