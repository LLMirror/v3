export default {
    //api端口
    apiPort:3131,
    //socket端口
    socketPort:1313,
    //https端口（默认 3132，可被环境变量 HTTPS_PORT 覆盖；避免 443 低权限端口）
    httpsPort: Number(process.env.HTTPS_PORT) || 3132,
    // 是否启用 HTTPS（默认关闭；生产推荐由 Nginx 终止 TLS）
    enableHttps: String(process.env.ENABLE_HTTPS || '').toLowerCase() === 'true',
    //https证书路径（支持环境变量覆盖）
    // 默认使用云证书（Nginx/PEM 格式），可用环境变量覆盖。
    // Nginx 通常提供 bundle 文件（已包含中间证书链），优先使用它。
    httpsKeyPath: process.env.HTTPS_KEY_PATH || 'certs/刘磊.com.key',
    httpsCertPath: process.env.HTTPS_CERT_PATH || 'certs/刘磊.com_bundle.crt',
    //上传name
    fileName:"file",
    //上传文件位置
    fileSite:"public",
    //日志文件夹
    logSite:"logs",
}
