

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-3">📊 Excel 在线编辑器（Vue3 + Handsontable）</h2>

    <div class="mb-3 flex gap-2 flex-wrap items-center">
      <input ref="fileInput" type="file" @change="handleFileUpload" accept=".xlsx,.xls" style="display:none" />
      <el-input v-model="tableName" placeholder="表名（例如：finance_2025_10）" style="width:320px"></el-input>

      <el-button type="primary" @click="openFile">📂 选择 Excel</el-button>
      <el-button @click="exportExcel">💾 导出 Excel</el-button>

      <!-- <el-button @click="addRow">➕ 添加行</el-button> -->
      <!-- <el-button @click="addColumn">➕ 添加列</el-button> -->
      <el-button @click="undo">↩ 撤销</el-button>
      <el-button @click="redo">↪ 重做</el-button>

      <el-button type="success" @click="uploadToDB" :loading="uploading">⬆️ 同步到数据库</el-button>
      <el-button type="info" @click="saveChanges" :loading="saving">💾 保存编辑</el-button>
      <el-button @click="loadFromDB">📥 从数据库加载</el-button>

      <el-divider direction="vertical"></el-divider>
      <div>批次大小：
        <el-input-number v-model="batchSize" :min="100" :max="2000" :step="100" size="small" />
      </div>
    </div>

    <HotTable
      ref="hotTableRef"
      :settings="hotSettings"
      licenseKey="non-commercial-and-evaluation"
      class="excel-table"
    />

    <!-- 分页 -->
    <div class="mt-2 flex justify-end">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="tableData.length"
        @current-change="handlePageChange"
        layout="prev, pager, next, total"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted } from "vue";
import { HotTable } from "@handsontable/vue3";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/zh-CN"; // 汉化
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import useUserStore from '@/store/modules/user'

import { importExcelData, getExcelData } from "@/api/system/index.js";

// 注册 numeric 类型
import { registerCellType, NumericCellType } from "handsontable/cellTypes";
registerCellType("numeric", NumericCellType);

/* ====== refs & state ====== */
const hotTableRef = ref(null);
const fileInput = ref(null);
const tableName = ref("finance_2025_10");
const uploading = ref(false);
const saving = ref(false);
const batchSize = ref(500);
const userStore = useUserStore();

const tableData = ref([]);     // 全部数据
const colHeaders = ref([]);
const columns = ref([]);

// 分页
const currentPage = ref(1);
const pageSize = ref(20); // 每页 20 条

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return tableData.value.slice(start, start + pageSize.value);
});

/* ====== Handsontable 设置 ====== */
// Handsontable配置项 - 使用reactive包装使其具有响应式特性
const hotSettings = reactive({
  // 表格数据来源 - 使用分页数据
  data: pagedData.value,
  // 列标题配置
  colHeaders: colHeaders.value,
  // 列配置 - 包含各列的渲染器、编辑器等设置
  columns: columns.value,
  // 行标题配置 - 当前被注释禁用
  // rowHeaders: true,
  // 启用列筛选功能
  filters: true,
  // 启用下拉菜单功能
  dropdownMenu: true,
  // 启用右键菜单功能
  contextMenu: true,
  // 允许手动调整列宽
  manualColumnResize: true,
  // 允许手动调整行高
  manualRowResize: true,
  // 自动调整列宽以适应内容
  autoColumnSize: true,
  // 水平拉伸模式 - "all"表示所有列平均拉伸填充
  stretchH: "all",
  // 界面语言设置为中文
  language: "zh-CN",
  // 表格高度设置为700px
  height: 700,
  // 许可证密钥 - 非商业和评估使用
  licenseKey: "non-commercial-and-evaluation",
  // 单元格验证失败时应用的CSS类名
  invalidCellClassName: "htInvalid",
  
  // 单元格数据变化后的回调函数
  afterChange(changes, source) {
    // 如果没有变化或变化来源于加载数据，则直接返回
    if (!changes || source === "loadData") return;

    // 标记是否需要重新计算余额
    let needRecalc = false;
    
    // 检查变化的单元格是否影响余额计算
    for (const [row, prop] of changes) {
      // 只有当修改了收入或支出字段时，才需要重新计算余额
      if (prop === "收入" || prop === "支出") {
        needRecalc = true;
        break;
      }
    }
    
    // 如果需要，重新计算余额
    if (needRecalc) calculateBalance();
    
    // 显示修改提示信息
    ElMessage.info("单元格已修改（尚未保存）");
  }
});

/* ====== 初始化示例 ====== */
onMounted(() => {
  const initData = [
    { 日期: "2023-08-17", 摘要: "收到投资款", 收入: 880000.0, 支出: "", 余额: 880000.0, 备注: "zx-1" },
    { 日期: "2023-08-17", 摘要: "支付租金", 收入: "", 支出: 450000.0, 余额: 430000.0, 备注: "zx-2" }
  ];
  initTableFromObjects(initData);
});

/* ====== 初始化表格 ====== */
function initTableFromObjects(objArray) {
  if (!Array.isArray(objArray) || objArray.length === 0) {
    tableData.value = [];
    colHeaders.value = ['序号'];
    columns.value = [{ data: '序号', type: 'text', readOnly: true, width: 60 }];
    hotSettings.data = [];
    return;
  }

  // 复制数据并添加序号列
  tableData.value = JSON.parse(JSON.stringify(objArray)).map((row, index) => {
    return { ...row, '序号': index + 1 };
  });
  
  // 确保序号列在最前面
  const keys = Object.keys(objArray[0]);
  colHeaders.value = ['序号', ...keys];
  
  columns.value = [
    { data: '序号', type: 'text', readOnly: true, width: 60 }
  ];
  
  // 添加其他列配置
  keys.forEach(k => {
    const v = objArray[0][k];
    const isNum = v !== null && v !== "" && !isNaN(Number(v));
    columns.value.push({
      data: k,
      type: isNum ? "numeric" : "text",
      validator: isNum
        ? (value, cb) => cb(value === "" || !isNaN(Number(value)))
        : undefined,
      allowInvalid: true,
      width: 80,
      minWidth: 80,
      maxWidth: 200
    });
  });

  // 初始化第一页
  currentPage.value = 1;
  nextTick(() => loadCurrentPage());
  calculateBalance();
}

/* ====== 翻页 ====== */
function handlePageChange(page) {
  currentPage.value = page;
  loadCurrentPage();
}

function loadCurrentPage() {
  // 确保序号正确更新
  updateRowNumbers();
  
  const hot = hotTableRef.value?.hotInstance;
  if (!hot) return;
  hot.updateSettings({
    data: pagedData.value,
    colHeaders: colHeaders.value,
    columns: columns.value
  });
  hot.loadData(pagedData.value);
  calculateBalance();
}

/* ====== 余额计算 ====== */
function calculateBalance() {
  let balance = 0;
  tableData.value.forEach(row => {
    const income = parseFloat(row.收入) || 0;
    const expense = parseFloat(row.支出) || 0;
    balance += income - expense;
    row['余额'] = Math.round(balance * 100) / 100;
  });
  const hot = hotTableRef.value?.hotInstance;
  if (hot) {
    hot.render();
  }
}

/* ====== 文件导入/导出 ====== */
function openFile() { fileInput.value?.click(); }
async function handleFileUpload(e) {
  const file = e.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!jsonData?.length) return ElMessage.warning("导入为空");
    initTableFromObjects(jsonData);
    ElMessage.success("导入成功");
  };
  reader.readAsArrayBuffer(file);
  e.target.value = "";
}
function exportExcel() {
  const hot = hotTableRef.value?.hotInstance;
  if (!hot) return ElMessage.warning("表格未就绪");
  const ws = XLSX.utils.json_to_sheet(tableData.value, { header: colHeaders.value });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, "导出.xlsx");
  ElMessage.success("已导出 Excel");
}

/* ====== 增删行列 & 撤销重做 ====== */
function addRow() {
  const newRow = {};
  // 为新行设置各列的默认值，但不设置序号
  colHeaders.value.forEach(h => {
    if (h !== '序号') {
      newRow[h] = "";
    }
  });
  tableData.value.push(newRow);
  updateRowNumbers(); // 更新序号
  loadCurrentPage();
}

// 更新所有行的序号
function updateRowNumbers() {
  tableData.value.forEach((row, index) => {
    row['序号'] = index + 1;
  });
}
function addColumn() {
  const newCol = `列${colHeaders.value.length + 1}`;
  colHeaders.value.push(newCol);
  columns.value.push({ data: newCol, type: "text", width: 120, minWidth: 80, maxWidth: 200 });
  tableData.value.forEach(r => r[newCol] = "");
  loadCurrentPage();
}
function undo() { hotTableRef.value?.hotInstance.undo(); }
function redo() { hotTableRef.value?.hotInstance.redo(); }

/* ====== 数据库交互 ====== */
async function uploadToDB() {
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  const rows = tableData.value; if (!rows.length) return ElMessage.warning("无数据上传");
  uploading.value = true;
  try {
    const total = rows.length; const size = batchSize.value || 500;
    for (let i = 0; i < total; i += size) {
      const batch = rows.slice(i, i + size);
      const res = await importExcelData({ tableName: tableName.value, data: batch });
      if (res?.code !== 1) throw new Error(res?.msg || "导入失败");
      ElMessage.success(`已上传 ${Math.min(i+size,total)}/${total}`);
    }
    ElMessage.success(`全部上传完成，共 ${total} 条`);
  } catch (err) { ElMessage.error("上传异常：" + (err.message || err)); }
  finally { uploading.value = false; }
}
async function saveChanges() {
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  const rows = tableData.value; if (!rows.length) return ElMessage.warning("无数据保存");
  saving.value = true;
  try {
    const res = await importExcelData({ tableName: tableName.value, data: rows });
    if (res?.code === 1) ElMessage.success("保存成功"); else throw new Error(res?.msg || "保存失败");
  } catch (err) { ElMessage.error("保存异常：" + (err.message || err)); }
  finally { saving.value = false; }
}
async function loadFromDB() {
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  try {
    const res = await getExcelData({ tableName: tableName.value });
    if (res?.code !== 1) return ElMessage.error("加载失败：" + res?.msg);
    const rows = res.data || [];
    if (!rows.length) return initTableFromObjects([]), ElMessage.info("表中没有数据");
    initTableFromObjects(rows);
    ElMessage.success(`已加载 ${rows.length} 条`);
  } catch (err) { ElMessage.error("加载异常：" + (err.message || err)); }
}
</script>

<style scoped>
.excel-table { width:100%; height:700px; }
:deep(.htInvalid) {
  background: rgba(255,0,0,0.12) !important;
  border: 1px solid rgba(255,0,0,0.2) !important;
}

</style>

