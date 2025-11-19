

<template>
  <div class="page-wrap p-4" ref="wrapperRef">
    <h2 class="text-xl" ref="titleRef">迪波QL</h2>
    <HotTable
      ref="hotTableRef"
      :settings="hotSettings"
      licenseKey="non-commercial-and-evaluation"
      class="excel-table"
    />

    <div class="pagination-bar">
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
import { ref, reactive, nextTick, computed, onMounted } from "vue";
import { HotTable } from "@handsontable/vue3";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/zh-CN"; // 汉化

import { hyGetSettlementData } from "@/api/system/index.js";

// 基础数据模型
const tableData = ref([]);
const colHeaders = ref([]);
const columns = ref([]);
// 分页参数
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);

// Handsontable 设置（响应式）
const hotSettings = reactive({
  data: tableData.value,
  colHeaders: colHeaders.value,
  columns: columns.value,
  stretchH: "all",
  language: "zh-CN",
  height: 600,
  licenseKey: "non-commercial-and-evaluation",
  contextMenu: true,
  filters: true,
  dropdownMenu: true,
  manualColumnResize: true,
  manualRowResize: true,
  autoColumnSize: true,
});

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
  const res = await hyGetSettlementData({
    data: { page: currentPage.value, size: pageSize.value }
  });
  const list = Array.isArray(res?.data) ? res.data : [];
  total.value = Number(res?.total) || list.length;
  if (columns.value.length === 0) {
    initTableFromObjects(list);
  }
  tableData.value = list;
  loadIntoHotTable(tableData.value);
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

// 页面挂载后获取并渲染数据
onMounted(fetchPage);


</script>

<style scoped>
.pagination-bar { margin-top: 12px; }
</style>


