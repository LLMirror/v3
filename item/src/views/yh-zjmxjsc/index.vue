<template>
  <div class="cash-cockpit">
    <div class="cockpit-header">
      <h2>资金明细驾驶舱</h2>
      <div class="filters">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 320px; margin-right: 12px;"
        />
        <el-button type="primary" @click="loadOverview">查询</el-button>
      </div>
    </div>

    <!-- 顶部总览卡片 -->
    <el-row :gutter="16" class="top-cards">
      <el-col :span="6">
        <div class="card">
          <div class="card-title">总收入</div>
          <div class="card-value">{{ formatMoney(totalIncome) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card">
          <div class="card-title">总支出</div>
          <div class="card-value">{{ formatMoney(totalExpense) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card highlight">
          <div class="card-title">总可用资金</div>
          <div class="card-value">{{ formatMoney(totalNet) }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card">
          <div class="card-title">今日净额</div>
          <div class="card-value">{{ formatMoney(todaySummary.net || 0) }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 公司可用资金 & 银行资金余额 -->
    <el-row :gutter="16" class="charts-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">每个公司可用资金</div>
          <div ref="companyChartRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">每家银行资金余额</div>
          <div ref="bankChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 每天收入支出趋势 -->
    <el-row :gutter="16" class="charts-row">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-title">每天收入/支出趋势</div>
          <div ref="dailyChartRef" class="chart large"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 当日收付情况 -->
    <el-row :gutter="16" class="today-row">
      <el-col :span="8">
        <div class="card">
          <div class="card-title">今日收入</div>
          <div class="card-value income">{{ formatMoney(todaySummary.income || 0) }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="card">
          <div class="card-title">今日支出</div>
          <div class="card-value expense">{{ formatMoney(todaySummary.expense || 0) }}</div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="card highlight">
          <div class="card-title">今日净额</div>
          <div class="card-value">{{ formatMoney(todaySummary.net || 0) }}</div>
        </div>
      </el-col>
    </el-row>

    <!-- 当日收付明细 -->
    <div class="table-card">
      <div class="chart-title">当日收付明细</div>
      <el-table :data="todayDetails" border size="small" style="width: 100%">
        <el-table-column prop="date" label="日期" width="140" />
        <el-table-column prop="company" label="公司" width="140" />
        <el-table-column prop="bank" label="银行" width="140" />
        <el-table-column prop="summary" label="摘要" />
        <el-table-column prop="income" label="收入" width="120" />
        <el-table-column prop="expense" label="支出" width="120" />
        <el-table-column prop="balance" label="余额" width="120" />
        <el-table-column prop="remark" label="备注" />
      </el-table>
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import { getCashOverview } from '@/api/system';

const dateRange = ref([]);
const companyChartRef = ref(null);
const bankChartRef = ref(null);
const dailyChartRef = ref(null);
// 缓存图表实例，避免重复初始化
const companyChart = ref(null);
const bankChart = ref(null);
const dailyChart = ref(null);
let resizeHandler = null;

const companyFunds = ref([]);
const bankBalances = ref([]);
const dailyTrend = ref([]);
const todaySummary = ref({ income: 0, expense: 0, net: 0 });
const todayDetails = ref([]);

const totalIncome = ref(0);
const totalExpense = ref(0);
const totalNet = ref(0);

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadOverview() {
  try {
    const [dateFrom, dateTo] = dateRange.value || [];
    const res = await getCashOverview({ data: { dateFrom, dateTo } });

    console.log( )
    const data = res?.data || {};
    companyFunds.value = data.companyFunds || [];
    bankBalances.value = data.bankBalances || [];
    dailyTrend.value = data.dailyTrend || [];
    todaySummary.value = data.todaySummary || { income: 0, expense: 0, net: 0 };
    todayDetails.value = data.todayDetails || [];

    // 汇总顶部指标
    totalIncome.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalIncome || 0), 0);
    totalExpense.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalExpense || 0), 0);
    totalNet.value = totalIncome.value - totalExpense.value;

    await nextTick();
    initCompanyChart();
    initBankChart();
    initDailyChart();
  } catch (err) {
    console.error(err);
    ElMessage.error('加载驾驶舱数据失败');
  }
}

function getOrInitChart(el) {
  if (!el) return null;
  return echarts.getInstanceByDom(el) || echarts.init(el);
}

function initCompanyChart() {
  const el = companyChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  companyChart.value = chart;
  const names = companyFunds.value.map(i => i.company);
  const values = companyFunds.value.map(i => Number(i.balance || 0));
  chart.clear();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: values, itemStyle: { color: '#5470c6' } }]
  });
}

function initBankChart() {
  const el = bankChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  bankChart.value = chart;
  const names = bankBalances.value.map(i => i.bank);
  const values = bankBalances.value.map(i => Number(i.balance || 0));
  chart.clear();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: values, itemStyle: { color: '#91cc75' } }]
  });
}

function initDailyChart() {
  const el = dailyChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  dailyChart.value = chart;
  const dates = dailyTrend.value.map(i => i.date);
  const incomes = dailyTrend.value.map(i => Number(i.income || 0));
  const expenses = dailyTrend.value.map(i => Number(i.expense || 0));
  chart.clear();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'] },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: incomes, itemStyle: { color: '#3ba272' } },
      { name: '支出', type: 'line', smooth: true, data: expenses, itemStyle: { color: '#ee6666' } }
    ]
  });
}

onMounted(() => {
  loadOverview();
  // 统一绑定一次 resize 事件
  if (!resizeHandler) {
    resizeHandler = () => {
      companyChart.value && companyChart.value.resize();
      bankChart.value && bankChart.value.resize();
      dailyChart.value && dailyChart.value.resize();
    };
    window.addEventListener('resize', resizeHandler);
  }
});
</script>

<style scoped>
.cash-cockpit {
  padding: 16px;
}
.cockpit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.filters { display: flex; align-items: center; }
.top-cards .card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.top-cards .card .card-title { color: #888; font-size: 14px; }
.top-cards .card .card-value { font-size: 22px; font-weight: 600; }
.top-cards .card.highlight { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.top-cards .card .income { color: #3ba272; }
.top-cards .card .expense { color: #ee6666; }

.chart-card { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
.chart-title { font-weight: 600; margin-bottom: 8px; }
.chart { width: 100%; height: 320px; }
.chart.large { height: 380px; }

.table-card { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-top: 12px; }
</style>