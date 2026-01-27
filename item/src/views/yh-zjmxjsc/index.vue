<template>
  <div ref="cockpitRef" class="cash-cockpit" :class="{ dark: isDark }" v-loading="isLoadingOverview">
    <div class="cockpit-header">
      <h2>资金明细驾驶舱</h2>
      <div class="filters">
        <!-- 先选择“系列”，再选择该系列下的“公司” -->
        <el-select
          v-model="selectedSeries"
          placeholder="选择系列"
          clearable
          filterable
          style="width: 220px; margin-right: 12px; "
        >
          <el-option v-for="s in seriesOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-select
          v-model="selectedCompany"
          :disabled="!selectedSeries"
          :placeholder="selectedSeries ? '选择公司（当前系列）' : '请先选择系列'"
          clearable
          filterable
          style="width: 220px; margin-right: 12px;"
        >
          <el-option v-for="c in companyOptions" :key="c" :label="c" :value="c" />
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
        <el-divider direction="vertical" style="margin: 0 12px" />
        <el-button type="success" :icon="Camera" @click="downloadScreenshot">截图</el-button>
        <el-divider direction="vertical" style="margin: 0 12px" />
        <el-switch v-model="isDark" inline-prompt active-text="深色" inactive-text="浅色" />
      </div>
    </div>

    <!-- 分析预警卡（仅 admin 显示） -->
    <el-row :gutter="16" class="top-cards" v-if="isAdmin">
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

    <!-- 洞察指标扩展（仅 admin 显示） -->
    <el-row :gutter="16" class="insight-cards" v-if="isAdmin">
      <el-col :span="6">
        <div class="card">
          <div class="card-title">应收回款率</div>
          <div class="card-value">{{ formatPercent(insights.receivableRate) }}</div>
          <div class="card-sub">近筛选范围内（按月汇总）</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card">
          <div class="card-title">应付付款率</div>
          <div class="card-value">{{ formatPercent(insights.payableRate) }}</div>
          <div class="card-sub">近筛选范围内（按月汇总）</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card">
          <div class="card-title">银行集中度（HHI）</div>
          <div class="card-value">{{ insights.bankHHI?.toFixed(3) || '-' }}</div>
          <div class="card-sub">越接近1表示越集中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card">
          <div class="card-title">净额波动系数（CV）</div>
          <div class="card-value">{{ insights.volatilityCV?.toFixed(3) || '-' }}</div>
          <div class="card-sub">近{{ dailyTrend.length }}天（标准差/均值）</div>
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
    <div class="table-card aggregates-row">
        <!-- 各公司当日汇总（收入/支出/余额） -->
      <div class="table-card" v-if="todayCompanyAggregates.length">
        <div class="chart-title">各公司{{ selectedDay ? '选定日' : '当日' }}汇总{{ selectedDay ? `（${selectedDay}）` : '' }}</div>
        <el-table :data="todayCompanyAggregates" border size="small" style="width: 100%" class="table-red-hover" highlight-current-row>
          <el-table-column prop="company" label="公司" min-width="260" show-overflow-tooltip />
          <el-table-column prop="income" label="当日收入" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.income) }}</template>
          </el-table-column>
          <el-table-column prop="expense" label="当日支出" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.expense) }}</template>
          </el-table-column>
          <el-table-column prop="balance" label="当前实时余额" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.balance) }}</template>
          </el-table-column>
        </el-table>
        
      </div>
      <!-- 各银行当日汇总（收入/支出/余额） -->
      <div class="table-card" v-if="todayBankAggregates.length" style="margin-left: 20px;">
        <div class="chart-title">各银行{{ selectedDay ? '选定日' : '当日' }}汇总{{ selectedDay ? `（${selectedDay}）` : '' }}</div>
        <el-table :data="todayBankAggregates" border size="small" style="width: 100%" class="table-red-hover" highlight-current-row>
          <el-table-column prop="bank" label="银行" min-width="300" show-overflow-tooltip />
          <el-table-column prop="income" label="当日收入" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.income) }}</template>
          </el-table-column>
          <el-table-column prop="expense" label="当日支出" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.expense) }}</template>
          </el-table-column>
          <el-table-column prop="balance" label="当前实时余额" min-width="110">
            <template #default="scope">{{ formatMoney(scope.row.balance) }}</template>
          </el-table-column>
        </el-table>
      </div>
      
    </div>
    <!-- 异常波动列表（近30天，仅 admin 显示） -->
      <div class="table-card" v-if="isAdmin">
        <div class="chart-title">异常波动（近30天）</div>
        <el-table :data="analytics.anomalies || []" border size="small" style="width: 100%" class="table-red-hover" highlight-current-row>
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
    <div class="table-card" v-if="selectedDayDetails.length" style="margin-bottom: 20px;">
      <div class="chart-title">选定日收付明细（{{ selectedDay }}）</div>
      <el-table :data="selectedDayDetails" border size="small" style="width: 100%" class="table-red-hover" highlight-current-row>
        <el-table-column prop="date" label="日期" width="140" />
        <el-table-column prop="company" label="公司" width="240" />
        <el-table-column prop="bank" label="银行" width="380" />
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

    <!-- 应收/应付（按月，仅 admin 显示） -->
    <el-row :gutter="16" class="charts-row" v-if="isAdmin">
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">应收/实收（按月）</div>
          <div ref="receivableChartRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-card">
          <div class="chart-title">应付/实付（按月）</div>
          <div ref="payableChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 应收/实收（公司维度，仅 admin 显示） -->
    <el-row :gutter="16" class="charts-row" v-if="isAdmin">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-title">应收/实收（公司维度）</div>
          <div ref="receivableCompanyChartRef" class="chart large"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 应付/实付（公司维度，仅 admin 显示） -->
    <el-row :gutter="16" class="charts-row" v-if="isAdmin">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-title">应付/实付（公司维度）</div>
          <div ref="payableCompanyChartRef" class="chart large"></div>
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

    <!-- 占比与洞察（仅 admin 显示） -->
    <el-row :gutter="16" class="charts-row" v-if="isAdmin">
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
    <el-row :gutter="16" class="charts-row" v-if="isAdmin">
      <el-col :span="24">
        <div class="chart-card">
          <div class="chart-title">Top摘要频次</div>
          <div ref="topSummaryChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <!-- 当日收付情况 -->
    <el-row :gutter="16" class="today-row" style="margin-top: 10px;">
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
      <el-col :span="8" >
        <div class="card highlight today-net" :class="{ up: (todaySummary.net || 0) >= 0, down: (todaySummary.net || 0) < 0 }">
          <div class="card-title">今日净额</div>
          <div class="card-value">
            <span class="arrow" v-if="(todaySummary.net || 0) >= 0">▲</span>
            <span class="arrow" v-else>▼</span>
            {{ formatMoney(todaySummary.net || 0) }}
          </div>
        </div>
      </el-col>
    </el-row>



    <!-- 当日收付明细 -->
    <div class="table-card">
      <div class="chart-title">当日收付明细</div>
      <el-table :data="todayDetails" border size="small" style="width: 100%" class="table-red-hover" highlight-current-row>
        <el-table-column prop="date" label="日期" min-width="100">
          <template #default="scope">{{ scope.row.date ? scope.row.date.split(' ')[0] : '' }}</template>
        </el-table-column>
        <el-table-column prop="company" label="公司" min-width="220" show-overflow-tooltip />
        <el-table-column prop="bank" label="银行" min-width="300" show-overflow-tooltip />
        <el-table-column prop="summary" label="摘要" min-width="150" show-overflow-tooltip />
        <el-table-column prop="income" label="收入" min-width="80" />
        <el-table-column prop="expense" label="支出" min-width="80" />
        <el-table-column prop="balance" label="余额" min-width="110" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>
    </div>
  </div>
  
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import * as echarts from 'echarts';
import { ElMessage } from 'element-plus';
import { getCashOverview, getCompanyList, getCashRecords, getSeriesList, getReceivableList, getPayableList } from '@/api/system';
import { Camera } from '@element-plus/icons-vue';
import useUserStore from '@/store/modules/user.js';

// 页面外观
const isDark = ref(false);

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
const receivableChartRef = ref(null);
const payableChartRef = ref(null);
const receivableCompanyChartRef = ref(null);
const payableCompanyChartRef = ref(null);
// 缓存图表实例，避免重复初始化
const companyChart = ref(null);
const bankChart = ref(null);
const dailyChart = ref(null);
const companyPieChart = ref(null);
const bankPieChart = ref(null);
const topSummaryChart = ref(null);
const receivableChart = ref(null);
const payableChart = ref(null);
const receivableCompanyChart = ref(null);
const payableCompanyChart = ref(null);
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
const todayBankAggregates = ref([]);

const totalIncome = ref(0);
const totalExpense = ref(0);
const totalNet = ref(0);

// 仅 admin 可见的扩展模块开关
const userStore = useUserStore();
const isAdmin = computed(() => String(userStore.name).toLowerCase() === 'admin' && Number(userStore.id) === 1);

// 扩展洞察指标
const insights = ref({
  receivableRate: null,  // 实收/应收总额
  payableRate: null,     // 实付/应付总额
  bankHHI: null,         // 银行集中度（赫芬达尔-赫希曼指数）
  volatilityCV: null     // 近N天净额波动系数（标准差/均值）
});

// 按月汇总的应收/应付数据
const receivableMonthly = ref({ months: [], received: [], unreceived: [] });
const payableMonthly = ref({ months: [], paid: [], unpaid: [] });

// 公司维度的应收/实收
const receivableCompanyAgg = ref({ names: [], received: [], unreceived: [] });
// 公司维度的应付/实付
const payableCompanyAgg = ref({ names: [], paid: [], unpaid: [] });

// 请求去重与并发保护
const isLoadingOverview = ref(false);

const cockpitRef = ref(null);
// 首选本地依赖（无网络也可用），必要时可扩展回退到 CDN
async function ensureHtml2Canvas() {
  if (window.html2canvas) return window.html2canvas;
  try {
    const mod = await import('html2canvas');
    return mod.default || mod;
  } catch (e) {
    console.error('Failed to import html2canvas locally:', e);
    throw e;
  }
}

function formatToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSeriesLabel() {
  const val = selectedSeries.value;
  const found = (seriesOptions.value || []).find(s => s.value === val);
  return found?.label || val || '未选择系列';
}

async function downloadScreenshot() {
  try {
    const el = cockpitRef.value;
    if (!el) return ElMessage.error('页面尚未渲染完成');
    const html2canvas = await ensureHtml2Canvas();
    // 尝试使用主题背景色，避免透明背景
    const bg = getComputedStyle(el).getPropertyValue('--bg').trim() || '#ffffff';
    const canvas = await html2canvas(el, {
      backgroundColor: bg,
      useCORS: true,
      scale: Math.max(window.devicePixelRatio || 2, 2),
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight,
    });
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const filename = `${getSeriesLabel()}_${formatToday()}.jpg`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    ElMessage.success('截图已下载');
  } catch (e) {
    console.error(e);
    ElMessage.error('截图失败，请稍后重试');
  }
}

function buildOverviewPayload() {
  const [dateFrom, dateTo] = dateRange.value || [];
  const payload = { dateFrom, dateTo };
  if (selectedCompany.value && (companyOptions.value || []).includes(selectedCompany.value)) {
    payload.company = selectedCompany.value;
  }
  if (selectedSeries.value) payload.series = selectedSeries.value;
  return payload;
}

function formatMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadOverview() {
  try {
    if (isLoadingOverview.value) return;
    isLoadingOverview.value = true;
    const payload = buildOverviewPayload();
    const res = await getCashOverview(payload);

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
    // 计算各公司/银行当日汇总
    computeTodayCompanyAggregates();
    computeTodayBankAggregates();

    // 汇总顶部指标
    totalIncome.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalIncome || 0), 0);
    totalExpense.value = companyFunds.value.reduce((sum, i) => sum + Number(i.totalExpense || 0), 0);
    // 使用余额汇总作为总可用资金，确保与“各公司当日汇总”一致
    totalNet.value = companyFunds.value.reduce((sum, i) => sum + Number(i.balance || 0), 0);

    await nextTick();
    initCompanyChart();
    initBankChart();
    initDailyChart();
    initCompanyPieChart();
    initBankPieChart();
    initTopSummaryChart();

    // 加载并绘制应收/应付（按月）柱状图
    await loadReceivablePayableMonthly();
    await nextTick();
    initReceivableChart();
    initPayableChart();

    // 加载并绘制应收/实收（公司维度）柱状图
    await loadReceivableCompanyAgg();
    await nextTick();
    initReceivableCompanyChart();

    // 加载并绘制应付/实付（公司维度）柱状图
    await loadPayableCompanyAgg();
    await nextTick();
    initPayableCompanyChart();

    // 计算扩展洞察
    computeInsights();
  } catch (err) {
    console.error(err);
    ElMessage.error('加载驾驶舱数据失败');
  } finally {
    isLoadingOverview.value = false;
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
    if (selectedCompany.value && (companyOptions.value || []).includes(selectedCompany.value)) {
      params.company = selectedCompany.value;
    }
    if (selectedSeries.value) params.series = selectedSeries.value;
    const res = await getCashRecords(params);
    selectedDayDetails.value = res?.data || [];
    // 选定日联动汇总表
    computeTodayCompanyAggregates();
    computeTodayBankAggregates();
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
  const src = (selectedDay.value && (selectedDayDetails.value || []).length) ? selectedDayDetails.value : todayDetails.value;
  for (const r of (src || [])) {
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

function computeTodayBankAggregates() {
  // 汇总今日收入/支出，并使用后端聚合的银行余额
  const incomeMap = new Map(); // bank -> income
  const expenseMap = new Map(); // bank -> expense
  const lastBalanceMap = new Map(); // bank -> last balance (若后端未提供聚合余额)
  const src = (selectedDay.value && (selectedDayDetails.value || []).length) ? selectedDayDetails.value : todayDetails.value;
  for (const r of (src || [])) {
    const bank = r.bank || '未知银行';
    incomeMap.set(bank, (incomeMap.get(bank) || 0) + Number(r.income || 0));
    expenseMap.set(bank, (expenseMap.get(bank) || 0) + Number(r.expense || 0));
    if (r.balance !== undefined && r.balance !== null) {
      lastBalanceMap.set(bank, Number(r.balance));
    }
  }

  // 银行全集：包含今天有交易的银行 + 概览中的所有银行（即使今日无交易）
  const bankSet = new Set((bankBalances.value || []).map(i => i.bank));
  for (const b of incomeMap.keys()) bankSet.add(b);
  for (const b of expenseMap.keys()) bankSet.add(b);

  const result = [];
  for (const bank of bankSet) {
    const income = incomeMap.get(bank) || 0;
    const expense = expenseMap.get(bank) || 0;
    // 优先使用后端聚合的银行余额（更准确），否则使用今日最新记录余额
    const bf = (bankBalances.value || []).find(i => i.bank === bank);
    const balance = bf ? Number(bf.balance || 0) : Number(lastBalanceMap.get(bank) || 0);
    result.push({ bank, income, expense, balance });
  }
  todayBankAggregates.value = result;
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
    series: [{
      name: '余额',
      type: 'bar',
      data: values,
      itemStyle: { color: '#5470c6' },
      label: {
        show: true,
        position: 'top',
        formatter: (p) => formatMoney(p.value)
      }
    }]
  });
}

// 解析日期字符串为 YYYY-MM
function parseMonth(str) {
  if (!str) return '';
  const s = String(str).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 7);
  return '';
}

// 判断某月是否处于筛选的日期范围内
function isMonthInRange(month, range) {
  if (!month) return false;
  const [from, to] = range || [];
  if (!from || !to) return true;
  // 按“月份”维度比较范围：将日期范围规整为 YYYY-MM
  const fromMonth = parseMonth(from);
  const toMonth = parseMonth(to);
  if (!fromMonth || !toMonth) return true;
  const mDate = new Date(`${month}-01`);
  const fromDate = new Date(`${fromMonth}-01`);
  const toDate = new Date(`${toMonth}-01`);
  return mDate >= fromDate && mDate <= toDate;
}

async function loadReceivablePayableMonthly() {
  try {
    const params = {};
    if (selectedCompany.value && (companyOptions.value || []).includes(selectedCompany.value)) {
      params.company = selectedCompany.value;
    }
    if (selectedSeries.value) params.series = selectedSeries.value;

    // 获取应收列表
    const recRes = await getReceivableList(params);
    const recList = recRes?.data || [];
    const recAmtByMonth = new Map(); // 应收金额
    const recActByMonth = new Map(); // 实收金额
    for (const r of recList) {
      const month = parseMonth(r['应收月份'] || r['开始日期'] || r['结束日期'] || r['create_time']);
      if (!month) continue;
      if (!isMonthInRange(month, dateRange.value)) continue;
      const amt = Number(r['金额'] || 0);
      const act = Number(r['实收金额'] || 0);
      recAmtByMonth.set(month, (recAmtByMonth.get(month) || 0) + amt);
      recActByMonth.set(month, (recActByMonth.get(month) || 0) + act);
    }
    const recMonths = Array.from(new Set([...recAmtByMonth.keys(), ...recActByMonth.keys()])).sort();
    const recReceived = recMonths.map(m => Number(recActByMonth.get(m) || 0));
    const recUnreceived = recMonths.map((m, i) => {
      const amt = Number(recAmtByMonth.get(m) || 0);
      const act = recReceived[i];
      return Math.max(0, amt - act);
    });
    receivableMonthly.value = { months: recMonths, received: recReceived, unreceived: recUnreceived };

    // 获取应付列表
    const payRes = await getPayableList(params);
    const payList = payRes?.data || [];
    const payAmtByMonth = new Map(); // 应付金额
    const payActByMonth = new Map(); // 实付金额
    for (const p of payList) {
      const month = parseMonth(p['还款日期'] || p['create_time']);
      if (!month) continue;
      if (!isMonthInRange(month, dateRange.value)) continue;
      const amt = Number(p['金额'] || 0);
      const act = Number(p['实付金额'] || 0);
      payAmtByMonth.set(month, (payAmtByMonth.get(month) || 0) + amt);
      payActByMonth.set(month, (payActByMonth.get(month) || 0) + act);
    }
    const payMonths = Array.from(new Set([...payAmtByMonth.keys(), ...payActByMonth.keys()])).sort();
    const payPaid = payMonths.map(m => Number(payActByMonth.get(m) || 0));
    const payUnpaid = payMonths.map((m, i) => {
      const amt = Number(payAmtByMonth.get(m) || 0);
      const act = payPaid[i];
      return Math.max(0, amt - act);
    });
    payableMonthly.value = { months: payMonths, paid: payPaid, unpaid: payUnpaid };
  } catch (e) {
    console.error('加载应收/应付数据失败', e);
    receivableMonthly.value = { months: [], received: [], unreceived: [] };
    payableMonthly.value = { months: [], paid: [], unpaid: [] };
  }
}

// 应收/实收（公司维度）聚合
async function loadReceivableCompanyAgg() {
  try {
    const params = {};
    // 保持与页面筛选一致：按系列/公司过滤
    if (selectedCompany.value && (companyOptions.value || []).includes(selectedCompany.value)) {
      params.company = selectedCompany.value;
    }
    if (selectedSeries.value) params.series = selectedSeries.value;
    const recRes = await getReceivableList(params);
    const recList = recRes?.data || [];
    // 公司 -> { amt, act }
    const map = new Map();
    for (const r of recList) {
      const company = r['公司'] || r.company || '未知公司';
      const month = parseMonth(r['应收月份'] || r['开始日期'] || r['结束日期'] || r['create_time']);
      if (month && !isMonthInRange(month, dateRange.value)) continue; // 日期范围过滤
      const amt = Number(r['金额'] || 0);
      const act = Number(r['实收金额'] || 0);
      const cur = map.get(company) || { amt: 0, act: 0 };
      cur.amt += amt;
      cur.act += act;
      map.set(company, cur);
    }
    // 排序：按应收总额降序
    const rows = Array.from(map.entries()).map(([name, v]) => ({ name, amt: v.amt, act: v.act }));
    rows.sort((a, b) => b.amt - a.amt);
    const names = rows.map(r => r.name);
    const received = rows.map(r => Number(r.act || 0));
    const unreceived = rows.map((r, i) => Math.max(0, Number(r.amt || 0) - received[i]));
    receivableCompanyAgg.value = { names, received, unreceived };
  } catch (e) {
    console.error('加载公司维度应收/实收失败', e);
    receivableCompanyAgg.value = { names: [], received: [], unreceived: [] };
  }
}

function initReceivableCompanyChart() {
  const el = receivableCompanyChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  receivableCompanyChart.value = chart;
  const names = receivableCompanyAgg.value.names;
  const received = receivableCompanyAgg.value.received;
  const unreceived = receivableCompanyAgg.value.unreceived;
  const totals = received.map((v, i) => v + (unreceived[i] || 0));
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const actual = params.find(p => p.seriesName === '实收');
        const total = params.find(p => p.seriesName === '应收总额');
        const sActual = actual ? formatMoney(actual.value) : '0.00';
        const sTotal = total ? formatMoney(total.value) : '0.00';
        const sPending = (actual && total) ? formatMoney(Number(total.value) - Number(actual.value)) : '0.00';
        return `${params[0].axisValue}<br/>总应收：${sTotal}<br/>实收：${sActual}<br/>未收：${sPending}`;
      }
    },
    legend: { data: ['应收总额', '实收'] },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value' },
    series: [
      {
        name: '应收总额',
        type: 'bar',
        data: totals,
        itemStyle: { color: 'rgba(46, 204, 113, 0.25)' },
        barWidth: 'auto'
      },
      {
        name: '实收',
        type: 'bar',
        data: received,
        itemStyle: { color: '#2ecc71' },
        barWidth: 'auto',
        barGap: '-100%',
        label: { show: true, position: 'top', formatter: (p) => formatMoney(p.value) }
      }
    ]
  });
}

function initReceivableChart() {
  const el = receivableChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  receivableChart.value = chart;
  const months = receivableMonthly.value.months;
  const received = receivableMonthly.value.received;
  const unreceived = receivableMonthly.value.unreceived;
  const totals = received.map((v, i) => v + (unreceived[i] || 0));
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const actual = params.find(p => p.seriesName === '实收');
        const total = params.find(p => p.seriesName === '应收总额');
        const sActual = actual ? formatMoney(actual.value) : '0.00';
        const sTotal = total ? formatMoney(total.value) : '0.00';
        const sPending = (actual && total) ? formatMoney(Number(total.value) - Number(actual.value)) : '0.00';
        return `${params[0].axisValue}<br/>总应收：${sTotal}<br/>实收：${sActual}<br/>未收：${sPending}`;
      }
    },
    legend: { data: ['应收总额', '实收'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      {
        name: '应收总额',
        type: 'bar',
        data: totals,
        itemStyle: { color: 'rgba(46, 204, 113, 0.25)' },
        barWidth: 'auto'
      },
      {
        name: '实收',
        type: 'bar',
        data: received,
        itemStyle: { color: '#2ecc71' },
        barWidth: 'auto',
        barGap: '-100%',
        label: { show: true, position: 'top', formatter: (p) => formatMoney(p.value) }
      }
    ]
  });
}

function initPayableChart() {
  const el = payableChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  payableChart.value = chart;
  const months = payableMonthly.value.months;
  const paid = payableMonthly.value.paid;
  const unpaid = payableMonthly.value.unpaid;
  const totals = paid.map((v, i) => v + (unpaid[i] || 0));
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const actual = params.find(p => p.seriesName === '实付');
        const total = params.find(p => p.seriesName === '应付总额');
        const sActual = actual ? formatMoney(actual.value) : '0.00';
        const sTotal = total ? formatMoney(total.value) : '0.00';
        const sPending = (actual && total) ? formatMoney(Number(total.value) - Number(actual.value)) : '0.00';
        return `${params[0].axisValue}<br/>总应付：${sTotal}<br/>实付：${sActual}<br/>未付：${sPending}`;
      }
    },
    legend: { data: ['应付总额', '实付'] },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      {
        name: '应付总额',
        type: 'bar',
        data: totals,
        itemStyle: { color: 'rgba(231, 76, 60, 0.25)' },
        barWidth: 'auto'
      },
      {
        name: '实付',
        type: 'bar',
        data: paid,
        itemStyle: { color: '#e74c3c' },
        barWidth: 'auto',
        barGap: '-100%',
        label: { show: true, position: 'top', formatter: (p) => formatMoney(p.value) }
      }
    ]
  });
}

// 应付/实付（公司维度）聚合
async function loadPayableCompanyAgg() {
  try {
    const params = {};
    if (selectedCompany.value && (companyOptions.value || []).includes(selectedCompany.value)) {
      params.company = selectedCompany.value;
    }
    if (selectedSeries.value) params.series = selectedSeries.value;
    const payRes = await getPayableList(params);
    const payList = payRes?.data || [];
    const map = new Map(); // 公司 -> { amt, act }
    for (const p of payList) {
      const company = p['公司'] || p.company || '未知公司';
      const month = parseMonth(p['还款日期'] || p['create_time']);
      if (month && !isMonthInRange(month, dateRange.value)) continue;
      const amt = Number(p['金额'] || 0);
      const act = Number(p['实付金额'] || 0);
      const cur = map.get(company) || { amt: 0, act: 0 };
      cur.amt += amt;
      cur.act += act;
      map.set(company, cur);
    }
    const rows = Array.from(map.entries()).map(([name, v]) => ({ name, amt: v.amt, act: v.act }));
    rows.sort((a, b) => b.amt - a.amt);
    const names = rows.map(r => r.name);
    const paid = rows.map(r => Number(r.act || 0));
    const unpaid = rows.map((r, i) => Math.max(0, Number(r.amt || 0) - paid[i]));
    payableCompanyAgg.value = { names, paid, unpaid };
  } catch (e) {
    console.error('加载公司维度应付/实付失败', e);
    payableCompanyAgg.value = { names: [], paid: [], unpaid: [] };
  }
}

function initPayableCompanyChart() {
  const el = payableCompanyChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  payableCompanyChart.value = chart;
  const names = payableCompanyAgg.value.names;
  const paid = payableCompanyAgg.value.paid;
  const unpaid = payableCompanyAgg.value.unpaid;
  const totals = paid.map((v, i) => v + (unpaid[i] || 0));
  chart.clear();
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const actual = params.find(p => p.seriesName === '实付');
        const total = params.find(p => p.seriesName === '应付总额');
        const sActual = actual ? formatMoney(actual.value) : '0.00';
        const sTotal = total ? formatMoney(total.value) : '0.00';
        const sPending = (actual && total) ? formatMoney(Number(total.value) - Number(actual.value)) : '0.00';
        return `${params[0].axisValue}<br/>总应付：${sTotal}<br/>实付：${sActual}<br/>未付：${sPending}`;
      }
    },
    legend: { data: ['应付总额', '实付'] },
    xAxis: { type: 'category', data: names },
    yAxis: { type: 'value' },
    series: [
      {
        name: '应付总额',
        type: 'bar',
        data: totals,
        itemStyle: { color: 'rgba(231, 76, 60, 0.25)' },
        barWidth: 'auto'
      },
      {
        name: '实付',
        type: 'bar',
        data: paid,
        itemStyle: { color: '#e74c3c' },
        barWidth: 'auto',
        barGap: '-100%',
        label: { show: true, position: 'top', formatter: (p) => formatMoney(p.value) }
      }
    ]
  });
}

// 首次加载：不带日期过滤获取最小日期，设置默认范围为[最早日期, 今天]，然后按该范围再次加载概览
async function initOverviewDefaultRange() {
  try {
    // 使用全量数据获取最早日期，不受公司/系列筛选影响
    const initPayload = {};
    const res = await getCashOverview(initPayload);
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

        // 计算各公司/银行当日汇总
    computeTodayCompanyAggregates();
    computeTodayBankAggregates();

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




    // 用默认范围再次加载，确保图表与筛选一致
    await loadOverview();

    // 初始也计算一次洞察
    computeInsights();


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
    series: [{
      name: '余额',
      type: 'bar',
      data: values,
      itemStyle: { color: '#91cc75' },
      label: {
        show: true,
        position: 'top',
        formatter: (p) => formatMoney(p.value)
      }
    }]
  });
}

function initDailyChart() {
  const el = dailyChartRef.value;
  if (!el) return;
  const chart = getOrInitChart(el);
  dailyChart.value = chart;
  // 直接使用后端返回的趋势数据（已按日期范围筛选）
  let trendData = dailyTrend.value || [];
  
  // 如果没有选择日期范围，默认只显示当月
  if (!dateRange.value || dateRange.value.length === 0) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}`;
    trendData = trendData.filter(i => i.date && i.date.startsWith(prefix));
  }

  const dates = trendData.map(i => i.date);
  const incomes = trendData.map(i => Number(i.income || 0));
  const expenses = trendData.map(i => Number(i.expense || 0));
  // 每日实时余额（后端已提供每日日终余额）
  // 修正：后端返回的 dailyTrend 余额可能与当前实时余额（companyFunds汇总）存在偏差（如期初差异或实时性问题）
  // 我们计算一个 offset，将趋势图整体平移，使其终点（如果是今天）与顶部 TotalNet 对齐
  let balances = trendData.map(i => Number(i.balance ?? 0));
  
  if (trendData.length > 0 && dailyTrend.value.length > 0) {
    // 1. 获取全量数据的最后一天（通常是今天）
    const lastItem = dailyTrend.value[dailyTrend.value.length - 1];
    // 2. 只有当全量数据的最后一天在显示范围内时，才进行对齐（避免查看历史月份时被强制对齐到今日余额）
    const isLastItemInView = trendData.some(i => i.date === lastItem.date);
    
    if (isLastItemInView) {
      const lastTrendBalance = Number(lastItem.balance ?? 0);
      const currentRealBalance = totalNet.value; // 已在 loadOverview 中修正为 companyFunds 余额汇总
      const offset = currentRealBalance - lastTrendBalance;
      
      if (Math.abs(offset) > 0.01) {
        balances = balances.map(b => b + offset);
      }
    }
  }

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

  // 点击主图联动选定日明细与汇总
  try {
    chart.off('click');
  } catch (_) {}
  chart.on('click', (params) => {
    const date = params?.name;
    if (date) {
      loadDayDetails(date);
    }
  });
}

// 计算扩展洞察指标
function computeInsights() {
  // 银行集中度（HHI）
  const bankVals = (bankBalances.value || []).map(i => Number(i.balance || 0)).filter(v => v > 0);
  const bankSum = bankVals.reduce((s, v) => s + v, 0);
  if (bankSum > 0 && bankVals.length) {
    const shares = bankVals.map(v => v / bankSum);
    insights.value.bankHHI = shares.reduce((s, q) => s + q * q, 0);
  } else {
    insights.value.bankHHI = null;
  }

  // 净额波动系数（近N天）
  const nets = (dailyTrend.value || []).map(i => Number(i.income || 0) - Number(i.expense || 0));
  if (nets.length) {
    const mean = nets.reduce((s, v) => s + v, 0) / nets.length;
    const variance = nets.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / nets.length;
    const std = Math.sqrt(variance);
    insights.value.volatilityCV = mean !== 0 ? (std / Math.abs(mean)) : std;
  } else {
    insights.value.volatilityCV = null;
  }

  // 应收/应付的完成率（按月聚合）
  const recTotal = (receivableMonthly.value.months || []).reduce((sum, _, i) => {
    const r = Number(receivableMonthly.value.received[i] || 0);
    const u = Number(receivableMonthly.value.unreceived[i] || 0);
    return sum + r + u;
  }, 0);
  const recActual = (receivableMonthly.value.received || []).reduce((s, v) => s + Number(v || 0), 0);
  insights.value.receivableRate = recTotal > 0 ? (recActual / recTotal) : null;

  const payTotal = (payableMonthly.value.months || []).reduce((sum, _, i) => {
    const p = Number(payableMonthly.value.paid[i] || 0);
    const u = Number(payableMonthly.value.unpaid[i] || 0);
    return sum + p + u;
  }, 0);
  const payActual = (payableMonthly.value.paid || []).reduce((s, v) => s + Number(v || 0), 0);
  insights.value.payableRate = payTotal > 0 ? (payActual / payTotal) : null;
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
    series: [{
      name: '次数',
      type: 'bar',
      data: counts,
      itemStyle: { color: '#fac858' },
      label: {
        show: true,
        position: 'top',
        formatter: (p) => {
          const val = Number(p.value || 0);
          return val.toLocaleString();
        }
      }
    }]
  });
}

onMounted(() => {
  loadOverview()
  // 加载公司选项
  // 初次不加载全部公司，等待选中系列后再加载对应公司
  // initOverviewDefaultRange();
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
      receivableChart.value && receivableChart.value.resize();
      payableChart.value && payableChart.value.resize();
      receivableCompanyChart.value && receivableCompanyChart.value.resize();
      payableCompanyChart.value && payableCompanyChart.value.resize();
    };
    window.addEventListener('resize', resizeHandler);
  }
});

// 根据所选“系列”加载该系列下的公司选项
async function loadCompaniesForSeries(series) {
  try {
    if (!series) {
      companyOptions.value = [];
      return;
    }
    const res = await getCompanyList({ series });
    companyOptions.value = res?.data || [];
  } catch (e) {
    console.error(e);
    companyOptions.value = [];
  }
}

// 联动：系列变化时重置公司并加载公司选项，确保公司只能属于当前系列
watch(selectedSeries, (val) => {
  selectedCompany.value = '';
  loadCompaniesForSeries(val);
});
</script>

<style scoped>
.cash-cockpit {
  padding: 16px;
  /* 主题变量 */
  --bg: #f5f7fa;
  --text: #333;
  --muted: #888;
  --card-bg: #fff;
  --shadow: 0 2px 10px rgba(0,0,0,0.06);
  --primary-from: #667eea;
  --primary-to: #764ba2;
  --border-color: rgba(0,0,0,0.08);
  /* 映射到 Element Plus 的 CSS 变量，确保 el-table 跟随主题 */
  --el-bg-color: var(--bg);
  --el-text-color-primary: var(--text);
  --el-text-color-regular: var(--muted);
  --el-color-primary: var(--primary-from);
  --el-border-color: var(--border-color);
  /* 让输入/选择控件在暗色主题下使用卡片背景 */
  --el-fill-color-blank: var(--card-bg);
  --el-bg-color-overlay: var(--card-bg);
  --el-table-bg-color: var(--card-bg);
  --el-table-header-bg-color: var(--card-bg);
  --el-table-header-text-color: var(--text);
  --el-table-border-color: var(--border-color);
  --el-table-row-hover-bg-color: rgba(0,0,0,0.03);
  background-color: var(--bg);
  color: var(--text);
}
.cash-cockpit.dark {
  --bg: #0f172a;
  --text: #e5e7eb;
  --muted: #9aa0a6;
  --card-bg: #111827;
  --shadow: 0 2px 10px rgba(0,0,0,0.4);
  --primary-from: #3b82f6;
  --primary-to: #7c3aed;
  --border-color: #1f2937;
  --el-table-row-hover-bg-color: rgba(255,255,255,0.04);
}
.cockpit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.filters { display: flex; align-items: center; flex-wrap: wrap; gap: 8px;  }
/* 过滤控件：输入框/下拉/日期 在主题下适配背景与文字颜色 */
.cash-cockpit :deep(.filters .el-input__wrapper),
.cash-cockpit :deep(.filters .el-select__wrapper),
.cash-cockpit :deep(.filters .el-date-editor .el-input__wrapper),
.cash-cockpit :deep(.filters .el-range-editor .el-input__wrapper) {
  background-color: var(--card-bg) !important;
  color: var(--text) !important;
  box-shadow: 0 0 0 1px var(--el-table-border-color) inset !important;
}
/* 占位符颜色与悬浮/聚焦边框适配 */
.cash-cockpit :deep(.filters .el-input__inner::placeholder) {
  color: var(--muted) !important;
}
.cash-cockpit :deep(.filters .el-input__wrapper:hover),
.cash-cockpit :deep(.filters .el-select__wrapper:hover),
.cash-cockpit :deep(.filters .el-date-editor .el-input__wrapper:hover),
.cash-cockpit :deep(.filters .el-range-editor .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--border-color) inset !important;
}
.cash-cockpit :deep(.filters .el-input__wrapper.is-focus),
.cash-cockpit :deep(.filters .el-select__wrapper.is-focus),
.cash-cockpit :deep(.filters .el-date-editor .el-input__wrapper.is-focus),
.cash-cockpit :deep(.filters .el-range-editor .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--border-color) inset !important;
}
.top-cards .card {
  background: var(--card-bg);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow);
}
.top-cards .card .card-title { color: var(--muted); font-size: 14px; }
.top-cards .card .card-value { font-size: 22px; font-weight: 600; }
.top-cards .card.highlight { background: linear-gradient(135deg, var(--primary-from) 0%, var(--primary-to) 100%); color: #fff; }
.top-cards .card .income { color: #3ba272; }
.top-cards .card .expense { color: #ee6666; }
.top-cards .card.warn { border: 1px solid #ee6666; box-shadow: 0 0 0 2px rgba(238,102,102,0.15); }
.top-cards .card-sub { margin-top: 4px; color: #888; font-size: 12px; }
.top-cards .card-list { margin-top: 6px; }
.tag { display: inline-block; background: #f2f3f5; color: #555; padding: 2px 6px; border-radius: 6px; margin-right: 6px; font-size: 12px; }

.chart-card { background: var(--card-bg); border-radius: 10px; padding: 12px; box-shadow: var(--shadow); }
.chart-title { font-weight: 600; margin-bottom: 8px; }
.chart { width: 100%; height: 320px; }
.chart.large { height: 380px; }

.charts-row + .charts-row { margin-top: 12px; }

.table-card { background: var(--card-bg); border-radius: 10px; padding: 12px; box-shadow: var(--shadow); margin-top: 12px; }

/* 让 Element Plus 表格跟随主题变量 */
.cash-cockpit :deep(.el-table) {
  /* 将 EP 变量直接作用在表格根，避免作用域穿透问题 */
  --el-bg-color: var(--bg);
  --el-text-color-primary: var(--text);
  --el-text-color-regular: var(--muted);
  --el-table-bg-color: var(--card-bg);
  --el-table-header-bg-color: var(--card-bg);
  --el-table-header-text-color: var(--text);
  --el-table-border-color: var(--border-color);
  background-color: var(--el-table-bg-color);
  color: var(--el-text-color-primary);
}
.cash-cockpit :deep(.el-table__header),
.cash-cockpit :deep(.el-table__footer) {
  background-color: var(--el-table-header-bg-color) !important;
  color: var(--el-table-header-text-color) !important;
}
.cash-cockpit :deep(.el-table__header th),
.cash-cockpit :deep(.el-table__header .cell) {
  background-color: var(--el-table-header-bg-color) !important;
  color: var(--el-table-header-text-color) !important;
}
.cash-cockpit :deep(.el-table__header-wrapper) {
  background-color: var(--el-table-header-bg-color) !important;
}
.cash-cockpit :deep(.el-table__body-wrapper) {
  background-color: var(--el-table-bg-color) !important;
}
.cash-cockpit :deep(.el-table__cell) {
  background-color: var(--el-table-bg-color);
  color: var(--el-text-color-primary);
}
.cash-cockpit :deep(.el-table__body .cell) {
  color: var(--el-text-color-primary);
}
.cash-cockpit :deep(.el-table__body tr:hover>td) {
  background-color: var(--el-table-row-hover-bg-color) !important;
}

/* 暗色主题下：为带 table-red-hover 的表格设置红色 hover/选中，仅在暗色生效 */
.cash-cockpit.dark :deep(.table-red-hover .el-table__body tr:hover>td) {
  background-color: var(--primary-to) !important; /* 深色主图紫色 #7c3aed */
  color: #fff !important;
}
.cash-cockpit.dark :deep(.table-red-hover .el-table__body tr.current-row>td) {
  background-color: var(--primary-to) !important; /* 深色主图紫色 #7c3aed */
  color: #fff !important;
}
.cash-cockpit :deep(.el-table td),
.cash-cockpit :deep(.el-table th) {
  border-color: var(--el-table-border-color) !important;
}
.cash-cockpit :deep(.el-table .el-table__empty-block) {
  background-color: var(--el-table-bg-color);
  color: var(--el-text-color-regular);
}
/* striped 行支持 */
.cash-cockpit :deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background-color: var(--el-table-striped-bg, var(--el-table-bg-color));
}

/* 洞察卡片与汇总表格的布局优化 */
.insight-cards .card { background: var(--card-bg); border-radius: 10px; padding: 16px; box-shadow: var(--shadow); }
.aggregates-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 20px; }
.aggregates-row > .table-card { flex: 1 1 500px; min-width: 420px; }

/* 当日收付情况卡片优化 */
.today-row .card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 18px 16px;
  box-shadow: var(--shadow);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-height: 110px;
}
.today-row .card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.12);
}
.today-row .card .card-title {
  color: var(--muted);
  font-size: 14px;
  margin-bottom: 6px;
}
.today-row .card .card-value {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.today-row .card .income { color: #16a34a; }
.today-row .card .expense { color: #ef4444; }

/* 今日净额高亮（随涨跌变色） */
.today-row .card.today-net { border-left: 3px solid var(--primary-from); background: var(--card-bg); }
.today-row .card.today-net .arrow { margin-right: 6px; font-size: 16px; vertical-align: middle; }
.today-row .card.today-net.up .card-value { color: #16a34a; }
.today-row .card.today-net.down .card-value { color: #ef4444; }

@media (max-width: 1024px) {
  .chart { height: 280px; }
  .chart.large { height: 320px; }
}
@media (max-width: 768px) {
  .cockpit-header { flex-direction: column; align-items: flex-start; gap: 8px; }
  .filters { flex-wrap: wrap; gap: 8px; }
}
</style>
