<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-3">📊 Excel 在线编辑器（Vue3 + Handsontable）</h2>

    <div class="mb-3 flex gap-2 flex-wrap">
      <input type="file" @change="handleFileUpload" accept=".xlsx" />
      <button @click="exportExcel">导出 Excel</button>
      <button @click="addRow">➕ 添加行</button>
      <button @click="addColumn">➕ 添加列</button>
      <button @click="undo">↩ 撤销</button>
      <button @click="redo">↪ 重做</button>
    </div>

    <HotTable
      ref="hotTableRef"
      :data="tableData"
      :colHeaders="colHeaders"
      :columns="columns"
      :rowHeaders="true"
      :filters="true"
      :dropdownMenu="true"
      :contextMenu="true"
      :manualColumnResize="true"
      :manualRowResize="true"
      :autoColumnSize="true"
      :stretchH="'all'"
      :language="'zh-CN'"
      :height="600"
      :licenseKey="'non-commercial-and-evaluation'"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from "vue";
import { HotTable } from "@handsontable/vue3";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/zh-CN"; // ✅ 汉化菜单
import * as XLSX from "xlsx";

// ✅ 注册数字类型（修复 numeric 报错）
import { registerCellType, NumericCellType } from "handsontable/cellTypes";
registerCellType("numeric", NumericCellType);

const hotTableRef = ref(null);
const tableData = ref([]);
const colHeaders = ref([]);
const columns = ref([]);

// ✅ 初始化默认数据（页面打开就能看到）
onMounted(async () => {
  const initData = [
    { 姓名: "张三", 工资: 5000 },
    { 姓名: "李四", 工资: 7000 },
  ];
  const keys = Object.keys(initData[0]);
  colHeaders.value = keys;
  columns.value = keys.map(k => ({
    data: k,
    type: isNaN(initData[0][k]) ? "text" : "numeric",
    validator: k === "工资" ? v => !isNaN(v) : null,
    allowInvalid: false,
  }));
  tableData.value = initData;
  
  // 等待DOM更新后，强制加载数据到Handsontable实例
  await nextTick();
  if (hotTableRef.value) {
    const hot = hotTableRef.value.hotInstance;
    hot.loadData(initData); // 确保数据正确显示
  }
});

// ✅ 导入 Excel 文件
function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async ev => {
    const data = new Uint8Array(ev.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // ✅ 保留空单元格

    if (jsonData.length === 0) return alert("⚠️ Excel 文件为空！");

    const keys = Object.keys(jsonData[0]);
    colHeaders.value = [...keys];
    columns.value = keys.map(k => ({
      data: k,
      type: isNaN(jsonData[0][k]) ? "text" : "numeric",
    }));

    await nextTick();

    const hot = hotTableRef.value.hotInstance;
    hot.loadData(jsonData); // ✅ 强制加载数据（防止只显示表头）

    setTimeout(() => alert("✅ 导入成功，已更新表格！"), 200);
  };
  reader.readAsArrayBuffer(file);
}

// ✅ 导出 Excel
function exportExcel() {
  const data = hotTableRef.value.hotInstance.getData();
  const headers = colHeaders.value;
  const json = data.map(row => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
  const ws = XLSX.utils.json_to_sheet(json);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, "导出.xlsx");
}

// ✅ 添加行
function addRow() {
  hotTableRef.value.hotInstance.alter("insert_row", null);
}

// ✅ 添加列
function addColumn() {
  const hot = hotTableRef.value.hotInstance;
  const newColIndex = hot.countCols();
  const newColName = "列" + (newColIndex + 1);
  colHeaders.value.push(newColName);
  columns.value.push({ data: newColName, type: "text" });
  hot.updateSettings({
    colHeaders: colHeaders.value,
    columns: columns.value,
  });
}

// ✅ 撤销 / 重做
function undo() {
  hotTableRef.value.hotInstance.undo();
}
function redo() {
  hotTableRef.value.hotInstance.redo();
}
</script>

<style scoped>
button {
  background: #2563eb;
  color: white;
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 14px;
}
button:hover {
  background: #1d4ed8;
}
</style>
