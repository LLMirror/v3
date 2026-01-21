<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>租金代扣导入</span>
        </div>
      </template>
      <div style="display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
        <div>
          <span style="margin-right: 10px; font-weight: bold;">选择周期</span>
          <el-date-picker
            v-model="weekDate"
            type="week"
            format="[第] ww [周] (MM-dd ~)"
            placeholder="选择周"
          />
          <span v-if="dateRangeText" style="margin-left: 10px; color: #666; font-size: 14px;">
            {{ dateRangeText }}
          </span>
        </div>
        
        <div>
          <span style="margin-right: 10px; font-weight: bold;">导入类型</span>
          <el-select v-model="importType" placeholder="请选择导入类型" style="width: 200px;">
            <el-option label="租金代扣" value="rent_withholding" />
            <el-option label="租金调账" value="rent_adjustment" />
          </el-select>
        </div>

        <el-button type="primary" icon="Upload" @click="handleImport">导入数据</el-button>
      </div>
      
      <div style="margin-top: 20px;">
        <el-alert title="操作提示" type="info" :closable="false" show-icon>
          <template #default>
            <p>1. 请先选择数据所属的时间周期（默认为上周一至上周日）和导入类型。</p>
            <p>2. 点击“导入数据”按钮上传 Excel 文件。</p>
            <p>3. 系统将自动处理{{ importType === 'rent_withholding' ? '租金代扣' : '租金调账' }}数据。</p>
          </template>
        </el-alert>
      </div>

      <div v-if="allTableData.length > 0" style="margin-top: 20px;">
        <div style="margin-bottom: 10px; font-weight: bold;">
          导入数据预览 ({{ allTableData.length }} 条)
        </div>
        <el-table ref="tableRef" :data="tableData" border style="width: 100%" :height="tableHeight">
           <el-table-column
            v-for="header in tableHeaders"
            :key="header"
            :prop="header"
            :label="header"
            min-width="120"
            show-overflow-tooltip
          />
        </el-table>
        
        <Pagination
          v-if="total > 0"
          :total="total"
          v-model:page="queryParams.pageNum"
          v-model:limit="queryParams.pageSize"
          @pagination="handlePagination"
        />
      </div>
    </el-card>

    <HandleImport
      ref="handleImportRef"
      url="/zjdk/import"
      :parentParams="importParams"
      @importRes="importRes"
      :showTemplate="false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import HandleImport from "@/components/handleImport";
import Pagination from '@/components/Pagination';
import { ElMessage } from 'element-plus';

const weekDate = ref(null);
const importType = ref('rent_withholding'); // 默认选中租金代扣
const handleImportRef = ref(null);
const tableRef = ref(null);
const allTableData = ref([]); // 存储所有导入的数据
const tableData = ref([]);    // 当前页显示的数据
const tableHeaders = ref([]);
const total = ref(0);
const queryParams = ref({
  pageNum: 1,
  pageSize: 20
});
const tableHeight = ref(500);

// 计算表格高度
const calcTableHeight = () => {
  if (!tableRef.value) return;
  // 获取表格顶部的绝对位置
  const rect = tableRef.value.$el.getBoundingClientRect();
  // 视口高度 - 表格顶部位置 - 分页器高度及底部留白
  // 分页器组件 padding 32px * 2 + 内容高度 ≈ 90px，加上底部留白 20px，预留 110px
  const height = window.innerHeight - rect.top - 110;
  tableHeight.value = height > 200 ? height : 200;
};

// 监听窗口大小变化
window.addEventListener('resize', calcTableHeight);

// 监听分页变化
const handlePagination = () => {
  const start = (queryParams.value.pageNum - 1) * queryParams.value.pageSize;
  const end = start + queryParams.value.pageSize;
  tableData.value = allTableData.value.slice(start, end);
};

// 格式化日期 YYYY-MM-DD
const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 获取周一和周日
const getWeekRange = (dateObj) => {
  if (!dateObj) return null;
  const date = new Date(dateObj);
  const day = date.getDay();
  // 计算周一：如果今天是周日(0)，则减6天；否则减去 (day-1) 天
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    start: formatDate(monday),
    end: formatDate(sunday)
  };
};

// 初始化为上周
const initLastWeek = () => {
  const today = new Date();
  // 获取上周的某一天（比如上周一）
  // 简单点：当前时间减去 7 天，就是上周同一时间，以此为基准获取该周
  const lastWeekPoint = new Date(today.getTime() - 7 * 24 * 3600 * 1000);
  weekDate.value = lastWeekPoint;
};

// 显示用的日期范围文本
const dateRangeText = computed(() => {
  const range = getWeekRange(weekDate.value);
  if (!range) return '';
  return `${range.start} 至 ${range.end}`;
});

// 导入参数
const importParams = computed(() => {
  const range = getWeekRange(weekDate.value);
  if (!range) {
    return {};
  }
  return {
    startDate: range.start,
    endDate: range.end,
    type: importType.value
  };
});

const handleImport = () => {
  if (!weekDate.value) {
    ElMessage.warning('请先选择时间周期');
    return;
  }
  handleImportRef.value.show();
};

const importRes = (res) => {
  ElMessage.success('导入成功');
  console.log('导入结果', res);
  if (res && res.data && res.data.list) {
    allTableData.value = res.data.list;
    tableHeaders.value = res.data.headers || [];
    total.value = res.data.list.length;
    
    // 重置分页并显示第一页
    queryParams.value.pageNum = 1;
    handlePagination();
    
    // 数据加载后重新计算高度
    nextTick(() => {
      calcTableHeight();
    });
  }
};

onMounted(() => {
  initLastWeek();
  calcTableHeight();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
