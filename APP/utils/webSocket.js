//目前用的是每个客户端传来的uuid做区分，如果需要根据每个用户做区分，可将uuid改成用户id。区别就是uuid可一个账号多登录不影响信息发送和接收
import * as WebSocket from 'ws';
import http from 'http';

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
      this.handleUserActivity(ws, data);
    }
    
    // 102: 请求监控数据 (驾驶舱初始化)
    if (code === 102) {
      console.log('Received 102 monitor request');
      this.sendMonitorData(ws);
    }
  }

  async handleUserActivity(ws, data) {
    const { userId, userName, path, location, ip } = data;
    if (!userId) {
        console.log('Missing userId in activity data');
        return;
    }

    const now = Date.now();
    let user = this.onlineUsers.get(userId);

    if (!user) {
      console.log('New online user:', userName, userId);
      user = {
        userId,
        userName,
        loginTime: now,
        history: [], // 访问记录 { path, enterTime, duration }
        location: location || { lat: 0, lng: 0 },
        ip: ip || (ws?._socket?.remoteAddress || '').replace('::ffff:', ''),
        currentPath: '',
        lastActive: now
      };
    } else {
        // console.log('Update online user:', userName);
    }

    // 更新位置
    if (location && location.lat && location.lng) user.location = location;
    const ipAddr = ip || (ws?._socket?.remoteAddress || '').replace('::ffff:', '');
    if (ipAddr) user.ip = ipAddr;
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
    
    // 如果没有坐标且存在IP，尝试根据IP获取近似位置
    if ((!user.location || !user.location.lat || !user.location.lng) && user.ip) {
      try {
        const approx = await this.fetchIpLocation(user.ip);
        if (approx) {
          user.location = approx;
          this.onlineUsers.set(userId, user);
        }
      } catch (_) {}
    }

    // 广播更新 (可以优化为节流广播)
    this.broadcastMonitorData();
  }

  fetchIpLocation(ip) {
    return new Promise((resolve) => {
      try {
        // 本地/内网IP给一个中国默认中心点
        const ipStr = String(ip || '');
        const isLocal =
          ipStr.startsWith('127.') ||
          ipStr === '::1' ||
          ipStr.startsWith('192.168.') ||
          ipStr.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipStr);
        if (isLocal) {
          resolve({ lat: 30.5728, lng: 104.0668 }); // 成都天府广场近似
          return;
        }
        const url = `http://ip-api.com/json/${ip}?fields=status,lat,lon`;
        http.get(url, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              if (data.status === 'success' && data.lat && data.lon) {
                resolve({ lat: data.lat, lng: data.lon });
                return;
              }
              resolve(null);
            } catch {
              resolve(null);
            }
          });
        }).on('error', () => resolve(null));
      } catch {
        resolve(null);
      }
    });
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
