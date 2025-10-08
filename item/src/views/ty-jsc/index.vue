<template>
  <div class="app-container raydata-dashboard">
    <!-- 顶部标题栏 -->
    <div class="dashboard-header">
      <div class="header-left">
        <el-icon class="logo-icon"><DataLine /></el-icon>
        <h1 class="dashboard-title">数据可视化平台</h1>
      </div>
      <div class="header-right">
        <el-select v-model="currentTimeRange" placeholder="时间范围" size="small" class="time-select">
          <el-option label="今日" value="today" />
          <el-option label="近7天" value="week" />
          <el-option label="近30天" value="month" />
          <el-option label="自定义" value="custom" />
        </el-select>
        <el-button size="small" type="primary" plain @click="refreshData">
          <el-icon><RefreshRight /></el-icon> 刷新数据
        </el-button>
      </div>
    </div>

    <!-- 数据概览卡片 -->
    <el-row :gutter="20" class="overview-section">
      <el-col :span="6">
        <div class="data-card">
          <div class="card-content">
            <div class="data-value">{{ overview.totalUsers }}</div>
            <div class="data-label">总用户数</div>
          </div>
          <div class="card-icon"><User /></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="data-card">
          <div class="card-content">
            <div class="data-value">{{ overview.activeUsers }}</div>
            <div class="data-label">活跃用户</div>
          </div>
          <div class="card-icon"><UserFilled /></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="data-card">
          <div class="card-content">
            <div class="data-value">{{ overview.totalAccess }}</div>
            <div class="data-label">总访问量</div>
          </div>
          <div class="card-icon"><View /></div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="data-card">
          <div class="card-content">
            <div class="data-value">{{ overview.avgTime }}</div>
            <div class="data-label">平均停留时长</div>
          </div>
          <div class="card-icon"><Clock /></div>
        </div>
      </el-col>
    </el-row>

    <!-- 主要图表区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 用户增长趋势图 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">用户增长趋势</h3>
            <el-select v-model="userChartType" size="small" class="chart-type-select">
              <el-option label="日" value="day" />
              <el-option label="周" value="week" />
              <el-option label="月" value="month" />
            </el-select>
          </div>
          <div ref="userGrowthChart" class="chart-container"></div>
        </div>
      </el-col>
      
      <!-- 访问量分布图 -->
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">访问量分布</h3>
            <el-select v-model="accessChartType" size="small" class="chart-type-select">
              <el-option label="按地区" value="region" />
              <el-option label="按设备" value="device" />
              <el-option label="按浏览器" value="browser" />
            </el-select>
          </div>
          <div ref="accessDistributionChart" class="chart-container"></div>
        </div>
      </el-col>
      
      <!-- 实时在线用户 -->
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">实时在线用户</h3>
          </div>
          <div ref="onlineUsersChart" class="chart-container"></div>
        </div>
      </el-col>
      
      <!-- 转化率漏斗图 -->
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">用户转化漏斗</h3>
          </div>
          <div ref="conversionFunnelChart" class="chart-container"></div>
        </div>
      </el-col>
      
      <!-- 热门页面排行 -->
      <el-col :span="8">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">热门页面排行</h3>
          </div>
          <div ref="hotPagesChart" class="chart-container"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <div class="table-section">
      <div class="table-header">
        <h3 class="table-title">最近访问记录</h3>
      </div>
      <el-table :data="accessRecords" border style="width: 100%" size="small">
        <el-table-column prop="id" label="序号" width="80" />
        <el-table-column prop="userName" label="用户名称" />
        <el-table-column prop="pageUrl" label="访问页面" :show-overflow-tooltip="true" />
        <el-table-column prop="ipAddress" label="IP地址" />
        <el-table-column prop="deviceInfo" label="设备信息" :show-overflow-tooltip="true" />
        <el-table-column prop="accessTime" label="访问时间" width="180" />
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import * as echarts from 'echarts';
import { 
  DataLine, RefreshRight, User, UserFilled, View, Clock,
  Odometer, ArrowUp, ArrowDown 
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

// 响应式数据
const currentTimeRange = ref('today');
const userChartType = ref('day');
const accessChartType = ref('region');
const userGrowthChart = ref(null);
const accessDistributionChart = ref(null);
const onlineUsersChart = ref(null);
const conversionFunnelChart = ref(null);
const hotPagesChart = ref(null);

// 模拟数据
const overview = ref({
  totalUsers: '128,534',
  activeUsers: '24,892',
  totalAccess: '1,245,890',
  avgTime: '04:23'
});

const accessRecords = ref([
  { id: 1, userName: '张三', pageUrl: '/dashboard/index', ipAddress: '192.168.1.101', deviceInfo: 'Chrome / Windows 10', accessTime: '2024-01-15 14:30:25' },
  { id: 2, userName: '李四', pageUrl: '/products/list', ipAddress: '192.168.1.102', deviceInfo: 'Firefox / macOS', accessTime: '2024-01-15 14:28:12' },
  { id: 3, userName: '王五', pageUrl: '/order/detail/12345', ipAddress: '192.168.1.103', deviceInfo: 'Safari / iOS', accessTime: '2024-01-15 14:25:33' },
  { id: 4, userName: '赵六', pageUrl: '/user/profile', ipAddress: '192.168.1.104', deviceInfo: 'Edge / Windows 11', accessTime: '2024-01-15 14:22:18' },
  { id: 5, userName: '孙七', pageUrl: '/dashboard/index', ipAddress: '192.168.1.105', deviceInfo: 'Chrome / Android', accessTime: '2024-01-15 14:20:45' }
]);

// 初始化用户增长趋势图
function initUserGrowthChart() {
  const chartDom = userGrowthChart.value;
  if (!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#1890ff',
      textStyle: {
        color: '#fff'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['1月10日', '1月11日', '1月12日', '1月13日', '1月14日', '1月15日', '1月16日'],
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#5470c6'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(84, 112, 198, 0.6)' },
            { offset: 1, color: 'rgba(84, 112, 198, 0.1)' }
          ])
        },
        emphasis: {
          focus: 'series'
        },
        data: [1200, 1900, 3000, 2780, 4800, 3900, 4200]
      },
      {
        name: '活跃用户',
        type: 'line',
        stack: 'Total',
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#91cc75'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(145, 204, 117, 0.6)' },
            { offset: 1, color: 'rgba(145, 204, 117, 0.1)' }
          ])
        },
        emphasis: {
          focus: 'series'
        },
        data: [2800, 3200, 4500, 4100, 5800, 5200, 5600]
      }
    ]
  };
  
  myChart.setOption(option);
  
  // 响应式处理
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 初始化访问量分布图
function initAccessDistributionChart() {
  const chartDom = accessDistributionChart.value;
  if (!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#1890ff',
      textStyle: {
        color: '#fff'
      },
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      data: ['华东', '华北', '华南', '西南', '西北', '东北', '其他']
    },
    series: [
      {
        name: '访问量',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '18',
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 3800, name: '华东' },
          { value: 2500, name: '华北' },
          { value: 2200, name: '华南' },
          { value: 1800, name: '西南' },
          { value: 1200, name: '西北' },
          { value: 1000, name: '东北' },
          { value: 500, name: '其他' }
        ],
        color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452']
      }
    ]
  };
  
  myChart.setOption(option);
  
  // 响应式处理
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 初始化实时在线用户图表
function initOnlineUsersChart() {
  const chartDom = onlineUsersChart.value;
  if (!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#1890ff',
      textStyle: {
        color: '#fff'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['0时', '4时', '8时', '12时', '16时', '20时'],
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        name: '在线用户',
        type: 'bar',
        data: [850, 420, 1200, 3200, 4800, 3600],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' }
            ])
          }
        }
      }
    ]
  };
  
  myChart.setOption(option);
  
  // 响应式处理
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 初始化转化率漏斗图
function initConversionFunnelChart() {
  const chartDom = conversionFunnelChart.value;
  if (!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b} : {c}%',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#1890ff',
      textStyle: {
        color: '#fff'
      }
    },
    series: [
      {
        name: '转化率',
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 60,
        width: '80%',
        min: 0,
        max: 100,
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside'
        },
        labelLine: {
          length: 10,
          lineStyle: {
            width: 1,
            type: 'solid'
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1
        },
        emphasis: {
          label: {
            fontSize: 20
          }
        },
        data: [
          { value: 100, name: '访问首页', itemStyle: { color: '#5470c6' } },
          { value: 80, name: '浏览产品', itemStyle: { color: '#91cc75' } },
          { value: 60, name: '加入购物车', itemStyle: { color: '#fac858' } },
          { value: 40, name: '提交订单', itemStyle: { color: '#ee6666' } },
          { value: 25, name: '完成支付', itemStyle: { color: '#73c0de' } }
        ]
      }
    ]
  };
  
  myChart.setOption(option);
  
  // 响应式处理
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 初始化热门页面排行图表
function initHotPagesChart() {
  const chartDom = hotPagesChart.value;
  if (!chartDom) return;
  
  const myChart = echarts.init(chartDom);
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#1890ff',
      textStyle: {
        color: '#fff'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    yAxis: {
      type: 'category',
      data: ['订单详情', '个人中心', '产品列表', '购物车', '首页'],
      axisLine: {
        lineStyle: {
          color: '#ccc'
        }
      }
    },
    series: [
      {
        name: '访问量',
        type: 'bar',
        data: [4500, 6800, 8200, 9600, 12500],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#ffecd2' },
            { offset: 1, color: '#fcb69f' }
          ])
        }
      }
    ]
  };
  
  myChart.setOption(option);
  
  // 响应式处理
  window.addEventListener('resize', () => {
    myChart.resize();
  });
}

// 刷新数据
function refreshData() {
  ElMessage.success('数据刷新成功');
  // 在实际应用中，这里会调用API获取最新数据
  // 这里模拟数据更新
  overview.value.totalUsers = (parseInt(overview.value.totalUsers.replace(/,/g, '')) + 100).toLocaleString();
  overview.value.activeUsers = (parseInt(overview.value.activeUsers.replace(/,/g, '')) + 50).toLocaleString();
  
  // 重新初始化图表
  nextTick(() => {
    initUserGrowthChart();
    initAccessDistributionChart();
    initOnlineUsersChart();
    initConversionFunnelChart();
    initHotPagesChart();
  });
}

// 监听图表类型变化
watch(userChartType, () => {
  initUserGrowthChart();
});

watch(accessChartType, () => {
  initAccessDistributionChart();
});

// 生命周期
onMounted(() => {
  nextTick(() => {
    initUserGrowthChart();
    initAccessDistributionChart();
    initOnlineUsersChart();
    initConversionFunnelChart();
    initHotPagesChart();
  });
});
</script>

<style scoped lang="scss">
.raydata-dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
  
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      
      .logo-icon {
        font-size: 32px;
        color: #1890ff;
      }
      
      .dashboard-title {
        font-size: 24px;
        font-weight: 600;
        color: #333;
        margin: 0;
      }
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 15px;
      
      .time-select {
        width: 120px;
      }
    }
  }
  
  .overview-section {
    margin-bottom: 30px;
    
    .data-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease;
      
      &:hover {
        transform: translateY(-5px);
      }
      
      &:nth-child(2) {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      }
      
      &:nth-child(3) {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      }
      
      &:nth-child(4) {
        background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      }
      
      .card-content {
        flex: 1;
        
        .data-value {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        
        .data-label {
          font-size: 14px;
          opacity: 0.9;
        }
      }
      
      .card-icon {
        font-size: 40px;
        opacity: 0.8;
      }
    }
  }
  
  .charts-section {
    margin-bottom: 30px;
    
    .chart-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        
        .chart-title {
          font-size: 18px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }
        
        .chart-type-select {
          width: 100px;
        }
      }
      
      .chart-container {
        height: 300px;
        width: 100%;
      }
    }
  }
  
  .table-section {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    
    .table-header {
      margin-bottom: 20px;
      
      .table-title {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin: 0;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .raydata-dashboard {
    padding: 10px;
    
    .dashboard-header {
      flex-direction: column;
      gap: 20px;
      
      .header-right {
        width: 100%;
        justify-content: space-between;
      }
    }
    
    .overview-section {
      .el-col {
        margin-bottom: 15px;
      }
    }
    
    .charts-section {
      .el-col {
        margin-bottom: 15px;
      }
      
      .chart-container {
        height: 250px;
      }
    }
  }
}
</style>