<template>
  <div class="cash-cockpit">
    <div class="cockpit-header">
      <h2>资金明细驾驶舱</h2>
      <div class="filters">
        <el-select
          v-model="selectedCompany"
          placeholder="选择公司"
          clearable
          filterable
          style="width: 220px; margin-right: 12px;"
        >
          <el-option v-for="c in companyOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-select
          v-model="selectedSeries"
          placeholder="选择系列"
          clearable
          filterable
          style="width: 220px; margin-right: 12px;"
        >
          <el-option v-for="s in seriesOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
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

    <!-- 分析预警卡 -->
    <el-row :gutter="16" class="top-cards">
      <el-col :span="12">
        <div class="card" :class="{ warn: analytics.runwayWarning }">
          <div class="card-title">现金跑道（天）</div>
          <div class="card-value">{{ formatRunway(analytics.runwayDays) }}</div>
          <div class="card-sub">阈值：{{ analytics.runwayThresholdDays || 30 }} 天</div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card" :class="{ warn: analytics.concentrationWarning }">
          <div class="card-title">账户集中度（Top{{ analytics.concentrationTopN || 3 }}）</div>
          <div class="card-value">{{ formatPercent(analytics.concentrationRatio) }}</div>
          <div class="card-sub">阈值：{{ formatPercent(analytics.concentrationThresholdPct) }}</div>
          <div class="card-list" v-if="(analytics.topBanks || []).length">
            Top银行：
            <span class="tag" v-for="b in analytics.topBanks" :key="b.bank">
              {{ b.bank }}（{{ formatPercent(b.ratio) }}）
            </span>
          </div>
        </div>
      </el-col>
    </el-row>

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

    <!-- 异常波动列表（近30天） -->
    <div class="table-card">
      <div class="chart-title">异常波动（近30天）</div>
      <el-table :data="analytics.anomalies || []" border size="small" style="width: 100%">
        <el-table-column prop="date" label="日期" width="140" />
        <el-table-column prop="net" label="净额" width="160">
          <template #default="scope">{{ formatMoney(scope.row.net) }}</template>
        </el-table-column>
        <el-table-column prop="zScore" label="zScore" width="120" />
        <el-table-column label="操作" width="140">
          <template #default="scope">
            <el-button type="primary" link @click="loadDayDetails(scope.row.date)">查看明细</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 选定日收付明细 -->
    <div class="table-card" v-if="selectedDayDetails.length">
      <div class="chart-title">选定日收付明细（{{ selectedDay }}）</div>
      <el-table :data="selectedDayDetails" border size="small" style="width: 100%">
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

    <!-- 占比与洞察 -->
    <el-row :gutter="16" class="charts-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">公司净额占比（Top）</div>
          <div ref="companyPieChartRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">银行净额占比（Top）</div>
          <div ref="bankPieChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>
    <el-row :gutter="16" class="charts-row">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-title">Top摘要频次</div>
          <div ref="topSummaryChartRef" class="chart"></div>
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

    <!-- 各公司当日汇总（收入/支出/余额） -->
    <div class="table-card" v-if="todayCompanyAggregates.length">
      <div class="chart-title">各公司当日汇总</div>
      <el-table :data="todayCompanyAggregates" border size="small" style="width: 100%">
        <el-table-column prop="company" label="公司" width="180" />
        <el-table-column prop="income" label="当日收入" width="160">
          <template #default="scope">{{ formatMoney(scope.row.income) }}</template>
        </el-table-column>
        <el-table-column prop="expense" label="当日支出" width="160">
          <template #default="scope">{{ formatMoney(scope.row.expense) }}</template>
        </el-table-column>
        <el-table-column prop="balance" label="当前实时余额" width="180">
          <template #default="scope">{{ formatMoney(scope.row.balance) }}</template>
        </el-table-column>
      </el-table>
    </div>

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
import { getCashOverview, getCompanyList, getCashRecords, getSeriesList } from '@/api/system';

const dateRange = ref([]);
const selectedCompany = ref('');
const selectedSeries = ref('');
const companyOptions = ref([]);
const seriesOptions = ref([]);
const companyChartRef = ref(null);
const bankChartRef = ref(null);
const dailyChartRef = ref(null);
const companyPieChartRef = ref(null);
const bankPieChartRef = ref(null);
const topSummaryChartRef = ref(null);
// 缓存图表实例，避免重复初始化
const companyChart = ref(null);
const bankChart = ref(null);
const dailyChart = ref(null);
const companyPieChart = ref(null);
const bankPieChart = ref(null);
const topSummaryChart = ref(null);
let resizeHandler = null;

const companyFunds = ref([]);
const bankBalances = ref([]);
const dailyTrend = ref([]);
const todaySummary = ref({ income: 0, expense: 0, net: 0 });
const todayDetails = ref([]);
const topSummaries = ref([]);
const analytics = ref({});
const selectedDayDetails = ref([]);
const selectedDay = ref('');
const todayCompanyAggregates = ref([]);

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
    const payload = { dateFrom, dateTo };
    if (selectedCompany.value) payload.company = selectedCompany.value;
    if (selectedSeries.value) payload.series = selectedSeries.value;
    const res = await getCashOverview({ data: payload });

    const data = res?.data || {};
    companyFunds.value = data.companyFunds || [];
    bankBalances.value = data.bankBalances || [];
    dailyTrend.value = data.dailyTrend || [];
    todaySummary.value = data.todaySummary || { income: 0, expense: 0, net: 0 };
    todayDetails.value = data.todayDetails || [];
    topSummaries.value = data.topSummaries || [];
    analytics.value = data.analytics || {};
    selectedDayDetails.value = [];
    selectedDay.value = '';
    // 计算各公司当日汇总
    computeTodayCompanyAggregates();

    // 汇总顶部指标
    totalIncome.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalIncome || 0), 0);
    totalExpense.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalExpense || 0), 0);
    totalNet.value = totalIncome.value - totalExpense.value;

    await nextTick();
    initCompanyChart();
    initBankChart();
    initDailyChart();
    initCompanyPieChart();
    initBankPieChart();
    initTopSummaryChart();
  } catch (err) {
    console.error(err);
    ElMessage.error('加载驾驶舱数据失败');
  }
}

function formatRunway(days) {
  if (days === null || days === undefined) return '-';
  return `${days} 天`;
}

function formatPercent(val) {
  const num = Number(val || 0);
  return `${(num * 100).toFixed(1)}%`;
}

function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function loadDayDetails(day) {
  try {
    selectedDay.value = day;
    const dateFrom = `${day} 00:00:00`;
    const dateTo = `${day} 23:59:59`;
    // 注意：API 封装会自动将入参作为 body.data 发送，这里不要再包一层 data
    const params = { dateFrom, dateTo, page: 1, size: 200 };
    if (selectedCompany.value) params.company = selectedCompany.value;
    if (selectedSeries.value) params.series = selectedSeries.value;
    const res = await getCashRecords(params);
    selectedDayDetails.value = res?.data || [];
  } catch (e) {
    console.error(e);
    ElMessage.error('加载选定日明细失败');
  }
}

function getOrInitChart(el) {
  if (!el) return null;
  return echarts.getInstanceByDom(el) || echarts.init(el);
}

function computeTodayCompanyAggregates() {
  // 汇总今日收入/支出，并记录每家公司各银行最新余额
  const incomeMap = new Map(); // company -> income
  const expenseMap = new Map(); // company -> expense
  const lastBankBalanceMap = new Map(); // company -> Map(bank -> last balance)

  for (const r of (todayDetails.value || [])) {
    const company = r.company || '未知公司';
    const bank = r.bank || '未知银行';
    incomeMap.set(company, (incomeMap.get(company) || 0) + Number(r.income || 0));
    expenseMap.set(company, (expenseMap.get(company) || 0) + Number(r.expense || 0));
    if (r.balance !== undefined && r.balance !== null) {
      const bm = lastBankBalanceMap.get(company) || new Map();
      bm.set(bank, Number(r.balance));
      lastBankBalanceMap.set(company, bm);
    }
  }

  // 公司全集：包含今天有交易的公司 + 概览中的所有公司（即使今日无交易）
  const companySet = new Set((companyFunds.value || []).map(i => i.company));
  for (const c of incomeMap.keys()) companySet.add(c);
  for (const c of expenseMap.keys()) companySet.add(c);

  const result = [];
  for (const company of companySet) {
    const income = incomeMap.get(company) || 0;
    const expense = expenseMap.get(company) || 0;
    // 优先使用公司聚合余额（更准确），否则按各银行最新余额相加
    const cf = (companyFunds.value || []).find(i => i.company === company);
    let balance = cf ? Number(cf.balance || 0) : 0;
    if (!cf) {
      const bm = lastBankBalanceMap.get(company);
      if (bm) {
        for (const v of bm.values()) balance += Number(v || 0);
      }
    }
    result.push({ company, income, expense, balance });
  }
  todayCompanyAggregates.value = result;
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

// 首次加载：不带日期过滤获取最小日期，设置默认范围为[最早日期, 今天]，然后按该范围再次加载概览
async function initOverviewDefaultRange() {
  try {
    const initPayload = {};
    if (selectedCompany.value) initPayload.company = selectedCompany.value;
    if (selectedSeries.value) initPayload.series = selectedSeries.value;
    const res = await getCashOverview({ data: initPayload });
    const data = res?.data || {};
    companyFunds.value = data.companyFunds || [];
    bankBalances.value = data.bankBalances || [];
    dailyTrend.value = data.dailyTrend || [];
    todaySummary.value = data.todaySummary || { income: 0, expense: 0, net: 0 };
    todayDetails.value = data.todayDetails || [];
    topSummaries.value = data.topSummaries || [];
    analytics.value = data.analytics || {};
    selectedDayDetails.value = [];
    selectedDay.value = '';

    const minDate = dailyTrend.value.length ? dailyTrend.value[0].date : getTodayStr();
    dateRange.value = [minDate, getTodayStr()];

    await nextTick();
    initCompanyChart();
    initBankChart();
    initDailyChart();
    initCompanyPieChart();
    initBankPieChart();
    initTopSummaryChart();

    // 用默认范围再次加载，确保图表与筛选一致
    await loadOverview();
  } catch (err) {
    console.error(err);
    ElMessage.error('初始化驾驶舱数据失败');
  }
}

// 加载“系列”选项（从数据库表去重查询）
async function loadSeriesOptions() {
  try {
    const res = await getSeriesList({});
    const arr = res?.data || [];
    seriesOptions.value = arr.map(s => ({ label: s, value: s }));
  } catch (e) {
    console.error(e);
    seriesOptions.value = [];
  }
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
  // 每日实时余额（后端已提供每日日终余额）
  const balances = dailyTrend.value.map(i => Number(i.balance ?? 0));
  chart.clear();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '实时累计余额'] },
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: incomes, itemStyle: { color: '#3ba272' } },
      { name: '支出', type: 'line', smooth: true, data: expenses, itemStyle: { color: '#ee6666' } },
      { name: '实时累计余额', type: 'line', smooth: true, data: balances, itemStyle: { color: '#5470c6' } }
    ]
  });
}

function initCompanyPieChart() {
  const el = companyPieChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  companyPieChart.value = chart;
  const data = companyFunds.value
    .map(i => ({ name: i.company, value: Number(i.balance || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const val = Number(p.value || 0);
        const wan = (val / 10000).toFixed(2);
        return `净额：${formatMoney(val)} 元<br/>≈ ${wan} 万 (${Math.round(p.percent || 0)}%)`;
      }
    },
    legend: { type: 'scroll', orient: 'vertical', right: 10, top: 20, bottom: 20 },
    series: [{
      type: 'pie',
      radius: '60%',
      center: ['30%', '50%'],
      avoidLabelOverlap: true,
      data,
      label: {
        formatter: (p) => {
          const val = Number(p.value || 0);
          const wan = (val / 10000).toFixed(2);
          const percent = Math.round(p.percent || 0);
          return `${wan}万 (${percent}%)`;
        }
      },
      labelLine: { length: 14, length2: 10 }
    }]
  });
}

function initBankPieChart() {
  const el = bankPieChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  bankPieChart.value = chart;
  const data = bankBalances.value
    .map(i => ({ name: i.bank, value: Number(i.balance || 0) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const val = Number(p.value || 0);
        const wan = (val / 10000).toFixed(2);
        return `净额：${formatMoney(val)} 元<br/>≈ ${wan} 万 (${Math.round(p.percent || 0)}%)`;
      }
    },
    legend: { type: 'scroll', orient: 'vertical', right: 10, top: 20, bottom: 20 },
    series: [{
      type: 'pie',
      radius: '60%',
      center: ['30%', '50%'],
      avoidLabelOverlap: true,
      data,
      label: {
        formatter: (p) => {
          const val = Number(p.value || 0);
          const wan = (val / 10000).toFixed(2);
          const percent = Math.round(p.percent || 0);
          return `${wan}万 (${percent}%)`;
        }
      },
      labelLine: { length: 14, length2: 10 }
    }]
  });
}

function initTopSummaryChart() {
  const el = topSummaryChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  topSummaryChart.value = chart;
  const names = topSummaries.value.map(i => i.summary);
  const counts = topSummaries.value.map(i => Number(i.count || 0));
  chart.clear();
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: counts, itemStyle: { color: '#fac858' } }]
  });
}

onMounted(() => {
  // 加载公司选项
  getCompanyList({}).then(res => {
    companyOptions.value = res?.data || [];
  }).finally(() => {
    initOverviewDefaultRange();
  });
  // 加载系列选项
  loadSeriesOptions();
  // 统一绑定一次 resize 事件
  if (!resizeHandler) {
    resizeHandler = () => {
      companyChart.value && companyChart.value.resize();
      bankChart.value && bankChart.value.resize();
      dailyChart.value && dailyChart.value.resize();
      companyPieChart.value && companyPieChart.value.resize();
      bankPieChart.value && bankPieChart.value.resize();
      topSummaryChart.value && topSummaryChart.value.resize();
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
.top-cards .card.warn { border: 1px solid #ee6666; box-shadow: 0 0 0 2px rgba(238,102,102,0.15); }
.top-cards .card-sub { margin-top: 4px; color: #888; font-size: 12px; }
.top-cards .card-list { margin-top: 6px; }
.tag { display: inline-block; background: #f2f3f5; color: #555; padding: 2px 6px; border-radius: 6px; margin-right: 6px; font-size: 12px; }

.chart-card { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
.chart-title { font-weight: 600; margin-bottom: 8px; }
.chart { width: 100%; height: 320px; }
.chart.large { height: 380px; }

.charts-row + .charts-row { margin-top: 12px; }

.table-card { background: #fff; border-radius: 10px; padding: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); margin-top: 12px; }
</style>