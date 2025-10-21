

<template>
  <div class="p-4">
    <h2 class="text-xl font-bold mb-3">📊 Excel 在线编辑器（Vue3 + Handsontable）</h2>

    <div class="mb-3 flex gap-2 flex-wrap items-center">
      <input ref="fileInput" type="file" @change="handleFileUpload" accept=".xlsx,.xls" style="display:none" />
      <el-input v-model="tableName" placeholder="表名（例如：finance_2025_10）" style="width:320px"></el-input>

      <el-button type="primary" @click="openFile">📂 选择 Excel</el-button>
      <el-button @click="exportExcel">💾 导出 Excel</el-button>

      <el-button @click="addRow">➕ 添加行</el-button>
      <!-- <el-button @click="addColumn">➕ 添加列</el-button> -->
      <!-- <el-button @click="undo">↩ 撤销</el-button> -->
      <!-- <el-button @click="redo">↪ 重做</el-button> -->

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
        v-model:page-size="pageSize"
        :total="tableData.length"
        :page-sizes="[25, 50, 100, 200, 500,1000,3000,5000]"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        layout="prev, pager, next, total, sizes"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted } from "vue";

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
import { HotTable } from "@handsontable/vue3";
import Handsontable from "handsontable";
import "handsontable/dist/handsontable.full.min.css";
import "handsontable/languages/zh-CN"; // 汉化
import * as XLSX from "xlsx";
import { ElMessage } from "element-plus";
import useUserStore from '@/store/modules/user'

import { importExcelData, getExcelData } from "@/api/system/index.js";
import { getCashSummaryList } from "@/api/system/index.js";

// 注册 numeric 类型和日期选择器插件
import { registerCellType, NumericCellType, AutocompleteCellType } from "handsontable/cellTypes";
registerCellType("numeric", NumericCellType);
registerCellType("autocomplete", AutocompleteCellType);

// 常用摘要关键词，用于输入联想（从API获取）
const commonKeywords = ref([]);

/* ====== refs & state ====== */
const hotTableRef = ref(null);
const fileInput = ref(null);
const tableName = ref("finance_2025_10");
const uploading = ref(false);
const saving = ref(false);
const batchSize = ref(1000);
const userStore = useUserStore();
const loadingKeywords = ref(false);

const tableData = ref([]);     // 全部数据
const colHeaders = ref([]);
const columns = ref([]);

// 分页
const currentPage = ref(1);
const pageSize = ref(25); // 每页 20 条

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
  // 启用日期选择器插件***********************************************************
  // plugins: [DatePicker],
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

// 获取历史摘要列表
const getHistorySummaries = async () => {
  if (loadingKeywords.value) return;
  
  try {
    loadingKeywords.value = true;
    const res = await getCashSummaryList({
      username: userStore.name,
      data: {
        // 不指定特定公司和银行，获取所有可用的摘要
        summary: ""
      }
    });
    commonKeywords.value = res.data || [];
  } catch (error) {
    console.error('获取历史摘要失败', error);
    // 错误时使用默认关键词作为备选
    commonKeywords.value = [
      '收到投资款', '支付租金', '办公费用', '差旅费', '工资支出',
      '销售收入', '采购成本', '水电费', '通讯费', '交通费',
      '广告宣传', '业务招待', '税费缴纳', '社保公积金', '报销费用'
    ];
  } finally {
    loadingKeywords.value = false;
  }
};

/* ====== 初始化示例 ====== */
onMounted(async () => {
  // 先获取历史摘要
  await getHistorySummaries();
  
  const initData = [
    { 日期: "2023-08-17", 摘要: "收到投资款", 收入: 880000.0, 支出: "", 余额: 880000.0, 备注: "zx-1" },
    { 日期: "2023-08-17", 摘要: "支付租金", 收入: "", 支出: 450000.0, 余额: 430000.0, 备注: "zx-2" }
  ];
  initTableFromObjects(initData);
});

/* ====== Excel日期转换工具函数 ====== */
function excelNumberToDate(excelNum) {
  // Excel日期起点是1899-12-30
  const excelEpoch = new Date(1899, 11, 30);
  // 计算天数和时间部分
  const days = Math.floor(excelNum);
  const time = excelNum - days;
  // 创建日期对象
  const date = new Date(excelEpoch);
  date.setDate(date.getDate() + days);
  // 添加时间部分
  const hours = Math.floor(time * 24);
  const minutes = Math.floor((time * 24 * 60) % 60);
  const seconds = Math.floor((time * 24 * 60 * 60) % 60);
  date.setHours(hours, minutes, seconds, 0);
  
  // 格式化日期时间为YYYY-MM-DD HH:MM:SS
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
}

// 检查是否可能是Excel日期格式的数字
function isPossibleExcelDate(value) {
  // Excel日期范围通常在2000-2050年之间，对应数字范围约为36526-54789
  // 允许一定的范围，也考虑小数（时间部分）
  return typeof value === 'number' && value > 20000 && value < 60000;
}

// 检测列是否可能是日期列
function isDateColumn(columnName, sampleData) {
  // 基于列名判断
  const dateRelatedNames = ['日期', 'date', '时间', 'time', 'datetime', '时间戳'];
  const lowerColumnName = columnName.toLowerCase();
  
  // 如果列名包含日期相关词汇
  for (const name of dateRelatedNames) {
    if (lowerColumnName.includes(name)) {
      return true;
    }
  }
  
  // 基于数据判断：如果样本数据中有多个可能的Excel日期格式数字
  let excelDateCount = 0;
  for (const value of sampleData) {
    if (isPossibleExcelDate(value)) {
      excelDateCount++;
    }
  }
  
  // 如果超过30%的数据是可能的Excel日期格式，则认为是日期列
  return sampleData.length > 0 && (excelDateCount / sampleData.length) > 0.3;
}

/* ====== 初始化表格 ====== */
function initTableFromObjects(objArray) {
  if (!Array.isArray(objArray) || objArray.length === 0) {
    tableData.value = [];
    colHeaders.value = ['序号'];
    columns.value = [{ data: '序号', type: 'text', readOnly: true, width: 60 }];
    hotSettings.data = [];
    return;
  }

  // 复制数据并添加序号列，同时转换Excel日期格式
  const keys = Object.keys(objArray[0]);
  
  // 识别日期列
  const dateColumns = new Set();
  // 识别订单号等需要作为文本处理的列
  const textColumns = new Set();
  
  keys.forEach(key => {
    // 收集样本数据用于判断
    const sampleData = objArray.slice(0, 10).map(row => row[key]);
    
    // 识别日期列
    if (isDateColumn(key, sampleData)) {
      dateColumns.add(key);
    }
    
    // 识别订单号列，强制作为文本处理
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('订单号') || lowerKey.includes('orderno') || 
        lowerKey.includes('order_no') || lowerKey.includes('订单编号') ||
        lowerKey.includes('Number') || lowerKey.includes('编号') ||
        lowerKey.includes('单号') || lowerKey.includes('serial')) {
      textColumns.add(key);
    }
    
    // 检查是否包含长数字（可能是订单号）
    for (const value of sampleData) {
      if (typeof value === 'number') {
        const numStr = value.toString();
        // 如果数字长度超过15位，通常是需要作为文本处理的长订单号
        if (numStr.length > 15) {
          textColumns.add(key);
          break;
        }
      }
    }
  });
  
  // 复制数据并转换日期
  tableData.value = JSON.parse(JSON.stringify(objArray)).map((row, index) => {
    const processedRow = { ...row, '序号': index + 1 };
    
    // 转换日期列中的Excel数字格式
    dateColumns.forEach(col => {
      if (isPossibleExcelDate(processedRow[col])) {
        processedRow[col] = excelNumberToDate(processedRow[col]);
      }
    });
    
    return processedRow;
  });
  
  // 确保序号列在最前面
  // const keys = Object.keys(objArray[0]);
  colHeaders.value = ['序号', ...keys];
  
  columns.value = [
    { data: '序号', type: 'text', readOnly: true, width: 60 }
  ];
  
  // 添加其他列配置
  keys.forEach(k => {
    const v = objArray[0][k];
    const isNum = v !== null && v !== "" && !isNaN(Number(v));
    
    // 创建列配置
    const columnConfig = {
      data: k,
      // 如果是日期列，使用date类型；如果是订单号列，强制使用文本类型；否则根据数据类型决定
      type: dateColumns.has(k) ? "date" : (textColumns.has(k) ? "text" : (isNum ? "numeric" : (k === "摘要" ? "autocomplete" : "text"))),
      allowInvalid: true,
    };
    
    // 为日期列配置日期选择器
    if (dateColumns.has(k)) {
      columnConfig.dateFormat = 'YYYY-MM-DD';
      columnConfig.correctFormat = true;
    }
        // 如果是“摘要”列，设置列宽为300
    if (k === "摘要") {
      columnConfig.width = 600;
    }

    
    // 对于订单号列，确保输入时也作为文本处理
    if (textColumns.has(k)) {
      columnConfig.editor = "text";
      columnConfig.format = null;
    }
    
    // 添加验证器
    if (isNum) {
      columnConfig.validator = (value, cb) => cb(value === "" || !isNaN(Number(value)));
    }
    
    // 为摘要列配置输入联想
    if (k === "摘要") {
      // 创建防抖的API调用函数，2000ms后执行，确保用户有充足时间完成输入
        const debouncedFetchSummaries = debounce(async (query, callback) => {
          // 先进行trim处理
          const trimmedQuery = query ? query.trim() : '';
          
          // 判断是否为纯中文
          const isChineseOnly = trimmedQuery && /^[\u4e00-\u9fa5]+$/.test(trimmedQuery);
          
          // 严格限制：只有当输入不为空、长度至少为2个字符（纯中文可以放宽到2个）或包含完整的词语模式时才触发API请求
          if (!trimmedQuery || loadingKeywords.value || 
              // 基础长度限制：至少2个字符（纯中文）或3个字符（其他情况）
              (isChineseOnly && trimmedQuery.length < 2) || 
              (!isChineseOnly && trimmedQuery.length < 3) ||
              // 排除混合中英文的情况
              (/\w+/.test(trimmedQuery) && /[\u4e00-\u9fa5]+/.test(trimmedQuery))) {
            // 如果有回调，返回空数组或本地过滤结果
              if (callback) {
                const filtered = commonKeywords.value.filter(item => 
                  item && item.toLowerCase().includes(trimmedQuery.toLowerCase())
                );
                console.log('【本地过滤】输入条件不满足API调用，返回本地过滤结果:', filtered.length, '条');
                callback(filtered);
              }
            return;
          }
          
          try {
            loadingKeywords.value = true;
            // 等待API请求返回结果
            const res = await getCashSummaryList({
              username: userStore.name,
              data: {
                summary: trimmedQuery
              }
            });
            
            // 将新获取的摘要添加到现有列表中
            const newSummaries = res.data || [];
            // 合并并去重
            const uniqueSummaries = [...new Set([...commonKeywords.value, ...newSummaries])];
            commonKeywords.value = uniqueSummaries;
            
            // API请求返回后，再查找匹配结果并回调
            if (callback) {
              // 使用完整的关键词列表进行过滤
              const finalResults = uniqueSummaries.filter(item => 
                item && item.toLowerCase().includes(trimmedQuery.toLowerCase())
              );
              console.log('【API回调】API请求完成，过滤结果数量:', finalResults.length, '条');
              // 确保回调只在API请求完成后执行一次
              callback(finalResults.length > 0 ? finalResults : ['未找到匹配结果']);
            }
          } catch (err) {
            console.error('获取最新摘要失败', err);
            // 错误处理：即使API失败，也返回本地过滤结果
            if (callback) {
              const filtered = commonKeywords.value.filter(item => 
                item && item.toLowerCase().includes(trimmedQuery.toLowerCase())
              );
              callback(filtered.length > 0 ? filtered : ['获取数据失败，显示本地结果']);
            }
          } finally {
            loadingKeywords.value = false;
          }
        }, 2000); // 2000ms延迟，确保用户完成输入

      columnConfig.source = function(query, processCallback) {
          // 测试日志：打印用户正在输入的摘要内容及上下文信息
          console.log('【实时输入】用户输入的摘要(搜索关键词):', query, '长度:', query?.length, '当前关键词列表数量:', commonKeywords.value.length);
          
          // 检查是否处于输入法中间状态（包含拼音分隔符等）
          const isComposingState = query && 
                // 只检测引号和混合中英文的情况，不再检测空格
                (/['`]/.test(query) || 
                 // 混合中英文模式
                 (/\w+/.test(query) && /[\u4e00-\u9fa5]+/.test(query)));
          
          // 如果正在加载关键词，显示加载中状态
          if (loadingKeywords.value) {
            processCallback(['加载中...']);
            return;
          }
          
          // 对于输入法中间状态，返回空数组以避免干扰输入体验
          if (isComposingState) {
            console.log('【输入法状态】检测到输入法中间状态，暂停处理');
            processCallback([]);
            return;
          }
          
          // 当用户输入长度达到一定条件时，调用API请求
          // 等待API返回后再查找并显示结果
          const trimmedQuery = query ? query.trim() : '';
          const isChineseOnly = trimmedQuery && /^[\u4e00-\u9fa5]+$/.test(trimmedQuery);
          
          if (trimmedQuery && 
              ((isChineseOnly && trimmedQuery.length >= 2) || 
               (!isChineseOnly && trimmedQuery.length >= 3))) {
            // 先显示加载状态
            processCallback(['加载中...']);
            // 调用防抖的API函数，传入processCallback以在API返回后处理结果
              console.log('【API触发】满足条件，触发API调用:', trimmedQuery, '纯中文:', isChineseOnly);
              debouncedFetchSummaries(trimmedQuery, processCallback);
          } else {
            // 输入较短时，只使用本地过滤结果
            const filtered = commonKeywords.value.filter(item => 
              item && item.toLowerCase().includes((query || '').toLowerCase())
            );
            processCallback(filtered);
          }
        };
        
        // 合并单元格事件处理，避免重复定义
        columnConfig.cells = function(row, col, prop) {
          const cellProperties = {};
          
          cellProperties.afterSetValue = function(val) {
            // 测试日志：打印用户最终确认输入的摘要内容及详细信息
            console.log('【确认输入】用户确认输入的摘要(最终值):', val, '类型:', typeof val);
            
            // 用户确认输入（按下Enter或失去焦点）后，如果输入的值符合条件
            if (val && typeof val === 'string' && val.trim() && val.trim().length >= 2) {
              const trimmedVal = val.trim();
              
              // 测试日志：打印处理后的摘要值和详细信息
              console.log('【值处理】处理后的摘要值(trim):', trimmedVal, '长度:', trimmedVal.length);
              console.log('【关键词检查】当前关键词列表数量:', commonKeywords.value.length, '是否已存在:', commonKeywords.value.includes(trimmedVal));
              
              // 使用一个单独的延迟函数，确保在用户完全完成编辑后才执行
              setTimeout(() => {
                // 直接更新本地列表，不触发额外的API请求
                if (!commonKeywords.value.includes(trimmedVal)) {
                  commonKeywords.value.push(trimmedVal);
                  console.log('【关键词更新】新摘要已添加到关键词列表:', trimmedVal);
                }
              }, 300);
              
              // 如果输入的值不在现有关键词列表中，调用API获取相关摘要
              if (!commonKeywords.value.some(item => item === trimmedVal)) {
                console.log('【API调用】摘要不在现有列表中，准备调用API获取相关摘要:', trimmedVal);
                debouncedFetchSummaries(trimmedVal);
              }
            }
          };
          
          return cellProperties;
        };
      
      // 重要：禁用严格模式和验证，允许任何输入值
      columnConfig.strict = false; // 允许输入不在建议列表中的值
      columnConfig.allowInvalid = true; // 允许无效值，避免输入后出现下划线
      columnConfig.trimDropdown = false; // 不过滤空白项
    }
    
    columns.value.push(columnConfig);
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

// 处理每页显示条数变化
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1; // 重置为第一页
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
    
    // 使用原始方式读取，不自动转换，保留Excel的数字格式
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
    
    if (!jsonData?.length) return ElMessage.warning("导入为空");
    
    // 处理可能的长订单号，确保它们作为字符串处理
    const processedData = jsonData.map(row => {
      const processedRow = { ...row };
      Object.keys(processedRow).forEach(key => {
        const value = processedRow[key];
        // 检查是否为长数字（可能是订单号）
        if (typeof value === 'number') {
          const numStr = value.toString();
          // 如果数字长度超过15位，将其转换为字符串以保留完整值
          if (numStr.length > 15) {
            processedRow[key] = numStr;
          }
        }
      });
      return processedRow;
    });
    
    // 初始化表格，会在initTableFromObjects中进行日期转换
    // initTableFromObjects(processedData);
     initTableFromObjects(jsonData);
    ElMessage.success("导入成功，已自动转换Excel日期格式和长订单号");
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
    const res = await getExcelData({ tableName: tableName.value ,rolesId:userStore.name});
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

