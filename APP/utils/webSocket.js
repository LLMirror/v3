//目前用的是每个客户端传来的uuid做区分，如果需要根据每个用户做区分，可将uuid改成用户id。区别就是uuid可一个账号多登录不影响信息发送和接收
import * as WebSocket from 'ws';

class WSService {
  constructor() {
    this.server = null;
    // 存储客户端连接 { uuid: ws }
    this.clients = new Map();
    // 存储在线用户状态 { userId: { info, history, lastActive, location } }
    this.onlineUsers = new Map();
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
        // console.error('WebSocket close');
        this.removeClient(ws);
      });
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });
    console.log(`WebSocket 监听端口： ${serverOptions.port || ''}`);
    
    // 定时清理离线用户 (超过5分钟无活动)
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [userId, user] of this.onlineUsers.entries()) {
        if (now - user.lastActive > 5 * 60 * 1000) {
          this.onlineUsers.delete(userId);
          changed = true;
        }
      }
      if (changed) {
        this.broadcastMonitorData();
      }
    }, 60 * 1000);
  }

  handleMessage(ws, data) {
    const { code, uuid } = data;
    if (code === 205 && uuid) {
      this.clients.set(uuid, ws);
      // console.log(`连接成功: ${uuid}`);
    }
    if (code === 1 && uuid) {
      // console.log(`其他正常消息：${uuid}`);
    }
    
    // 101: 用户活动上报 (心跳/路由切换)
    if (code === 101) {
      // console.log('Received 101 activity:', data.userId, data.userName);
      this.handleUserActivity(data);
    }
    
    // 102: 请求监控数据 (驾驶舱初始化)
    if (code === 102) {
      console.log('Received 102 monitor request');
      this.sendMonitorData(ws);
    }
  }

  async handleUserActivity(data) {
    const { userId, userName, path, location, ip } = data;
    // console.log('handleUserActivity', data);
    if (!userId) {
        console.log('Missing userId in activity data');
        return;
    }

    const now = Date.now();
    let user = this.onlineUsers.get(userId);

    // console.log('Current Online Users:', Array.from(this.onlineUsers.keys()));

    if (!user) {
      console.log('New online user:', userName, userId);
      user = {
        userId,
        userName,
        loginTime: now,
        history: [], // 访问记录 { path, enterTime, duration }
        location: location || { lat: 0, lng: 0 },
        ip: ip || '',
        currentPath: '',
        lastActive: now
      };
    } else {
        // console.log('Update online user:', userName);
    }

    // 更新位置
    if (location) {
        user.location = location;
    } else if (ip && (!user.location || (user.location.lat === 0 && user.location.lng === 0))) {
        // 如果没有精确位置，但有IP，且当前没有有效位置，尝试通过IP获取粗略位置
        // 注意：这里需要一个 IP 库或 API，为了演示简单，我们假设 IP 包含位置信息或调用一个简单的免费API
        // 在实际后端中，建议集成 GeoLite2 数据库
        try {
           // 模拟 IP 转经纬度 (仅示例，实际需要调用第三方服务或本地库)
           // 比如使用 'geoip-lite' 库
           // const geo = geoip.lookup(ip);
           // if (geo) user.location = { lat: geo.ll[0], lng: geo.ll[1] };
           
           // 如果没有库，这里暂时留空，或者可以调用一个外部API (但后端调用外部API可能会慢)
           // 为了快速响应，这里暂不阻塞调用外部API，而是标记需要获取
        } catch (e) {
            console.error('IP geo lookup failed', e);
        }
    }

    if (ip) user.ip = ip;
    user.lastActive = now;

    // 处理页面访问逻辑
    if (path && path !== user.currentPath) {
      // 结算上一页停留时间
      if (user.currentPath && user.lastEnterTime) {
        const duration = now - user.lastEnterTime;
        // 更新历史记录中的最后一项（如果是同一个页面刷新，可能需要合并，这里简化为追加）
        // 限制历史记录长度
        if (user.history.length > 0 && user.history[user.history.length - 1].path === user.currentPath) {
             user.history[user.history.length - 1].duration += duration;
        } else {
             user.history.push({ path: user.currentPath, duration, enterTime: user.lastEnterTime });
        }
        if (user.history.length > 50) user.history.shift();
      }
      // 进入新页面
      user.currentPath = path;
      user.lastEnterTime = now;
    } else if (path === user.currentPath) {
       // 仅仅是心跳，页面没变，更新一下"当前页面时长"的显示参考值（前端计算，这里只更新活跃时间）
    }

    this.onlineUsers.set(userId, user);
    
    // 广播更新 (可以优化为节流广播)
    this.broadcastMonitorData();
  }

  broadcastMonitorData() {
    const users = Array.from(this.onlineUsers.values());
    this.broadcast({
      code: 1,
      type: 'monitor_update',
      data: users
    });
  }

  sendMonitorData(ws) {
    const users = Array.from(this.onlineUsers.values());
    if (ws.readyState === WebSocket.default.OPEN) {
      ws.send(JSON.stringify({
        code: 1,
        type: 'monitor_update',
        data: users
      }));
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