//目前用的是每个客户端传来的uuid做区分，如果需要根据每个用户做区分，可将uuid改成用户id。区别就是uuid可一个账号多登录不影响信息发送和接收
import * as WebSocket from 'ws';

class WSService {
  constructor() {
    this.server = null;
    // 存储客户端连接 { uuid: ws }
    this.clients = new Map();
  }
  // 初始化 WebSocket 服务器
  init(serverOptions) {
    if (this.server) return;
    this.server = new WebSocket.WebSocketServer(serverOptions);
    this.server.on('connection', (ws) => {
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });
      ws.on('close', () => {
        console.error('WebSocket close');
        this.removeClient(ws);
      });
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });
    console.log(`WebSocket 监听端口： ${serverOptions.port || ''}`);
  }

  handleMessage(ws, data) {
    const { code, uuid } = data;
    if (code === 205 && uuid) {
      this.clients.set(uuid, ws);
      console.log(`连接成功: ${uuid}`);
    }
    if (code === 1 && uuid) {
      console.log(`其他正常消息：${uuid}`);
      // 这里可以添加消息处理逻辑
    }
  }

  removeClient(ws) {
    for (const [uuid, client] of this.clients.entries()) {
      if (client === ws) {
        this.clients.delete(uuid);
        console.log(`关闭服务: ${uuid}`);
        break;
      }
    }
  }

  // 广播给所有客户端
  broadcast(message) {
    if (!this.server) return;
    const data = typeof message === 'object' ? JSON.stringify(message) : message;
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.default.OPEN) {
        client.send(data);
      }
    });
  }
  // 发送给特定客户端
  sendToClient(uuid, message) {
    if (!this.clients.has(uuid)) {
      console.warn(`设备不存在：${uuid} `);
      return false;
    }
    const client = this.clients.get(uuid);
    const data = typeof message === 'object' ? JSON.stringify(message) : message;
    if (client.readyState === WebSocket.default.OPEN) {
      client.send(data);
      return true;
    }
    console.warn(`Client with UUID ${uuid} is not connected`);
    this.clients.delete(uuid);
    return false;
  }
  // 获取客户端数量
  getClientCount() {
    return this.clients.size;
  }
  // 关闭服务器
  close() {
    if (this.server) {
      this.server.close();
      this.clients.clear();
      this.server = null;
    }
  }
}

// 导出单例实例
export default new WSService();