

<template>
  <div class="page-wrap p-4" ref="wrapperRef">
    <div class="header-bar">
      <h2 class="page-title" ref="titleRef">迪波GL账单</h2>
      <div class="actions">
        <el-button type="primary" size="small" :loading="exporting" :disabled="exporting || exportingCsv" @click="exportExcel">导出Excel</el-button>
        <el-button class="ml-2" type="success" size="small" :loading="exportingCsv" :disabled="exporting || exportingCsv" @click="exportCsv">导出CSV(10万/页)</el-button>
      </div>
    </div>
    <div class="progress-info" v-if="exportingCsv">
      已导出 {{ csvProgressCount }} 条（{{ csvProgressPercent }}%）
    </div>

    <!-- 导出进度模态框 -->
    <el-dialog
      v-model="showProgressModal"
      title="导出进度"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      width="420px"
    >
      <div class="modal-row">
        <span>当前页：</span>
        <span>{{ currentPageForCsv }} / {{ totalPagesForCsv }}</span>
      </div>
      <div class="modal-row">
        <span>已导出条数：</span>
        <span>{{ csvProgressCount }} / {{ grandTotalForCsv }}</span>
      </div>
      <div class="modal-row">
        <span>进度：</span>
        <el-progress :percentage="csvProgressPercent" :status="csvProgressPercent===100 ? 'success' : undefined"></el-progress>
      </div>
      <template #footer>
        <el-button size="small" @click="showProgressModal=false" :disabled="exportingCsv">隐藏</el-button>
      </template>
    </el-dialog>
    <!-- <div class="tool-bar">
      <el-select
        v-model="orderStatus"
        placeholder="订单状态"
        size="small"
        class="mr-2"
        @change="handleStatusChange"
      >
        <el-option
          v-for="opt in statusOptions"
          :key="opt"
          :label="opt"
          :value="opt"
        />
      </el-select>
    </div> -->
    <HotTable
      ref="hotTableRef"
      :settings="hotSettings"
      licenseKey="non-commercial-and-evaluation"
      class="excel-table"
    />

    <div class="pagination-bar" ref="paginationRef">
      <el-pagination
        background
        layout="prev, pager, next, sizes, total, jumper"
        :total="total"
        :current-page="currentPage"
        :page-size="pageSize"
        :page-sizes="[20, 50, 100, 200, 500, 1000]"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { HotTable } from "@handsontable/vue3";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/zh-CN"; // 汉化

import { hyGetSettlementData } from "@/api/system/index.js";
import service from "@/utils/request";
import { downFile } from "@/utils/ruoyi";

// 基础数据模型
const tableData = ref([]);
const colHeaders = ref([]);
const columns = ref([]);
// 顶部订单状态筛选
const orderStatus = ref('全部');
const statusOptions = [
  '全部', '待处理', '处理中', '已完成', '已取消'
];
// 自适应高度相关
const wrapperRef = ref(null);
const titleRef = ref(null);
const paginationRef = ref(null);
const tableHeight = ref(600);
// 分页参数
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
// 导出加载状态
const exporting = ref(false);
const exportingCsv = ref(false);
const csvProgressCount = ref(0);
const csvProgressPercent = ref(0);
let csvProgressTimer = null;
const showProgressModal = ref(false);
const grandTotalForCsv = ref(0);
const currentPageForCsv = ref(0);
const totalPagesForCsv = ref(0);

// Handsontable 设置（响应式）
const hotSettings = reactive({
  data: tableData.value,
  colHeaders: colHeaders.value,
  columns: columns.value,
  stretchH: "all",
  language: "zh-CN",
  height: tableHeight.value,
  licenseKey: "non-commercial-and-evaluation",
  contextMenu: true,
  filters: true,
  dropdownMenu: true,
  manualColumnResize: true,
  manualRowResize: true,
  autoColumnSize: true,
  // 固定最左侧一列，配合初始化时将“序号”置于首列
  fixedColumnsLeft: 1,
  // 关闭单元格自动换行
  wordWrap: false,
  // 根据订单状态为整行着色：订单已完成 -> 浅绿色
  cells(row, col) {
    const cellProperties = {};
    const rowData = tableData.value?.[row];
    if (rowData) {
      // 常见字段名兼容：订单状态/状态/status/摘要/summary；并兜底扫描整行包含“订单已完成”
      const statusVal = rowData["订单状态"] ?? rowData["状态"] ?? rowData["status"] ?? rowData["摘要"] ?? rowData["summary"] ?? "";
      const strVal = String(statusVal);
      const isCompleted = /订单已完成|已完成/.test(strVal) ||
        Object.values(rowData).some(v => /订单已完成/.test(String(v)));
      if (isCompleted) {
        cellProperties.className = (cellProperties.className ? cellProperties.className + " " : "") + "row-completed";
      }
      // 条件着色：对账状态为“美团˙已对账”且订单状态不为“订单已完成” -> 浅红色
      const reconcileVal = rowData["对账状态"] ?? rowData["对账"] ?? rowData["reconcileStatus"] ?? "";
      const isReconciled = String(reconcileVal).includes("美团˙已对账");
      if (isReconciled && !isCompleted) {
        cellProperties.className = (cellProperties.className ? cellProperties.className + " " : "") + "row-reconciled-red";
      }
    }
    return cellProperties;
  },
});

// 计算可用高度：视口高度 - 表格距离顶部 - 分页与底部间距
const updateTableHeight = () => {
  nextTick(() => {
    try {
      const hot = hotTableRef.value?.hotInstance;
      const rootEl = hot?.rootElement || hotTableRef.value?.$el;
      const pagH = paginationRef.value?.offsetHeight || 0;
      const top = rootEl?.getBoundingClientRect?.().top || 0;
      const viewportH = window.innerHeight || 800;
      const bottomPadding = 24 + pagH + 16; // 预留底部间距 + 额外安全边距
      const available = Math.max(300, viewportH - top - bottomPadding);
      tableHeight.value = available;
      hotSettings.height = available;
      if (hot) hot.updateSettings({ height: available });
    } catch (e) {
      // 兜底：保持原高度
      console.warn('updateTableHeight fallback', e);
    }
  });
};

// 根据对象数组初始化表头与列定义
function initTableFromObjects(rows = []) {
  if (!rows || rows.length === 0) {
    colHeaders.value = [];
    columns.value = [];
    hotSettings.colHeaders = colHeaders.value;
    hotSettings.columns = columns.value;
    return;
  }
  const keys = Object.keys(rows[0]);
  // 保证“序号”优先显示在最前
  const ordered = keys.includes("序号")
    ? ["序号", ...keys.filter(k => k !== "序号")]
    : keys;
  colHeaders.value = ordered;
  columns.value = ordered.map(k => {
    const cfg = { data: k };
    if (["收入","支出","余额"].includes(k)) {
      cfg.type = "numeric";
      cfg.numericFormat = { pattern: "0,0.00" };
    }
    if (k === "日期") {
      cfg.type = "date";
      cfg.dateFormat = "YYYY-MM-DD";
      cfg.correctFormat = true;
    }
    if (k === "id") {
      cfg.width = 1;
    }
    return cfg;
  });
  hotSettings.colHeaders = colHeaders.value;
  hotSettings.columns = columns.value;
}

// 加载数据到 HotTable
function loadIntoHotTable(data) {
  hotSettings.data = data;
  nextTick(() => {
    const hot = hotTableRef.value?.hotInstance;
    if (hot) hot.loadData(data);
  });
}

// 组件引用
const hotTableRef = ref(null);

// 按页请求数据并渲染
async function fetchPage() {
  const dataParams = { page: currentPage.value, size: pageSize.value };
  // 将订单状态映射到摘要筛选（后端支持 summary LIKE）
  if (orderStatus.value && orderStatus.value !== '全部') {
    dataParams.summary = orderStatus.value;
  }
  const res = await hyGetSettlementData({ data: dataParams });
  const list = Array.isArray(res?.data) ? res.data : [];
  total.value = Number(res?.total) || list.length;
  if (columns.value.length === 0) {
    initTableFromObjects(list);
  }
  tableData.value = list;
  loadIntoHotTable(tableData.value);
  updateTableHeight();
}

// 事件：页码变化
async function handleCurrentChange(page) {
  currentPage.value = page;
  await fetchPage();
}
// 事件：每页数量变化
async function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1;
  await fetchPage();
}

// 订单状态变化
async function handleStatusChange() {
  currentPage.value = 1;
  await fetchPage();
}

// 页面挂载后获取并渲染数据
onMounted(fetchPage);

// 窗口尺寸变化时重算高度
onMounted(() => {
  window.addEventListener('resize', updateTableHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableHeight);
});
// 数据量或分页变化时也尝试更新高度
watch([currentPage, pageSize, () => tableData.value.length], () => updateTableHeight());

// 导出当前筛选的数据为 Excel
async function exportExcel() {
  try {
    exporting.value = true;
    const params = { data: {} };
    // 订单状态映射到摘要筛选
    if (orderStatus.value && orderStatus.value !== '全部') {
      params.data.summary = orderStatus.value;
    }
    // 直接请求 blob，并使用 Content-Disposition 作为文件名
    const res = await service.post('/system/hy-exportSettlementExcel', params, { responseType: 'blob', timeout: 600000 });
    downFile(res, 'content-disposition');
  } catch (e) {
    console.error('导出失败', e);
  } finally {
    exporting.value = false;
  }
}

// 导出 CSV（每页 10 万，自动分页下载）
async function exportCsv() {
  try {
    exportingCsv.value = true;
    showProgressModal.value = true;
    const filter = { data: { page: 1, size: 1 } };
    if (orderStatus.value && orderStatus.value !== '全部') {
      filter.data.summary = orderStatus.value;
    }
    // 先获取总数
    const resTotal = await hyGetSettlementData(filter);
    const grandTotal = Number(resTotal?.total) || 0;
    if (!grandTotal) return;
    const pageSize = 100000;
    const pages = Math.ceil(grandTotal / pageSize);
    let completed = 0;
    grandTotalForCsv.value = grandTotal;
    totalPagesForCsv.value = pages;
    for (let p = 1; p <= pages; p++) {
      const jobId = Math.random().toString(36).slice(2);
      const payload = { data: { page: p, pageSize, jobId } };
      if (orderStatus.value && orderStatus.value !== '全部') {
        payload.data.summary = orderStatus.value;
      }
      currentPageForCsv.value = p;
      // 启动进度轮询（每秒查询一次该页进度）
      if (csvProgressTimer) clearInterval(csvProgressTimer);
      csvProgressTimer = setInterval(async () => {
        try {
          const resp = await service.post('/system/hy-exportSettlementCsvProgress', { jobId });
          const prog = resp?.data || {};
          const pageProcessed = Number(prog?.processed || 0);
          const overallProcessed = completed + pageProcessed;
          csvProgressCount.value = Math.min(grandTotal, overallProcessed);
          csvProgressPercent.value = grandTotal ? Math.floor((csvProgressCount.value / grandTotal) * 100) : 0;
          if (prog?.status === 'done') {
            clearInterval(csvProgressTimer);
            csvProgressTimer = null;
          }
        } catch (e) {
          // 忽略查询错误
        }
      }, 1000);
      const resp = await service.post('/system/hy-exportSettlementCsv', payload, { responseType: 'blob', timeout: 600000 });
      // 文件名来自服务端 Content-Disposition（GL结算_p{page}.csv）
      downFile(resp, 'content-disposition');
      // 完成该页
      completed += Math.min(pageSize, grandTotal - (p - 1) * pageSize);
      csvProgressCount.value = completed;
      csvProgressPercent.value = grandTotal ? Math.floor((csvProgressCount.value / grandTotal) * 100) : 0;
      if (csvProgressTimer) {
        clearInterval(csvProgressTimer);
        csvProgressTimer = null;
      }
    }
  } catch (e) {
    console.error('CSV 导出失败', e);
  } finally {
    exportingCsv.value = false;
    if (csvProgressTimer) {
      clearInterval(csvProgressTimer);
      csvProgressTimer = null;
    }
    // 导出结束自动隐藏
    showProgressModal.value = false;
  }
}


</script>

<style scoped>

.page-wrap{padding-left: 16px;padding-right: 16px;}
.header-bar { position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.page-title { font-size: 18px; font-weight: 600; text-align: center; }
.actions { position: absolute; right: 0; top: 50%; transform: translateY(-50%); }
.mr-2 { margin-right: 8px; }
.ml-2 { margin-left: 8px; }
.pagination-bar { margin-top: 12px; margin-bottom: 16px; }
.progress-info { font-size: 12px; color: #666; margin-bottom: 8px; text-align: right; }
.modal-row { display: flex; align-items: center; justify-content: space-between; margin: 8px 0; }
/* 完成订单整行浅绿色背景 */
:deep(.row-completed) { background-color: #e8f5e9 !important; }
.handsontable td.row-completed { background-color: #e8f5e9 !important; }
.htCore td.row-completed { background-color: #e8f5e9 !important; }
/* 对账为美团˙已对账且订单未完成 -> 整行浅红色背景 */
:deep(.row-reconciled-red) { background-color: #fdecea !important; }
.handsontable td.row-reconciled-red { background-color: #fdecea !important; }
.htCore td.row-reconciled-red { background-color: #fdecea !important; }
/* 禁止所有表格内容换行（表头与单元格） */
:deep(.handsontable .htCore th),
:deep(.handsontable .htCore td) {
  white-space: nowrap !important;
}
/* 所有内容居中（表头与单元格） */
:deep(.handsontable .htCore th),
:deep(.handsontable .htCore td) {
  text-align: center !important;
}
</style>


