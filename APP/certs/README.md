本地开发 HTTPS 证书生成与配置

1. 生成自签名证书（macOS）

- 在项目根目录执行：
- `cd APP/certs`
- 生成证书（使用 openssl）：
- `openssl req -x509 -newkey rsa:2048 -keyout localhost-key.pem -out localhost-cert.pem -days 365 -nodes -subj "/CN=localhost"`

2. 运行后端

- 回到 APP 目录：`cd ..`
- 启动：`npm run dev`
- 日志将显示：
- `后端 HTTP 接口启动成功，端口：3131`
- `后端 HTTPS 接口启动成功，端口：3132`

3. 环境变量覆盖（可选）

- 如需使用其他路径：
- `export HTTPS_KEY_PATH=/absolute/path/privkey.pem`
- `export HTTPS_CERT_PATH=/absolute/path/fullchain.pem`
- 或设置 HTTPS 端口：
- `export HTTPS_PORT=3132`

4. 证书信任（可选）

- 自签名证书需要在浏览器信任后才不会出现不安全提示。
- 将 `localhost-cert.pem` 导入系统钥匙串并设置为“始终信任”。

