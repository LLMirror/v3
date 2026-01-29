import { getToken } from '@/utils/auth';
import { getSocketUUID } from '@/utils';
import { ElNotification } from 'element-plus';

//用于实时更新状态
const webSocketStatus = ref(false)

class SingletonWebSocket {
  constructor(url) {
    console.log(`创建WebSocket实例----url--${url}---------import---${import.meta.env.VITE_APP_BASE_SOCKET_HOST}`);
    if (SingletonWebSocket.instance) {
      return SingletonWebSocket.instance;
    }
    SingletonWebSocket.instance = this;

    // 基础配置
    // 优先使用传入URL和环境变量；若未配置，则根据当前页面自动构建 ws/wss 地址
    const envUrl = import.meta.env.VITE_APP_BASE_SOCKET_HOST;
    if (url) {
      this.url = url;
    } else if (envUrl) {
      this.url = envUrl;
    } else {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      this.url = `${proto}://${window.location.host}/ws`;
    }
    this.socket = null;

    // 订阅系统（使用Map存储 { type: callback }）
    this.subscribers = {
      open: new Map(), // 连接打开事件订阅
      message: new Map(), // 消息事件订阅
      close: new Map(), // 连接关闭事件订阅
      error: new Map(), // 错误事件订阅
      catch: new Map(), // 自定义错误订阅
      timeOut: new Map() // 消息超时订阅
    };

    // 可配置参数
    this.config = {
      autoReconnect: true,          // 是否自动重连
      heartbeatEnabled: true,       // 是否启用心跳
      maxReconnectAttempts: 10,     // 最大重连次数
      reconnectBaseInterval: 5000,  // 基础重连间隔(ms)
      heartbeatInterval: 10000,     // 心跳间隔(ms)
      heartbeatTimeout: 20000,      // 心跳超时时间(ms)
      connectionTimeout: 10000,     // 初始连接超时(ms)
      timeOutMessageTimeout: 1000   // 消息超时刷新时间
    };

    // 运行时状态
    this.state = {
      isInitializing: false,
      isManualClose: false,
      reconnectAttempts: 0,
      lastActivity: null
    };

    // 定时器引用
    this.timers = {
      heartbeat: null,        // 心跳发送定时器
      heartbeatTimeout: null, // 心跳超时定时器
      reconnect: null,        // 重连定时器
      connection: null,        // 连接超时定时器
      timeOutMessage: null        // 消息超时定时器
    };

    // 数据
    this.pendingMessages = [];  // 待发送消息队列
    this.timeOutMessages = new Map();  // 消息超时队列
    this.pingData = {          // 心跳包数据
      code: 206,
      ping: 'ping',
    };
    // 初始化code
    this.initCode = 205;
  }

  /*********************
   * 公共API方法
   ********************/

  /**
   * 初始化WebSocket连接
   * @returns {Promise<WebSocket>}
   */
  async init() {
    try {
      this._validateBeforeInit();
      this.state.isInitializing = true;

      this.socket = new WebSocket(this.url);
      this._setupEventHandlers();

      await this._waitForConnection();
      this._onConnected();
      this.isConnected();

      return this.socket;
    } catch (error) {
      if (this.isConnected()) return this.socket;
      this.state.isInitializing = false;
      this._handleInitialError(error);
      throw error;
    }
  }

  /**
   * 发送消息
   * @param {Object} data 消息数据
   * @param {number} timeOut 超时时间，秒
   * @returns {Promise<void>}
   */
  async send(data = {}, timeOut = 0) {
    if (this.isConnected()) {
      try {
        const message = this._prepareMessage(data);
        this.socket.send(message);
        this._updateActivity();
        this._recordTimeOutMessage(data, timeOut)
      } catch (error) {
        throw new Error(`消息发送失败: ${error.message}`);
      }
    } else {
      return this._queueMessage(data, timeOut);
    }
  }

  /**
   * 关闭连接
   */
  close() {
    this.state.isManualClose = true;
    this._cleanupResources();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  /**
   * 检查连接状态
   * @returns {boolean}
   */
  isConnected() {
    const status = this.socket?.readyState === WebSocket.OPEN;
    webSocketStatus.value = status
    return status;
  }

  /**
   * 订阅事件
   * @param {string} event 事件类型
   * @param {string} type 订阅类型标识
   * @param {Function} callback 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(event, type, callback) {
    if (!this.subscribers[event]) {
      console.warn(`无效的事件类型: ${event}`);
      return () => {
      };
    }

    if (this.subscribers[event].has(type)) {
      console.warn(`[WebSocket] 已存在类型为 ${type} 的 ${event} 订阅`);
      return () => this.unsubscribe(event, type);
    }

    this.subscribers[event].set(type, callback);
    return () => this.unsubscribe(event, type);
  }

  /**
   * 取消订阅
   * @param {string} event 事件类型
   * @param {string} type 订阅类型标识
   */
  unsubscribe(event, type) {
    if (this.subscribers[event]?.has(type)) {
      this.subscribers[event].delete(type);
    }
  }

  /**
   * 更新配置
   * @param {Object} newConfig 新配置
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);

    // 如果心跳设置变更，重启心跳
    if (this.isConnected() && this.config.heartbeatEnabled) {
      this._startHeartbeat();
    }
  }

  /*********************
   * 私有方法
   ********************/

  // 初始化验证
  _validateBeforeInit() {
    if (!getToken()) throw new Error('未登录，无法建立WebSocket连接');
    if (!window.WebSocket) throw new Error('浏览器不支持WebSocket');
    if (this.state.isInitializing) throw new Error('WebSocket正在初始化中');
    if (this.isConnected()) throw new Error('WebSocket已经连接');
  }

  // 设置事件处理器
  _setupEventHandlers() {
    this.socket.onopen = (e) => this._handleOpen(e);
    this.socket.onmessage = (e) => this._handleMessage(e);
    this.socket.onclose = () => this._handleClose();
    this.socket.onerror = (e) => this._handleError(e);
  }

  // 等待连接建立
  _waitForConnection() {
    return new Promise((resolve, reject) => {
      this.timers.connection = setTimeout(() => {
        reject(new Error('WebSocket连接超时'));
      }, this.config.connectionTimeout);

      const onOpen = (e) => {
        clearTimeout(this.timers.connection);
        resolve(e);
      };

      const onError = (e) => {
        clearTimeout(this.timers.connection);
        reject(e);
      };

      this.socket.onopen = onOpen;
      this.socket.onerror = onError;
    });
  }

  // 连接成功处理
  _onConnected() {
    this.state.isInitializing = false;
    this.state.isManualClose = false;
    this.state.reconnectAttempts = 0;
    // 发送初始化消息
    this.send({ code: this.initCode }).catch(console.error);
    this._updateActivity();
    this._notify('open');
    this._pushTimeOutMessage();
    console.log('[WebSocket] 连接已建立');
    if (this.config.heartbeatEnabled) {
      this._startHeartbeat();
    }

    this._flushPendingMessages();

  }

  // 准备消息
  _prepareMessage(data) {
    return JSON.stringify({
      code: 1,
      uuid: getSocketUUID(),
      timestamp: Date.now(),
      ...data
    });
  }

  // 记录超时信息
  _recordTimeOutMessage(data, timeOut) {
    if (timeOut && timeOut > 0 && data.code) this.timeOutMessages.set(data.code, { now: Date.now(), data, timeOut })
  }

  // 清理记录超时信息
  _deleteTimeOutMessage(data) {
    if (data.code) this.timeOutMessages.has(data.code) && this.timeOutMessages.delete(data.code)
  }

  // 超时信息响应
  _pushTimeOutMessage() {
    this.timers.timeOutMessage = setInterval(() => {
      this.timeOutMessages.forEach((val, key) => {
        const now = Date.now();
        if (now - val.now > val.timeOut * 1000) {
          this._notify('timeOut', val.data);
          this.timeOutMessages.delete(key)
        }
      })
    }, this.config.timeOutMessageTimeout)
  }

  // 消息入队
  _queueMessage(data, timeOut = 0) {
    return new Promise((resolve, reject) => {
      this.pendingMessages.push({ data, timeOut, resolve, reject });
      if (!this.state.isInitializing) {
        this.init()
          .then(() => this._flushPendingMessages())
          .catch(reject);
      }
    });
  }

  // 发送队列中的消息
  _flushPendingMessages() {
    const toSend = [...this.pendingMessages];
    this.pendingMessages = [];
    toSend.forEach(({ data, timeOut, resolve, reject }) => {
      this.send(data, timeOut)
        .then(resolve)
        .catch(reject);
    });
  }

  // 通知订阅者
  _notify(event, data) {
    const subscribers = this.subscribers[event];
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[WebSocket] ${event}回调执行错误:`, e);
        }
      });
    }
  }

  /*********************
   * 心跳检测相关方法
   ********************/

  // 启动心跳检测
  _startHeartbeat() {
    this._clearHeartbeatTimers();

    this.timers.heartbeat = setInterval(() => {
      if (this.isConnected()) {
        this.send(this.pingData)
          .then(() => this._resetHeartbeatTimeout())
          .catch(() => {
            console.warn('[WebSocket] 心跳发送失败，关闭连接');
            this.socket?.close();
          });
      }
    }, this.config.heartbeatInterval);
  }

  // 重置心跳超时
  _resetHeartbeatTimeout() {
    this._clearHeartbeatTimeout();

    this.timers.heartbeatTimeout = setTimeout(() => {
      console.warn('[WebSocket] 心跳响应超时，关闭连接');
      this.socket?.close();
    }, this.config.heartbeatTimeout);
  }

  // 清除心跳超时定时器
  _clearHeartbeatTimeout() {
    if (this.timers.heartbeatTimeout) {
      clearTimeout(this.timers.heartbeatTimeout);
      this.timers.heartbeatTimeout = null;
    }
  }

  // 清除所有心跳定时器
  _clearHeartbeatTimers() {
    if (this.timers.heartbeat) {
      clearInterval(this.timers.heartbeat);
      this.timers.heartbeat = null;
    }
    this._clearHeartbeatTimeout();
  }

  // 清除消息超时定时器
  _clearTimeOutMessage() {
    if (this.timers.timeOutMessage) {
      clearInterval(this.timers.timeOutMessage);
      this.timers.timeOutMessage = null;
    }
  }


  /*********************
   * 事件处理器
   ********************/

  _handleOpen(e) {
    console.log('[WebSocket] 连接已建立');
    this._onConnected();
    this.isConnected();
  }

  _handleMessage(e) {
    this._updateActivity();

    try {
      const data = JSON.parse(e.data);
      // 普通消息
      if (data.code === 1) this._notify('message', data);
      // 错误信息
      if (data.code === -1) this._notify('catch', data);
      // 清除消息超时
      this._deleteTimeOutMessage(data);
    } catch (error) {
      console.error('[WebSocket] 消息解析失败:', error);
    }
  }

  _handleClose() {
    console.log('[WebSocket] 连接已关闭');
    this.state.isInitializing = false;
    this._notify('close');
    this._clearHeartbeatTimers();
    this._attemptReconnect();
    this._clearTimeOutMessage();
    this.isConnected();
  }

  _handleError(e) {
    console.error('[WebSocket] 发生错误:', e);
    this.state.isInitializing = false;
    this._notify('error', e);
    this._attemptReconnect();
    this.isConnected();
  }

  _handleInitialError(error) {
    console.error('[WebSocket] 初始化失败:', error);
    this._notify('error', error);
    this._attemptReconnect();
  }

  /*********************
   * 重连逻辑
   ********************/

  _attemptReconnect() {
    if (this.state.isManualClose || !this.config.autoReconnect) return;

    this._clearReconnectTimer();

    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this._notifyMaxReconnectAttempts();
      return;
    }

    this.state.reconnectAttempts++;
    const delay = this._calculateReconnectDelay();

    console.log(`[WebSocket] 将在 ${delay / 1000} 秒后尝试第 ${this.state.reconnectAttempts} 次重连...`);

    this.timers.reconnect = setTimeout(() => {
      this.init().catch(console.error);
    }, delay);
  }

  _calculateReconnectDelay() {
    // 指数退避算法
    const base = this.config.reconnectBaseInterval;
    const max = 30000; // 30秒最大间隔
    return Math.min(base * Math.pow(2, this.state.reconnectAttempts - 1), max);
  }

  _clearReconnectTimer() {
    if (this.timers.reconnect) {
      clearTimeout(this.timers.reconnect);
      this.timers.reconnect = null;
    }
  }

  /*********************
   * 工具方法
   ********************/

  _updateActivity() {
    this.state.lastActivity = Date.now();
  }

  _cleanupResources() {
    this.pendingMessages = [];
    this.timeOutMessages.clear();
    this._clearAllTimers();
  }

  _clearAllTimers() {
    this._clearHeartbeatTimers();
    this._clearReconnectTimer();
    this._clearTimeOutMessage();
    if (this.timers.connection) {
      clearTimeout(this.timers.connection);
      this.timers.connection = null;
    }
  }

  _notifyMaxReconnectAttempts() {
    this._cleanupResources();
    this._notify('error', new Error('达到最大重连次数'));
    ElNotification({
      title: 'WebSocket连接错误',
      message: '长连接重连失败，请检查网络或刷新页面',
      type: 'error',
      duration: 0
    });
  }
}

// 创建单例实例
const webSocketInstance = new SingletonWebSocket();
// 导出常用方法
export const initSocket = () => webSocketInstance.init();
/**
 * @param {Object} data 消息信息
 * @param {number} timeOut 记录消息超时时间，秒
 * */
export const sendSocket = (data, timeOut = 0) => webSocketInstance.send(data, timeOut);
export const closeSocket = () => webSocketInstance.close();
export const isSocketConnected = () => webSocketInstance.isConnected();
/**
 * @param {string} event 事件类型
 * @param {string} type 订阅类型标识（相同只会触发一次）
 * @param {Function} callback 回调函数
 * */
export const subscribeSocket = (event, type, callback) =>
  webSocketInstance.subscribe(event, type, callback);
export const unsubscribeSocket = (event, type) =>
  webSocketInstance.unsubscribe(event, type);
export const updateSocketConfig = (config) =>
  webSocketInstance.updateConfig(config);
// 实时更新状态
export const socketStatus = webSocketStatus;

export default webSocketInstance;
