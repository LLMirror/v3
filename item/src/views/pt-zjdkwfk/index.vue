<template>
  <div class="page-wrap">
    <div class="toolbar">
      <el-form :inline="true" @submit.prevent>
        <el-form-item label="账期">
          <el-select v-model="filters.listValue" placeholder="全部账期" clearable style="width: 220px" @change="fetchData">
            <el-option v-for="p in periodOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="公司">
          <el-input v-model="filters.nameValue" placeholder="公司名称(模糊)" clearable style="width: 220px" @keyup.enter="fetchData" />
        </el-form-item>
        <el-button type="primary" @click="fetchData">查询</el-button>
        <el-button type="success" @click="exportDetails" style="margin-left:8px;">导出明细</el-button>
        <el-button type="warning" @click="exportSummary" style="margin-left:8px;">导出汇总</el-button>
      </el-form>
    </div>

    <el-table
      :data="tableRows"
      border
      style="width: 100%"
      :header-cell-style="{fontWeight: 600}"
      v-loading="loading"
      show-summary
      :summary-method="getDetailSummary"
    >
      <el-table-column prop="listValue" label="账期" width="240" />
      <el-table-column prop="nameValue" label="公司" min-width="240" />
      <el-table-column prop="counts['待审核']" label="待审核数" width="110">
        <template #default="{ row }">{{ row.counts['待审核'] || 0 }}</template>
      </el-table-column>
      <el-table-column prop="counts['未提交']" label="未提交数" width="110">
        <template #default="{ row }">{{ row.counts['未提交'] || 0 }}</template>
      </el-table-column>
      <el-table-column prop="counts['审批中']" label="审批中数" width="110">
        <template #default="{ row }">{{ row.counts['审批中'] || 0 }}</template>
      </el-table-column>
      <el-table-column prop="counts['已付款']" label="已付款数" width="110">
        <template #default="{ row }">{{ row.counts['已付款'] || 0 }}</template>
      </el-table-column>
      <el-table-column prop="payable" label="应付金额" width="140">
        <template #default="{ row }">{{ formatMoney(row.payable) }}</template>
      </el-table-column>
      <el-table-column prop="paid" label="已付金额" width="140">
        <template #default="{ row }">{{ formatMoney(row.paid) }}</template>
      </el-table-column>
      <el-table-column prop="unpaid" label="未付金额" width="140">
        <template #default="{ row }">{{ formatMoney(row.unpaid) }}</template>
      </el-table-column>
    </el-table>

    <div class="summary" v-if="periodSummaries.length">
      <h4>账期汇总</h4>
      <el-table
        :data="periodSummaries"
        border
        size="small"
        style="width: 100%"
        show-summary
        :summary-method="getPeriodSummary"
      >
        <el-table-column prop="listValue" label="账期" width="140" />
        <el-table-column prop="statusCounts['待审核']" label="待审核数" width="110">
          <template #default="{ row }">{{ row.statusCounts['待审核'] || 0 }}</template>
        </el-table-column>
        <el-table-column prop="statusCounts['未提交']" label="未提交数" width="110">
          <template #default="{ row }">{{ row.statusCounts['未提交'] || 0 }}</template>
        </el-table-column>
        <el-table-column prop="statusCounts['审批中']" label="审批中数" width="110">
          <template #default="{ row }">{{ row.statusCounts['审批中'] || 0 }}</template>
        </el-table-column>
        <el-table-column prop="statusCounts['已付款']" label="已付款数" width="110">
          <template #default="{ row }">{{ row.statusCounts['已付款'] || 0 }}</template>
        </el-table-column>
        <el-table-column prop="payable" label="应付金额" width="140">
          <template #default="{ row }">{{ formatMoney(row.payable) }}</template>
        </el-table-column>
        <el-table-column prop="paid" label="已付金额" width="140">
          <template #default="{ row }">{{ formatMoney(row.paid) }}</template>
        </el-table-column>
        <el-table-column prop="unpaid" label="未付金额" width="140">
          <template #default="{ row }">{{ formatMoney(row.unpaid) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getFilesStats } from '@/api/system';

const loading = ref(false);
const filters = ref({ listValue: '', nameValue: '' });
const tableRows = ref([]);
const periodSummaries = ref([]);
const STATUS_LIST = ['待审核', '未提交', '审批中', '已付款'];

const periodOptions = computed(() => {
  const set = new Set(tableRows.value.map(r => r.listValue).filter(Boolean));
  return Array.from(set);
});

function formatMoney(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchData() {
  loading.value = true;
  try {
    const { data } = await getFilesStats({ listValue: filters.value.listValue, nameValue: filters.value.nameValue });
    const periods = Array.isArray(data?.periods) ? data.periods : [];
    // 展平 company 维度为表格行
    const rows = [];
    const summaries = [];
    for (const p of periods) {
      const companies = Array.isArray(p.companies) ? p.companies : [];
      for (const c of companies) {
        rows.push({
          listValue: p.listValue,
          nameValue: c.nameValue,
          counts: c.statusCounts || {},
          payable: Number(c.payable || 0),
          paid: Number(c.paid || 0),
          unpaid: Number(c.unpaid || 0)
        });
      }
      summaries.push({
        listValue: p.listValue,
        statusCounts: p.summary?.statusCounts || {},
        payable: Number(p.summary?.payable || 0),
        paid: Number(p.summary?.paid || 0),
        unpaid: Number(p.summary?.unpaid || 0)
      });
    }
    tableRows.value = rows;
    periodSummaries.value = summaries;
  } catch (err) {
    console.error('获取文件统计失败', err);
    ElMessage.error('获取文件统计失败');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

// 明细表合计行
function getDetailSummary({ columns, data }) {
  const sums = [];
  const statusLabels = ['待审核', '未提交', '审批中', '已付款'];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    // 第一列显示“合计”
    if (i === 0) {
      sums[i] = '合计';
      continue;
    }
    // 状态列：根据列名去掉“数”后识别状态
    const baseLabel = String(col.label || '').replace(/数$/, '');
    if (statusLabels.includes(baseLabel)) {
      const total = data.reduce((acc, row) => acc + Number((row.counts || {})[baseLabel] || 0), 0);
      sums[i] = total;
      continue;
    }
    // 金额列：按属性聚合
    if (['payable', 'paid', 'unpaid'].includes(col.property)) {
      const total = data.reduce((acc, row) => acc + Number(row[col.property] || 0), 0);
      sums[i] = formatMoney(total);
      continue;
    }
    // 其他列为空
    sums[i] = '';
  }
  return sums;
}

// 账期汇总表合计行（总计）
function getPeriodSummary({ columns, data }) {
  const sums = [];
  const statusLabels = ['待审核', '未提交', '审批中', '已付款'];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    if (i === 0) {
      sums[i] = '总计';
      continue;
    }
    const baseLabel = String(col.label || '').replace(/数$/, '');
    if (statusLabels.includes(baseLabel)) {
      const total = data.reduce((acc, row) => acc + Number((row.statusCounts || {})[baseLabel] || 0), 0);
      sums[i] = total;
      continue;
    }
    if (['payable', 'paid', 'unpaid'].includes(col.property)) {
      const total = data.reduce((acc, row) => acc + Number(row[col.property] || 0), 0);
      sums[i] = formatMoney(total);
      continue;
    }
    sums[i] = '';
  }
  return sums;
}

// ===== 导出 =====
function exportDetails() {
  if (!tableRows.value.length) {
    ElMessage.warning('没有可导出的明细数据');
    return;
  }
  const header = ['账期', '公司', ...STATUS_LIST, '应付金额', '已付金额', '未付金额'];
  const rows = tableRows.value.map(r => {
    const counts = STATUS_LIST.map(s => Number((r.counts || {})[s] || 0));
    return [
      r.listValue || '',
      r.nameValue || '',
      ...counts,
      Number(r.payable || 0).toFixed(2),
      Number(r.paid || 0).toFixed(2),
      Number(r.unpaid || 0).toFixed(2)
    ];
  });
  const filename = `明细_${filters.value.listValue || '全部账期'}_${(filters.value.nameValue || '全部公司')}.csv`;
  downloadCSV(filename, [header, ...rows]);
}

function exportSummary() {
  if (!periodSummaries.value.length) {
    ElMessage.warning('没有可导出的汇总数据');
    return;
  }
  const header = ['账期', ...STATUS_LIST, '应付金额', '已付金额', '未付金额'];
  const rows = periodSummaries.value.map(r => {
    const counts = STATUS_LIST.map(s => Number((r.statusCounts || {})[s] || 0));
    return [
      r.listValue || '',
      ...counts,
      Number(r.payable || 0).toFixed(2),
      Number(r.paid || 0).toFixed(2),
      Number(r.unpaid || 0).toFixed(2)
    ];
  });
  const filename = `汇总_${filters.value.listValue || '全部账期'}.csv`;
  downloadCSV(filename, [header, ...rows]);
}

function downloadCSV(filename, dataRows) {
  const BOM = '\ufeff';
  const escapeCell = (cell) => {
    const s = String(cell ?? '');
    const escaped = s.replace(/"/g, '""');
    return `"${escaped}"`;
  };
  const content = dataRows.map(row => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  ElMessage.success('导出完成');
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.summary { margin-top: 16px; }
</style>
