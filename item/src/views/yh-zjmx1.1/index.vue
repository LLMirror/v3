

<template>
  <div class="page-wrap p-4" ref="wrapperRef">
    <h2 class="text-xl" ref="titleRef">出纳资金明细登记表</h2>
    <div class="mb-3 flex gap-2 flex-wrap items-center tool-bar" ref="toolsRef">
         <el-cascader
        v-model="selectedCompanyBank"
        :options="companyBankOptions"
        :props="{ checkStrictly: true, expandTrigger: 'hover' }"
        placeholder="选择公司和银行"
        class="mr-2"
        style="width: 560px; margin-right: 16px;"
      />
      <el-input
        v-model="summaryKeyword"
        placeholder="摘要关键词"
        clearable
        style="width: 300px; margin-right: 16px;"
      />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        unlink-panels
        clearable
        style="width: 200px; margin-right: 16px;"
      />

      <el-button type="warning" plain  @click="clearCompanyBankFilter">清空筛选</el-button>
      <el-button @click="exportExcel" >💾 导出 Excel</el-button>
      <el-button @click="addRow">➕ 添加行</el-button>
      <el-button @click="loadFromDB" type="primary">查询</el-button>

      <!-- <el-button type="info" @click="saveChanges" :loading="saving">💾 保存编辑</el-button>  -->
    </div>

    <HotTable
      ref="hotTableRef"
      :settings="hotSettings"
      licenseKey="non-commercial-and-evaluation"
      class="excel-table"
    />

    <!-- 分页 -->
    <div class="mt-2 flex justify-end pagination-bar" ref="paginationRef">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[50, 100, 200, 500,1000,3000,5000]"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
        layout="prev, pager, next, total, sizes"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, computed, onMounted, onBeforeUnmount, watch } from "vue";
import md5 from 'js-md5';

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

import { upSettlementData,getSettlementData,getSettlementCompanyBank,getCashSummaryList,addSettlementData,updateSettlementData,deleteSettlementData,getMaxId, getMoreAll } from "@/api/system/index.js";
import { getBiaoqianTagsByUser } from '@/api/biaoqian/index.js'

// 注册 numeric 类型和日期选择器插件
import { registerCellType, NumericCellType, AutocompleteCellType } from "handsontable/cellTypes";
registerCellType("numeric", NumericCellType);
registerCellType("autocomplete", AutocompleteCellType);

// 常用摘要关键词，用于输入联想（从API获取）
const commonKeywords = ref([]);
// 公司列表及ID映射
const moreList = ref([]);
const moreMap = ref({});
// 标签下拉选项（默认值 + 动态汇总）
const tagOptions = ref([
  '差旅费', '办公费', '工资', '福利费', '税费', '利息', '还款', '餐费', '往来款','保证金'
]);
// 摘要关键词筛选
const summaryKeyword = ref('');
// 日期区间筛选
const dateRange = ref([]);

/* ====== refs & state ====== */
const hotTableRef = ref(null);
const fileInput = ref(null);
const tableName = ref("pt_cw_zjmxb");
const uploading = ref(false);
const saving = ref(false);
const batchSize = ref(1000);
const userStore = useUserStore();
const loadingKeywords = ref(false);

// 加载当前登录公司标签选项（后端按 roles_id 限制）
async function loadCompanyTags() {
  try {
    const res = await getBiaoqianTagsByUser();
    const serverTags = Array.isArray(res?.data) ? res.data : [];
    // 去重并覆盖默认，确保只使用公司标签
    tagOptions.value = Array.from(new Set(serverTags.map(s => String(s).trim()).filter(s => s)));
  } catch (e) {
    console.warn('获取公司标签失败，继续使用默认标签', e);
  }
}

// 自适应高度相关
const wrapperRef = ref(null);
const toolsRef = ref(null);
const titleRef = ref(null);
const paginationRef = ref(null);
const tableHeight = ref(700);
// 在 Windows 浏览器上，滚动高度计算容易出现几像素的误差，导致最后几行不可达
const isWindows = typeof navigator !== 'undefined' && /windows/i.test(navigator.userAgent || '');
const updateTableHeight = debounce(() => {
  nextTick(() => {
    const hot = hotTableRef.value?.hotInstance;
    const rootEl = hot?.rootElement || hotTableRef.value?.$el;
    const pagH = paginationRef.value?.offsetHeight || 0;
    // 计算 Handsontable 容器到视口底部的剩余空间，确保铺满到可视区域底部
    let available = 700;
    try {
      const top = rootEl?.getBoundingClientRect?.().top || 0;
      const viewportH = window.innerHeight;
      // 预留底部安全距离（包含分页条和内边距）
      const bottomPadding = 24 + pagH;
      available = Math.max(300, viewportH - top - bottomPadding);
      // Windows 上加一点渲染缓冲避免最后几行不可达（滚动条与像素取整差异）
      if (isWindows) available = available + 6;
    } catch (e) {
      // 兜底：使用原有容器高度计算
      const wrap = wrapperRef.value;
      const toolsH = toolsRef.value?.offsetHeight || 0;
      const titleH = titleRef.value?.offsetHeight || 0;
      const wrapH = wrap?.clientHeight || 700;
      const padding = 24;
      available = Math.max(300, wrapH - toolsH - titleH - pagH - padding);
    }

    tableHeight.value = available;
    hotSettings.height = available;
    if (hot) hot.updateSettings({ height: available });
  });
}, 100);

const tableData = ref([]);     // 全部数据
const colHeaders = ref([]);
const columns = ref([]);
// 分页总数（优先使用后端返回的 total）
const total = ref(0);
// 使用服务端分页：页码变化时向后端请求对应页数据
const serverPaging = ref(true);

// 分页
const currentPage = ref(1);
const pageSize = ref(50); // 每页 20 条
// 用于服务端分页时的“前缀余额”（前面所有页的净额累计）
const balancePrefix = ref(0);
// 删除前行快照（在 beforeRemoveRow 捕获，afterRemoveRow 使用）
const deleteSnapshot = ref([]);

const pagedData = computed(() => {
  // 服务端分页直接使用当前页的数据；前端分页才做切片
  if (serverPaging.value) return tableData.value;
  const start = (currentPage.value - 1) * pageSize.value;
  return tableData.value.slice(start, start + pageSize.value);
});

// 在script setup中添加以下响应式数据
const selectedCompanyBank = ref([]);
const companyBankOptions = ref([
  // 示例数据结构，实际使用时需从API获取
  {
    id: 1,
    name: '公司A',
    banks: [
      { id: 101, name: '银行A1' },
      { id: 102, name: '银行A2' }
    ]
  },
  {
    id: 2,
    name: '公司B',
    banks: [
      { id: 201, name: '银行B1' },
      { id: 202, name: '银行B2' }
    ]
  }
]);
 let index =ref(0)
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
  // 自适应表格高度
  height: tableHeight.value,
  // 许可证密钥 - 非商业和评估使用
  licenseKey: "non-commercial-and-evaluation",
  // 视口渲染缓冲：为避免在不同系统上出现滚动边界误差，这里增加行渲染缓冲
  viewportRowRenderingOffset: 6,
  // 启用日期选择器插件***********************************************************
  // plugins: [DatePicker],
  // 单元格验证失败时应用的CSS类名
  invalidCellClassName: "htInvalid",
  // 禁止“标签”列的手动打字，仅允许通过下拉选择
  beforeKeyDown: (e) => {
    try {
      const hot = hotTableRef.value?.hotInstance;
      if (!hot) return;
      const sel = hot.getSelectedLast?.();
      if (!Array.isArray(sel)) return;
      const viewCol = sel[1];
      const prop = columns.value?.[viewCol]?.data;
      if (prop === '标签' || prop === '公司') {
        const allowed = new Set(['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
        const isPrintable = e?.key && e.key.length === 1;
        const blockedKeys = ['Backspace', 'Delete', 'Home', 'End'];
        const shouldBlock = isPrintable || blockedKeys.includes(e.key);
        if (shouldBlock && !allowed.has(e.key)) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        }
      }
    } catch (err) {
      console.warn('beforeKeyDown 处理失败:', err);
    }
  },
  
  // 单元格数据变化后的回调函数
  afterChange: async (changes, source) => {
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
    
    // 获取修改的页内行索引并映射为全局索引
    const rowInPage = changes[0][0];
    const baseIndex = serverPaging.value ? 0 : (currentPage.value - 1) * pageSize.value;
    const absIndex = baseIndex + rowInPage;
    console.log('📝 修改事件触发:', { rowInPage, absIndex }, decryptMD5(tableData.value[absIndex]?.unique_key || '无unique_key'));
    
    // 确保行数据存在
    if (!tableData.value[absIndex]) {
      console.error('❌ 尝试更新不存在的行:', index);
      return;
    }
    
    // 修改当前单元格的unique_key
    try {
      tableData.value[absIndex].unique_key = await generateUniqueKey(tableData.value[absIndex]);
      console.log(`更新行 ${absIndex} 的unique_key:`, tableData.value[absIndex].unique_key);
      
      // 更新数据到服务器
      await update_SettlementData(tableData.value[absIndex]);
      
      // 重新渲染表格
      const hot = hotTableRef.value?.hotInstance;
      if (hot) {
        hot.render();
      }
    } catch (error) {
      console.error('❌ 更新过程出错:', error);
      ElMessage.error(`更新失败: ${error.message || '未知错误'}`);
    }
  },

  // 粘贴操作后触发的回调函数
  afterPaste: async function(changes, coords) {
    console.log('📋 粘贴操作完成:', { changes, coords });
    
    // 处理粘贴后的数据同步和唯一键生成
    if (changes && changes.length > 0) {
      // 获取所有被粘贴的唯一行索引
      const pastedRows = new Set();
      changes.forEach((change) => {
        const [rowInPage] = change;
        if (rowInPage !== undefined) {
          pastedRows.add(rowInPage);
        }
      });
      
      // 为每个被粘贴的行生成唯一键
      for (const rowInPage of pastedRows) {
        const baseIndex = serverPaging.value ? 0 : (currentPage.value - 1) * pageSize.value;
        const absIndex = baseIndex + rowInPage;
        if (tableData.value[absIndex]) {
          try {
            tableData.value[absIndex].unique_key = await generateUniqueKey(tableData.value[absIndex]);
            console.log(`更新粘贴行 ${absIndex} 的unique_key:`, tableData.value[absIndex].unique_key);
            
            // 为粘贴的每一行也调用更新接口
            await update_SettlementData(tableData.value[absIndex]);
          } catch (error) {
            console.error(`❌ 更新粘贴行 ${absIndex} 失败:`, error);
          }
        }
      }
      
      // 重新渲染表格
      const hot = hotTableRef.value?.hotInstance;
      if (hot) {
        hot.render();
      }
    }
    
    // 触发提示
    ElMessage.success('数据粘贴完成，已自动生成唯一标识并同步到服务器');
  },

  // 删除行前触发：捕获将要删除的行的快照，避免删除后索引错位
  beforeRemoveRow: (index, amount, physicalRows, source) => {
    const baseIndex = serverPaging.value ? 0 : (currentPage.value - 1) * pageSize.value;
    const absIndices = (Array.isArray(physicalRows) && physicalRows.length > 0)
      ? physicalRows.map(r => baseIndex + r)
      : Array.from({ length: amount }, (_, k) => baseIndex + index + k);
    deleteSnapshot.value = absIndices
      .map(i => ({ i, row: tableData.value[i] }))
      .filter(item => !!item.row);
    console.log('🧊 删除前快照:', deleteSnapshot.value);
  },

    // === 1️⃣ 修改数据时触发 ===
  // afterChange: async (changes, source) => {
   
  // },

  

  // === 2️⃣ 新增行时触发 ===
  afterCreateRow: async (index, amount, source) => {
    console.log('➕ 新增行事件触发:', { index, amount, source })
    if (!tableName.value) {
      ElMessage.warning('请先填写表名');
      return;
    }

    try {
      // 计算全局插入起始索引（页内索引 -> 全局索引）
      const startAbsIndex = (currentPage.value - 1) * pageSize.value + index;

      // 先获取一次最大id，后续逐个递增使用，减少请求次数
      let nextId = null;
      try {
        const res = await getMaxId({ tableName: tableName.value });
        if (res?.code === 1) {
          const d = res?.data;
          if (typeof d === 'number') nextId = d ;
          else if (d && typeof d.nextId === 'number') nextId = d.nextId;
          else if (d && typeof d.maxId === 'number') nextId = d.maxId ;
        }
      } catch (err) {
        console.warn('获取最大id失败，使用本地递增回退', err);
      }
      if (!nextId) {
        const localMax = tableData.value.reduce((max, row) => {
          const v = Number(row?.id);
          return Number.isFinite(v) ? Math.max(max, v) : max;
        }, 0);
        nextId = localMax ;
      }

      // 逐行插入
      for (let k = 0; k < amount; k++) {
        const newRow = {};
        // 默认空值
        colHeaders.value.forEach(h => {
          if (h !== '序号') newRow[h] = '';
        });
        // 复制上一行的 公司/银行/日期
        const prev = tableData.value[startAbsIndex + k - 1] || tableData.value[startAbsIndex - 1] || tableData.value[tableData.value.length - 1] || null;
        if (prev) {
          newRow['公司'] = prev['公司'] ?? '';
          newRow['银行'] = prev['银行'] ?? '';
          newRow['日期'] = prev['日期'] ?? '';
        }

        // 数值列默认值
        newRow['收入'] = Number(newRow['收入']) || 0;
        newRow['支出'] = Number(newRow['支出']) || 0;
        newRow['余额'] = Number(newRow['余额']) || 0;

        // 生成 id
        newRow['id'] = nextId++;

        // 生成唯一键
        try {
          newRow['unique_key'] = await generateUniqueKey(newRow);
        } catch (e) {
          console.warn('生成 unique_key 失败，将在后续编辑时更新', e);
          newRow['unique_key'] = '';
        }

        // 先调用后端新增，确保 id 立即保存
        try {
          const res = await addSettlementData({
            tableName: tableName.value,
            data: {
              unique_key: newRow['unique_key'],
              '日期': newRow['日期'] || '',
              '公司': newRow['公司'] || '',
              'more_id': moreMap.value[newRow['公司']] || null,
              '银行': newRow['银行'] || '',
              '摘要': newRow['摘要'] || '',
              '收入': newRow['收入'] || 0,
              '支出': newRow['支出'] || 0,
              '余额': newRow['余额'] || 0,
              '备注': newRow['备注'] || '',
              '发票': newRow['发票'] || '',
              '序号': startAbsIndex + k + 1,
              'id': newRow['id']
            }
          });
          if (res?.code !== 1) {
            ElMessage.error(res?.msg || '新增失败');
            continue; // 跳过本地插入，保持一致
          }
        } catch (err) {
          ElMessage.error('新增异常：' + (err.message || err));
          continue;
        }

        // 在全局数据集插入到指定位置
        tableData.value.splice(startAbsIndex + k, 0, newRow);
      }

      // 刷新序号与当前页
      updateRowNumbers();
      loadCurrentPage();
      ElMessage.success(`已插入 ${amount} 行`);
    } catch (err) {
      console.error('❌ 插入流程异常:', err);
      ElMessage.error(`插入流程异常：${err.message || err}`);
    }
  },

  // === 3️⃣ 删除行时触发 ===
  afterRemoveRow: async (index, amount, physicalRows, source) => {
    console.log('🗑 删除行事件触发:', { index, amount, physicalRows, source })
    if (!tableName.value) {
      ElMessage.warning('请先填写表名');
      return;
    }

    try {
      // 计算当前页在全局数据中的起始索引（服务器分页时，pagedData 已是当前页，起始为 0）
      const baseIndex = serverPaging.value ? 0 : (currentPage.value - 1) * pageSize.value;

      // 优先使用 physicalRows（更可靠，考虑排序/筛选后真实的页内索引）
      const absIndices = (Array.isArray(physicalRows) && physicalRows.length > 0)
        ? physicalRows.map(r => baseIndex + r)
        : Array.from({ length: amount }, (_, k) => baseIndex + index + k);

      console.log('🔢 计算删除的全局索引:', absIndices);

      // 优先使用删除前快照，若不存在则按当前索引映射
      const rowsToDelete = (deleteSnapshot.value && deleteSnapshot.value.length > 0)
        ? deleteSnapshot.value
        : absIndices.map(i => ({ i, row: tableData.value[i] })).filter(item => !!item.row);
      console.log('🧾 待删除行集合:', rowsToDelete);

      // 先调用后端删除（优先使用 id；无 id 时使用 unique_key），未保存的新行只做本地删除
      for (const { i, row } of rowsToDelete) {
        console.log('🧾 准备删除行:', { index: i, id: row?.id, unique_key: row?.unique_key, 摘要: row?.['摘要'] })
        const payload = {};
        if (row && row.id != null && row.id !== '') payload.id = row.id;
        if (row && row.unique_key) payload.unique_key = row.unique_key;

        if (Object.keys(payload).length > 0) {
          try {
            const res = await deleteSettlementData({
              tableName: tableName.value,
              id: payload.id
            });
            if (res?.code !== 1) {
              console.error('❌ 后端删除失败:', res?.msg);
              ElMessage.error(`删除失败：${res?.msg || '服务器错误'}`);
              // 服务器删除失败则跳过本地删除，保持数据一致
              continue;
            }
          } catch (err) {
            console.error('❌ 调用删除接口异常:', err);
            // ElMessage.error(`删除异常：${err.message || err}`);
            // 接口异常则跳过本地删除
            continue;
          }
        } else {
          console.log('⚠️ 行无有效 id（或仅有 unique_key），跳过后端删除，仅本地删除');
        }
      }

      // 后端删除完成后，按索引倒序移除本地数据，避免索引错位
      absIndices
        .sort((a, b) => b - a)
        .forEach(i => {
          if (i >= 0 && i < tableData.value.length) {
            tableData.value.splice(i, 1);
          }
        });

      // 清理删除快照
      deleteSnapshot.value = [];

      // 更新序号并刷新当前页
      updateRowNumbers();
      loadCurrentPage();
      ElMessage.success(`删除成功（${rowsToDelete.length} 行）`);
    } catch (err) {
      console.error('❌ 删除流程异常:', err);
      ElMessage.error(`删除流程异常：${err.message || err}`);
    }
  }
});

// 监听分页数据与窗口尺寸变化，动态调整高度
onMounted(() => {
  updateTableHeight();
  window.addEventListener('resize', updateTableHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateTableHeight);
});
watch([currentPage, pageSize, () => tableData.value.length], () => updateTableHeight());
// 更新修改单元格 数据
async function update_SettlementData(rowData) {
  // 参数验证
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  if (!rowData) return ElMessage.warning("无数据可更新");
  if (!rowData.unique_key) return ElMessage.warning("缺少唯一标识(unique_key)，无法更新");
  
  saving.value = true;
  try {
    console.log('📤 正在发送更新请求:', { tableName: tableName.value, unique_key: rowData.unique_key });
    
    // 调用API更新数据
    const res = await updateSettlementData({ 
      tableName: tableName.value, 
      data: {
        // 确保包含后端需要的所有字段
        unique_key: rowData.unique_key,
        '日期': rowData['日期'] || '',
        '公司': rowData['公司'] || '',
        'more_id': moreMap.value[rowData['公司']] || null,
        '银行': rowData['银行'] || '',
        '摘要': rowData['摘要'] || '',
        '收入': rowData['收入'] || 0,
        '支出': rowData['支出'] || 0,
        '余额': rowData['余额'] || 0,
        '备注': rowData['备注'] || '',
        '标签': rowData['标签'] || '',
        '发票': rowData['发票'] || '',
        '序号': rowData['序号'] || '',
        'id': rowData['id'] || 0
      }
    });
    
    // 处理响应
    if (res?.code === 1) {
      console.log('✅ 更新成功:', res.msg);
      ElMessage.success("修改成功");
    } else {
      const errorMsg = res?.msg || "修改失败";
      console.error('❌ 更新失败:', errorMsg);
      throw new Error(errorMsg);
    }
  } catch (err) {
    console.error('❌ 更新异常:', err);
    // ElMessage.error("修改异常：" + (err.message || err));
  } finally {
    saving.value = false;
  }
}
// 生成唯一键的通用函数（改为异步以支持await调用）
async function generateUniqueKey(rowData) {
  const fieldValues = [];
  const fields = ['日期', '摘要', '收入', '支出', '备注', '余额'];
  
  fields.forEach(field => {
    if (rowData[field]) {
      // 对摘要字段使用更短的截断长度
      const maxLength = field === '摘要' ? 20 : 50;
      const value = String(rowData[field]);
      // 截断过长字段
      const truncated = value.length > maxLength ? value.substring(0, maxLength) + '...' : value;
      fieldValues.push(truncated);
    } else {
      fieldValues.push(''); // 添加空字符串保持位置一致
    }
  });
  
  // 使用竖线分隔符拼接
  const uniqueStr = fieldValues.join('|');
  const hash = md5(uniqueStr);
  
  // 存储原始值以便"解密"使用
  if (hash) {
    // 如果rowData有id或其他唯一标识，使用它作为键
    const rowId = rowData.id || rowData.rowId || uniqueStr;
    md5Mapping[hash] = uniqueStr;
    // 限制映射表大小，避免内存溢出
    if (Object.keys(md5Mapping).length > 1000) {
      const oldestKey = Object.keys(md5Mapping)[0];
      delete md5Mapping[oldestKey];
    }
  }
  
  return hash;
}

// 存储MD5值到原始字符串的映射
const md5Mapping = {};

// MD5相关函数 - 模拟解密功能
function decryptMD5(encrypted) {
  // 注意：MD5是单向哈希函数，无法真正解密
  // 这里通过映射表模拟解密功能
  
  if (typeof encrypted === 'string' && encrypted.length === 32) {
    // 如果在映射表中找到对应的值，返回原始字符串
    if (md5Mapping[encrypted]) {
      console.log('🔓 找到解密映射:', encrypted, '->', md5Mapping[encrypted]);
      return md5Mapping[encrypted];
    }
    
    // 如果没有找到映射，尝试解析加密方式（基于后端实现）
    console.warn('⚠️  无法完全解密MD5值，返回原始哈希:', encrypted);
    
    // 提供格式说明
    return `${encrypted} (MD5哈希值，格式：日期|摘要|收入|支出|备注|余额)`;
  }
  
  // 不是MD5哈希格式，直接返回原值
  return encrypted;
}

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
  // 获取所有公司列表
  try {
    const moreRes = await getMoreAll();
    if (moreRes && moreRes.data) {
      moreList.value = moreRes.data.map(item => item.name);
      const map = {};
      moreRes.data.forEach(item => {
        map[item.name] = item.id;
      });
      moreMap.value = map;
    }
  } catch (error) {
    console.error("获取公司列表失败:", error);
  }

  // 优先加载公司标签选项
  await loadCompanyTags();
  // 获取公司、银行
  const res = await getSettlementCompanyBank({
    username: userStore.name,
    data: {
      // 不指定特定公司和银行，获取所有可用的摘要
      summary: ""
    }
  });
  // 将返回的数据转换为级联选择器所需的格式
  const rawData = res.data || [];
  const cascadingData = [];
  const companyMap = new Map();
  
  // 处理数据，构建树形结构
  if (rawData.length > 0) {
    rawData.forEach(item => {
      if (!companyMap.has(item.公司)) {
        companyMap.set(item.公司, {
          value: item.公司,
          label: item.公司,
          children: []
        });
        cascadingData.push(companyMap.get(item.公司));
      }
      
      // 避免重复添加银行
      const company = companyMap.get(item.公司);
      if (!company.children.some(bank => bank.value === item.银行)) {
        company.children.push({
          value: item.银行,
          label: item.银行
        });
      }
    });
  } else {
    // 如果没有数据，设置默认数据
    cascadingData.push({
      value: "信泰众诚",
      label: "信泰众诚",
      children: [
        {
          value: "中信银行",
          label: "中信银行"
        }
      ]
    });
  }
  
  companyBankOptions.value = cascadingData;

  // 先获取历史摘要
  await getHistorySummaries();
  
  const initData = [
    
  ];
  initTableFromObjects(initData);
  await loadFromDB();
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
  // 明确排除不应被识别为日期的字段
  const blacklist = ['id', '序号', 'unique_key','收入','支出'];
  if (blacklist.includes(lowerColumnName)) {
    return false;
  }
  
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
  // 根据分页计算全局序号起始值
  const baseIndex = serverPaging.value ? (currentPage.value - 1) * pageSize.value : 0;
  
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
    const processedRow = { ...row, '序号': baseIndex + index + 1 };
    
    // 转换日期列中的Excel数字格式
    dateColumns.forEach(col => {
      if (isPossibleExcelDate(processedRow[col])) {
        processedRow[col] = excelNumberToDate(processedRow[col]);
      }
    });
    
    return processedRow;
  });

  // 动态汇总“标签”列的可选项（与默认值合并去重）
  try {
    const existingTags = Array.from(new Set((objArray || [])
      .map(r => r && r['标签'])
      .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
      .map(v => String(v).trim())));
    const merged = Array.from(new Set([...(tagOptions.value || []), ...existingTags]));
    tagOptions.value = merged;
  } catch (e) {
    console.warn('汇总标签选项失败:', e);
  }
  
  // 确保序号列在最前面
  // const keys = Object.keys(objArray[0]);
  colHeaders.value = ['序号', ...keys];
  
  columns.value = [
    { data: '序号', type: 'text', readOnly: true, width: 60, className: 'htCenter' },
  ];
  
    // 添加其他列配置
    keys.forEach(k => {
      const v = objArray[0][k];
      const isNum = v !== null && v !== "" && !isNaN(Number(v));
    
    // 创建列配置
    const columnConfig = {
      data: k,
      // 如果是日期列，使用date类型；如果是订单号列，强制使用文本类型；否则根据数据类型决定
      type: dateColumns.has(k) ? "date" : (textColumns.has(k) ? "text" : (isNum || k === "收入" || k === "支出" || k === "余额" ? "numeric" : (k === "摘要" ? "autocomplete" : "text"))),
      allowInvalid: true,
    };

    // 为“公司”列设置下拉选择
    if (k === '公司') {
      columnConfig.type = 'dropdown';
      columnConfig.source = moreList.value;
      columnConfig.strict = true; // 限制只能选择下拉项
      columnConfig.allowInvalid = false;
      columnConfig.trimDropdown = false;
    }

    // 为“标签”列设置下拉选择
    if (k === '标签') {
      columnConfig.type = 'dropdown';
      columnConfig.source = tagOptions.value;
      columnConfig.strict = true; // 限制只能选择下拉项
      columnConfig.allowInvalid = false;
      columnConfig.trimDropdown = false;
      columnConfig.width = 160;
    }
    
    // 为日期列配置日期选择器并设置为只读
    if (dateColumns.has(k)) {
      columnConfig.dateFormat = 'YYYY-MM-DD';
      columnConfig.correctFormat = true;
      // 添加类型设置确保日期只显示年月日
      columnConfig.type = 'date';
      // 确保日期格式化正确，不显示时分秒
      columnConfig.renderer = (hotInstance, TD, row, col, prop, value, cellProperties) => {
        if (value) {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            TD.innerText = `${year}-${month}-${day}`;
          } else {
            TD.innerText = value;
          }
        } else {
          TD.innerText = '';
        }
        return TD;
      };
      // columnConfig.readOnly = true; // 禁止编辑日期列
      columnConfig.className = 'htCenter';
      columnConfig.width = 1020; // 稍微增加宽度以更好地显示日期
      columnConfig.language = 'zh-CN'; // 设置日期组件为中文显示
      
    }
    
    // 为收入和支出列设置两位小数限制
    if (k === "收入" || k === "支出") {
      columnConfig.numericFormat = { pattern: '0.00', culture: 'zh-CN' };
      columnConfig.allowInvalid = false;
      columnConfig.validator = function(value, callback) {
        // 允许空值
        if (value === '' || value === null) {
          callback(true);
          return;
        }
        // 检查是否为数字
        if (isNaN(value)) {
          callback(false);
          return;
        }
        // 检查小数位数是否不超过两位
        const numValue = Number(value);
        const decimalPlaces = (numValue.toString().split('.')[1] || '').length;
        callback(decimalPlaces <= 2);
      };
    }
    
      // 余额列设置为只读并保留两位小数
      if (k === "余额") {
        columnConfig.readOnly = true;
        // 设置类型为数字并保留两位小数
        columnConfig.type = 'numeric';
        columnConfig.numericFormat = {
          pattern: '0,0.00',
          culture: 'zh-CN'
        };
      }
      // id 列显式设置为数值并只读，避免被识别为日期
      if (k.toLowerCase() === 'id') {
        columnConfig.readOnly = true;
        columnConfig.type = 'numeric';
        columnConfig.numericFormat = { pattern: '0', culture: 'zh-CN' };
        columnConfig.className = (columnConfig.className ? `${columnConfig.className} htCenter` : 'htCenter');
        columnConfig.width = 100;
      }

        // 如果是“摘要”列，设置列宽为300
    if (k === "摘要") {
      columnConfig.width = 600;
    }
          // 如果是“摘要”列，设置列宽为300
    if (k === "id" ) {
      columnConfig.width = 1;
    }
    if (k === "日期" ) {
      
      columnConfig.className = 'htCenter';
      columnConfig.width = 120;
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
  
  // 初始化第一页（默认值已为1，避免在数据重载时强制跳回第一页）
  nextTick(() => loadCurrentPage());
  calculateBalance();
}

/* ====== 翻页 ====== */
function handlePageChange(page) {
  currentPage.value = page;
  if (serverPaging.value) {
    loadFromDB();
  } else {
    loadCurrentPage();
  }
}

// 处理每页显示条数变化
function handleSizeChange(size) {
  pageSize.value = size;
  currentPage.value = 1; // 重置为第一页
  if (serverPaging.value) {
    loadFromDB();
  } else {
    loadCurrentPage();
  }
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
  // 从前缀余额开始累计（服务端分页时），否则从0开始
  let balance = serverPaging.value ? (balancePrefix.value || 0) : 0;

  const toNum = (v) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0;
    return Number(v) || 0;
  };

  tableData.value.forEach(row => {
    const income = toNum(row.收入);
    const expense = toNum(row.支出);
    balance += income - expense;
    row['余额'] = Math.round(balance * 100) / 100;
  });
  const hot = hotTableRef.value?.hotInstance;
  if (hot) {
    hot.render();
  }
}

// unique_key 处理
function getUniqueKey(rowData ) {
// let uniqueKey = null;
// tableData.value[index].unique_key = uniqueKey;
console.log("更新后的行数据:", tableData.value[index].unique_key);
}
/* ====== 文件导入/导出 ====== */
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
async function addRow() {
  const newRow = {};
  // 为新行设置各列的默认值，但不设置序号
  colHeaders.value.forEach(h => {
    if (h !== '序号') {
      newRow[h] = "";
    }
  });

  // 默认使用上一行的 公司、银行、日期
  const lastRow = tableData.value.length > 0 ? tableData.value[tableData.value.length - 1] : null;
  if (lastRow) {
    newRow['公司'] = lastRow['公司'] ?? '';
    newRow['银行'] = lastRow['银行'] ?? '';
    newRow['日期'] = lastRow['日期'] ?? '';
  }

  // 获取下一个可用的 id（优先后端，失败则本地递增）
  let nextId = null;
  try {
    const res = await getMaxId({ tableName: tableName.value });
    if (res?.code === 1) {
      const d = res?.data;
      if (typeof d === 'number') {
        nextId = d 
      } else if (d && typeof d.nextId === 'number') {
        nextId = d.nextId;
      } 
    }
  } catch (err) {
    // 忽略错误，使用本地回退策略
    console.warn('获取最大id失败，使用本地递增回退', err);
  }

  if (!nextId) {
    const localMax = tableData.value.reduce((max, row) => {
      const v = Number(row?.id);
      return Number.isFinite(v) ? Math.max(max, v) : max;
    }, 0);
    nextId = localMax + 1;
  }

  newRow['id'] = nextId;
  // 数值列默认值
  newRow['收入'] = Number(newRow['收入']) || 0;
  newRow['支出'] = Number(newRow['支出']) || 0;
  newRow['余额'] = Number(newRow['余额']) || 0;

  // 生成唯一键（可在后续编辑时再次更新）
  try {
    newRow['unique_key'] = await generateUniqueKey(newRow);
  } catch (e) {
    console.warn('生成 unique_key 失败，将在后续编辑时更新', e);
    newRow['unique_key'] = '';
  }

  // 先调用后端新增，确保 id 立即保存
  try {
    const res = await addSettlementData({
      tableName: tableName.value,
      data: {
        unique_key: newRow['unique_key'],
        '日期': newRow['日期'] || '',
        '公司': newRow['公司'] || '',
        '银行': newRow['银行'] || '',
        '摘要': newRow['摘要'] || '',
        '收入': newRow['收入'] || 0,
        '支出': newRow['支出'] || 0,
        '余额': newRow['余额'] || 0,
        '备注': newRow['备注'] || '',
        '发票': newRow['发票'] || '',
        '序号': (tableData.value.length + 1),
        'id': newRow['id']
      }
    });
    if (res?.code !== 1) {
      ElMessage.error(res?.msg || '新增失败');
      return;
    }
  } catch (err) {
    ElMessage.error('新增异常：' + (err.message || err));
    return;
  }

  tableData.value.push(newRow);
  updateRowNumbers(); // 更新序号
  loadCurrentPage();
  ElMessage.success(`已新增一行，id=${nextId}`);
}

// 更新所有行的序号
function updateRowNumbers() {
  const baseIndex = serverPaging.value ? (currentPage.value - 1) * pageSize.value : 0;
  tableData.value.forEach((row, index) => {
    row['序号'] = baseIndex + index + 1;
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

async function saveChanges() {
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  const rows = tableData.value; if (!rows.length) return ElMessage.warning("无数据保存");
  saving.value = true;
  try {
    const res = await upSettlementData({ tableName: tableName.value, data: rows });
    if (res?.code === 1) ElMessage.success("保存成功"); else throw new Error(res?.msg || "保存失败");
  } catch (err) { ElMessage.error("保存异常：" + (err.message || err)); }
  finally { saving.value = false; }
}



async function loadFromDB() {
  if (!tableName.value) return ElMessage.warning("请先填写表名");
  try {
    const [company, bank] = selectedCompanyBank.value || [];
    const [dateFrom, dateTo] = dateRange.value || [];
    const res = await getSettlementData({
      // 兼容旧参数
      selectedCompanyBank: selectedCompanyBank.value,
      dateRange: dateRange.value,
      // 新参数结构，参考 getCashRecords
      data: {
        company,
        bank,
        summary: summaryKeyword.value || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: serverPaging.value ? currentPage.value : undefined,
        size: serverPaging.value ? pageSize.value : undefined
      }
    });
    if (res?.code !== 1) return ElMessage.error("加载失败：" + res?.msg);
    // 兼容后端返回 { data: result, total }
    const rows = Array.isArray(res.data) ? res.data : (res.data?.data || []);
    // 设置分页总数：优先使用后端 total，其次使用行数
    const totalFromRes = (typeof res.total === 'number' ? res.total : (res.data?.total));
    total.value = Number.isFinite(totalFromRes) ? totalFromRes : rows.length;

    // 计算前缀余额（仅在服务端分页且页码>1时）
    balancePrefix.value = 0;
    if (serverPaging.value && currentPage.value > 1) {
      const prefixSize = (currentPage.value - 1) * pageSize.value;
      try {
        const resPrefix = await getSettlementData({
          selectedCompanyBank: selectedCompanyBank.value,
          dateRange: dateRange.value,
          data: {
            company,
            bank,
            summary: summaryKeyword.value || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            page: 1,
            size: prefixSize
          }
        });
        const prevRows = Array.isArray(resPrefix?.data) ? resPrefix.data : (resPrefix?.data?.data || []);
        const toNum = (v) => {
          if (v === null || v === undefined || v === '') return 0;
          if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0;
          return Number(v) || 0;
        };
        balancePrefix.value = prevRows.reduce((acc, r) => acc + toNum(r.收入) - toNum(r.支出), 0);
      } catch (e) {
        console.warn('计算前缀余额失败，按0处理：', e?.message || e);
        balancePrefix.value = 0;
      }
    }

    if (!rows.length) return initTableFromObjects([]), ElMessage.info("表中没有数据");
    initTableFromObjects(rows);
    // 渲染当前页并以前缀余额继续累计
    loadCurrentPage();
    ElMessage.success(`已加载 ${rows.length} 条`);
  } catch (err) { ElMessage.error("加载异常：" + (err.message || err)); }
}

// 清空公司/银行筛选按钮事件
function clearCompanyBankFilter() {
  selectedCompanyBank.value = [];
  summaryKeyword.value = '';
  dateRange.value = [];
  ElMessage.success('已清空公司/银行、摘要与日期筛选');
}
</script>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: calc(100vh - 100px);
}
.tool-bar {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--el-bg-color);
  padding-bottom: 8px;
}
.excel-table {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
}
.pagination-bar {
  margin-top: auto;
}
</style>
<style scoped>
.excel-table { width:100%; height: calc(100vh - 300px); }
:deep(.htInvalid) {
  background: rgba(255,0,0,0.12) !important;
  border: 1px solid rgba(255,0,0,0.2) !important;
}
.text-xl{
  width: 100%;
  line-height: 50px;
  text-align: center;
  font-size: 30px;
  color: #333;
  border-bottom: 1px solid #ddd;
}
.p-4 { padding: 16px;}
.excel-table{
  margin-top: 16px;
}
.mb-3 { display: flex;
justify-content: flex-end;
}

.pagination-bar {
  position: relative;
  z-index: 20;
}

</style>
