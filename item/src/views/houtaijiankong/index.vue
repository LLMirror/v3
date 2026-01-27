<template>
  <div class="monitor-container">
    <div class="header">
      <div class="title">网站数据监控驾驶舱</div>
      <div class="subtitle">实时在线用户: {{ onlineUsers.length }} 人</div>
    </div>
    <div class="content">
      <div class="left-panel">
        <div class="map-wrapper" ref="mapRef"></div>
      </div>
      <div class="right-panel">
        <div class="panel-title">实时用户动态</div>
        <div class="user-list-header">
          <span>用户</span>
          <span>IP</span>
          <span>当前页面</span>
          <span>停留</span>
          <span>总时长</span>
        </div>
        <div class="user-list-wrapper">
          <div class="user-list" :style="{ transform: `translateY(-${scrollOffset}px)` }">
            <div class="user-item" v-for="user in onlineUsers" :key="user.userId">
              <div class="info-row">
                <span class="user-name" :title="user.userName">{{ user.userName }}</span>
                <span class="user-ip" :title="user.ip">{{ user.ip }}</span>
                <span class="page-path" :title="user.currentPath">{{ user.currentPath }}</span>
                <span class="duration">{{ formatDuration(Date.now() - user.lastEnterTime) }}</span>
                <span class="total-duration">{{ formatDuration(Date.now() - user.loginTime) }}</span>
              </div>
              <div class="trail-row" v-if="user.history && user.history.length">
                <span class="trail-label">轨迹:</span>
                <span class="trail-content">
                  <span v-for="(step, idx) in user.history.slice(-5)" :key="idx" class="trail-step">
                    {{ step.path }} ({{ formatDuration(step.duration) }})
                    <span v-if="idx < user.history.length - 1"> -> </span>
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { sendSocket, subscribeSocket, unsubscribeSocket } from '@/utils/webSocket';

// 尝试导入地图数据 (如果项目中没有，可能需要手动引入或下载)
// import chinaJson from '@/assets/map/china.json'; 

const mapRef = ref(null);
const onlineUsers = ref([]);
const scrollOffset = ref(0);
let mapChart = null;
let scrollTimer = null;
let updateTimer = null;

// 格式化时长
const formatDuration = (ms) => {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

// 初始化地图
const initMap = async () => {
  if (!mapRef.value) return;
  mapChart = echarts.init(mapRef.value);
  
  // 这里是一个简化的中国地图配置，如果没有地图JSON数据，可以使用geo坐标系但不显示地图轮廓，或者只显示散点
  // 为了演示，我们尝试加载一个在线的或假设存在的地图，如果失败则只显示散点
  const option = {
    backgroundColor: '#0f1c3c',
    title: {
      text: '用户分布图',
      left: 'center',
      textStyle: { color: '#fff' }
    },
    geo: {
      map: 'china',
      roam: true,
      label: { emphasis: { show: false } },
      itemStyle: {
        normal: {
          areaColor: '#172856',
          borderColor: '#366696',
          borderWidth: 1,
          shadowColor: '#19346d',
          shadowBlur: 10
        },
        emphasis: { areaColor: '#2a333d' }
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        return `${params.name}<br/>${params.value[2] || ''}`;
      }
    },
    series: [
      {
        name: 'Users',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: [], // { name, value: [lng, lat, info] }
        symbolSize: 10,
        showEffectOn: 'render',
        rippleEffect: { brushType: 'stroke' },
        hoverAnimation: true,
        label: { normal: { formatter: '{b}', position: 'right', show: true } },
        itemStyle: {
          normal: { color: '#f4e925', shadowBlur: 10, shadowColor: '#333' }
        },
        zlevel: 1
      }
    ]
  };

  // 尝试注册地图 (如果项目中有)
  try {
     // await echarts.registerMap('china', chinaJson);
     // 如果没有本地文件，可以尝试 fetch
     // 阿里云 DataV 接口可能存在跨域或防盗链限制，改用更稳定的 GeoJSON 源或本地 Mock 数据
     // 这里我们使用一个公开的 GeoJSON 镜像源，或者如果失败则降级处理
     const mapUrl = 'https://raw.githubusercontent.com/apache/echarts-examples/gh-pages/public/data/asset/geo/china.json';
     // 由于 Github Raw 也可能不稳定，实际生产环境建议将 JSON 文件下载到本地 /public/map/china.json
     // 这里我们尝试请求本地 public 目录下的地图数据（假设用户会去下载）
     // 或者直接使用 fetch 获取（如果环境允许跨域）
     
     // 为了演示，我们尝试 fetch 一个可能允许跨域的地址，如果都失败，则只显示散点不显示地图底图
     let geoJson = null;
     try {
        // 优先使用本地文件 (我们刚刚通过命令下载了 china.json 到 public 目录)
        // 生产环境应该确保该文件存在
        const res = await fetch('/china.json');
        if (res.ok) {
           geoJson = await res.json();
        } else {
           throw new Error('Local map file not found');
        }
     } catch (e) {
        console.warn('Local map load failed, trying remote fallback...', e);
        // 备用源: JsDelivr CDN (稳定)
        const res = await fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/china.json');
        geoJson = await res.json();
     }

     if (geoJson) {
         echarts.registerMap('china', geoJson);
     }
  } catch (e) {
    console.warn('Map data load failed. Falling back to scatter only.', e);
    // 如果地图加载失败，移除 geo 配置，改用简单的坐标系或仅显示列表
    // 或者保持 geo 配置，但没有 map 数据，echarts 会显示空白坐标系，散点依然可以显示（如果有坐标）
    
    // 为了美观，如果地图加载失败，我们手动注入一个极简的中国地图轮廓（SVG Path 或简化 JSON）
    // 或者提示用户
  }

  mapChart.setOption(option);
  window.addEventListener('resize', () => mapChart.resize());
};

const updateMapData = () => {
  if (!mapChart) return;
  const data = onlineUsers.value
    .filter(u => u.location && u.location.lng && u.location.lat)
    .map(u => ({
      name: u.userName,
      value: [u.location.lng, u.location.lat, u.currentPath]
    }));
  
  mapChart.setOption({
    series: [{ data }]
  });
};

// WebSocket 消息处理
const handleSocketMessage = (msg) => {
  if (msg.type === 'monitor_update') {
    // 按最后活跃时间排序
    onlineUsers.value = (msg.data || []).sort((a, b) => b.lastActive - a.lastActive);
    updateMapData();
  }
};

// 列表滚动动画
const startScroll = () => {
  scrollTimer = setInterval(() => {
    // 简单滚动逻辑：如果列表过长，慢慢向下移，然后重置
    // 实际项目中可以使用 seamless-scroll 组件
    // 这里暂时不做复杂滚动，因为需要特定DOM结构
  }, 50);
};

// 强制刷新时长显示 (因为时长是基于当前时间的)
const startDurationTimer = () => {
  updateTimer = setInterval(() => {
    // 触发视图更新 (Vue3 响应式可能会自动处理，但 Date.now() 需要手动触发或放在 computed 中)
    // 这里通过重新赋值引发更新
    onlineUsers.value = [...onlineUsers.value];
  }, 1000);
};

onMounted(() => {
  initMap();
  
  // 订阅 WS
  subscribeSocket('message', 'monitor', handleSocketMessage);
  
  // 请求初始数据
  sendSocket({ code: 102 });
  
  startDurationTimer();
});

onUnmounted(() => {
  unsubscribeSocket('message', 'monitor');
  if (scrollTimer) clearInterval(scrollTimer);
  if (updateTimer) clearInterval(updateTimer);
  if (mapChart) mapChart.dispose();
});
</script>

<style scoped lang="scss">
.monitor-container {
  width: 100%;
  height: calc(100vh - 84px); // 减去头部导航高度
  background-color: #0b1325;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1c3a63;
  margin-bottom: 20px;
  
  .title {
    font-size: 24px;
    font-weight: bold;
    color: #00eaff;
    text-shadow: 0 0 10px #00eaff;
  }
  
  .subtitle {
    font-size: 16px;
    color: #ffd04b;
  }
}

.content {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}

.left-panel {
  flex: 2;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid #1c3a63;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.map-wrapper {
  flex: 1;
  width: 100%;
  min-height: 400px;
}

.right-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  border: 1px solid #1c3a63;
  display: flex;
  flex-direction: column;
  padding: 15px;
}

.panel-title {
  font-size: 18px;
  color: #00eaff;
  margin-bottom: 15px;
  font-weight: bold;
}

.user-list-header {
  display: flex;
  padding: 10px;
  background: rgba(0, 234, 255, 0.1);
  color: #00eaff;
  font-weight: bold;
  
  span {
    flex: 1;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    &:nth-child(3) { flex: 2; } /* Page Path */
  }
}

.user-list-wrapper {
  flex: 1;
  overflow-y: auto;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 4px;
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: #1c3a63;
    border-radius: 2px;
  }
}

.user-list {
  transition: transform 0.5s linear;
}

.user-item {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  
  .info-row {
    display: flex;
    align-items: center;
    
    span {
      flex: 1;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 14px;
      padding: 0 5px;
      
      &:nth-child(3) { 
        flex: 2; 
        color: #ffd04b;
      }
      
      &.user-name { color: #fff; font-weight: bold; }
      &.user-ip { color: #aaa; font-size: 12px; }
      &.duration { color: #00eaff; }
      &.total-duration { color: #aaa; font-size: 12px; }
    }
  }
  
  .trail-row {
    margin-top: 8px;
    font-size: 12px;
    color: #888;
    display: flex;
    
    .trail-label {
      margin-right: 5px;
      color: #555;
    }
    
    .trail-content {
      flex: 1;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }
}
</style>
