<template>
  <div class="payment-situation" v-loading="loading">
    <div class="header">
      <h2>收付情况分析</h2>
      <div class="filters">
        <el-select v-model="selectedSeries" placeholder="选择系列" clearable filterable style="width: 200px; margin-right: 12px;">
            <el-option v-for="s in seriesOptions" :key="s.value" :label="s.label" :value="s.value" />
        </el-select>
        <el-select v-model="selectedCompany" :disabled="!selectedSeries" placeholder="选择公司" clearable filterable style="width: 200px; margin-right: 12px;">
            <el-option v-for="c in companyOptions" :key="c" :label="c" :value="c" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 300px; margin-right: 12px;" />
        <el-button type="primary" @click="fetchData">查询</el-button>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="chart-container" ref="chartRef" style="height: 400px; margin-bottom: 20px;"></div>

    <!-- 表格区域 -->
    <el-table :data="tableData" border stripe style="width: 100%" show-summary :summary-method="getSummaries" height="600">
      <el-table-column prop="month" label="月份" width="120" sortable />
      <el-table-column prop="company" label="公司" width="220" sortable show-overflow-tooltip />
      <el-table-column prop="category" label="大类分类" width="150" sortable />
      <el-table-column prop="income" label="收入" min-width="120" sortable align="right">
        <template #default="scope">{{ formatMoney(scope.row.income) }}</template>
      </el-table-column>
      <el-table-column prop="expense" label="支出" min-width="120" sortable align="right">
         <template #default="scope">{{ formatMoney(scope.row.expense) }}</template>
      </el-table-column>
      <el-table-column prop="net" label="净额" min-width="120" sortable align="right">
         <template #default="scope">
             <span :class="{ 'text-success': scope.row.net >= 0, 'text-danger': scope.row.net < 0 }">
                 {{ formatMoney(scope.row.net) }}
             </span>
         </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue';
import * as echarts from 'echarts';
import { getPaymentSituation, getSeriesList, getCompanyList } from '@/api/system';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const tableData = ref([]);
const dateRange = ref([]);
const selectedSeries = ref('');
const selectedCompany = ref('');
const seriesOptions = ref([]);
const companyOptions = ref([]);
const chartRef = ref(null);
let myChart = null;

function formatMoney(val) {
  if (val === null || val === undefined) return '0.00';
  return Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function loadSeries() {
  try {
    const res = await getSeriesList({});
    const arr = res?.data || [];
    seriesOptions.value = arr.map(s => ({ label: s, value: s }));
  } catch (e) {
    console.error(e);
  }
}

async function loadCompanies(series) {
  if (!series) {
    companyOptions.value = [];
    return;
  }
  try {
    const res = await getCompanyList({ series });
    companyOptions.value = res?.data || [];
  } catch (e) {
    console.error(e);
  }
}

watch(selectedSeries, (val) => {
  selectedCompany.value = '';
  loadCompanies(val);
});

async function fetchData() {
  loading.value = true;
  try {
    const params = {
      series: selectedSeries.value,
      company: selectedCompany.value,
      dateFrom: dateRange.value?.[0],
      dateTo: dateRange.value?.[1]
    };
    const res = await getPaymentSituation(params);
    tableData.value = res.data || [];
    initChart();
  } catch (e) {
    console.error(e);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
}

function initChart() {
  if (!chartRef.value) return;
  if (!myChart) myChart = echarts.init(chartRef.value);
  
  // 聚合数据用于图表：按大类分类汇总收入和支出
  const categoryMap = new Map();
  tableData.value.forEach(item => {
    const cat = item.category || '未分类';
    if (!categoryMap.has(cat)) categoryMap.set(cat, { income: 0, expense: 0 });
    const obj = categoryMap.get(cat);
    obj.income += Number(item.income || 0);
    obj.expense += Number(item.expense || 0);
  });

  const categories = Array.from(categoryMap.keys());
  const incomeData = categories.map(c => categoryMap.get(c).income);
  const expenseData = categories.map(c => categoryMap.get(c).expense);

  const option = {
    title: { text: '收付情况概览（按分类）', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['收入', '支出'], top: 30 },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: categories, axisLabel: { interval: 0, rotate: 30 } },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'bar', data: incomeData, itemStyle: { color: '#67c23a' } },
      { name: '支出', type: 'bar', data: expenseData, itemStyle: { color: '#f56c6c' } }
    ]
  };
  
  myChart.setOption(option);
}

function getSummaries(param) {
  const { columns, data } = param;
  const sums = [];
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '合计';
      return;
    }
    if (['income', 'expense', 'net'].includes(column.property)) {
      const values = data.map(item => Number(item[column.property]));
      if (!values.every(value => Number.isNaN(value))) {
        const sum = values.reduce((prev, curr) => {
          const value = Number(curr);
          if (!Number.isNaN(value)) {
            return prev + curr;
          } else {
            return prev;
          }
        }, 0);
        sums[index] = formatMoney(sum);
      } else {
        sums[index] = '';
      }
    } else {
      sums[index] = '';
    }
  });
  return sums;
}

onMounted(() => {
  loadSeries();
  // 设置默认日期范围：本年
  const end = new Date();
  const start = new Date(new Date().getFullYear(), 0, 1);
  const formatDate = (d) => {
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${m}-${day}`;
  };
  dateRange.value = [formatDate(start), formatDate(end)];
  
  fetchData();
  
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (myChart) myChart.dispose();
});

function handleResize() {
    if (myChart) myChart.resize();
}
</script>

<style scoped>
.payment-situation { padding: 20px; background-color: #fff; border-radius: 4px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.filters { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.text-success { color: #67c23a; font-weight: bold; }
.text-danger { color: #f56c6c; font-weight: bold; }
.chart-container { width: 100%; }
</style>
