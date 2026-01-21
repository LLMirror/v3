<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>租金代扣导入</span>
          </div>
        </div>
      </template>
      
      <div class="filter-container">
        <div class="filter-item">
          <span class="filter-label">选择周期</span>
          <el-date-picker
            v-model="weekDate"
            type="week"
            format="[第] ww [周] (MM-dd ~)"
            placeholder="选择周"
            class="filter-input"
          />
          <span v-if="dateRangeText" class="date-range-text">
            {{ dateRangeText }}
          </span>
        </div>
        
        <div class="filter-item">
          <span class="filter-label">导入类型</span>
          <el-select v-model="importType" placeholder="请选择导入类型" class="filter-input">
            <el-option label="租金代扣" value="rent_withholding" />
            <el-option label="租金调账" value="rent_adjustment" />
          </el-select>
        </div>

        <div class="filter-item">
          <el-button type="primary" icon="Upload" @click="handleImport" class="action-btn">上传文件</el-button>
          <el-button 
            type="warning" 
            plain 
            icon="Download" 
            @click="handleDownloadTemplate" 
            class="action-btn"
          >
            {{ importType === 'rent_adjustment' ? '租金调账模板下载' : '租金代扣模板下载' }}
          </el-button>
          <el-button 
            v-if="allTableData.length > 0" 
            type="success" 
            icon="Check" 
            @click="handleSave" 
            class="action-btn"
          >
            确认上传
          </el-button>
        </div>
      </div>
      
      <div class="alert-container">
        <el-alert title="操作提示" type="info" :closable="false" show-icon class="custom-alert">
          <template #default>
            <div class="alert-content">
              <p>1. 请先选择数据所属的时间周期（默认为上周一至上周日）和导入类型。</p>
              <p>2. 点击“上传文件”按钮上传 Excel 文件。</p>
              <p>3. 系统将自动处理 <span class="highlight-text">{{ importType === 'rent_withholding' ? '租金代扣' : '租金调账' }}</span> 数据。</p>
            </div>
          </template>
        </el-alert>
      </div>

      <div v-if="allTableData.length > 0" class="table-container">
        <div class="table-header">
          <span class="table-title">导入数据预览</span>
          <el-tag type="success" effect="plain" round>{{ allTableData.length }} 条记录</el-tag>
        </div>
        <el-table 
          ref="tableRef" 
          :data="tableData" 
          border 
          stripe
          highlight-current-row
          style="width: 100%" 
          :height="tableHeight"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
        >
           <el-table-column
            v-for="col in tableColumns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
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
import request from '@/utils/request';
import { ref, computed, onMounted, nextTick } from 'vue';
import HandleImport from "@/components/handleImport";
import Pagination from '@/components/Pagination';
import { ElMessage, ElMessageBox } from 'element-plus';

const weekDate = ref(null);
const importType = ref('rent_withholding'); // 默认选中租金代扣
const handleImportRef = ref(null);
const tableRef = ref(null);
const allTableData = ref([]); // 存储所有导入的数据
const tableData = ref([]);    // 当前页显示的数据
const tableColumns = ref([]); // 表格列定义
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

const handleDownloadTemplate = () => {
  request({
    url: '/zjdk/template',
    method: 'get',
    params: { type: importType.value },
    responseType: 'blob'
  }).then(res => {
    const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = importType.value === 'rent_adjustment' ? '租金调账导入模板.xlsx' : '租金代扣导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
  }).catch(err => {
    console.error('下载模板失败:', err);
    ElMessage.error('下载模板失败');
  });
};

const handleSave = () => {
  if (allTableData.value.length === 0) return;
  
  ElMessageBox.confirm(
    `确认将 ${allTableData.value.length} 条数据保存到数据库吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      request({
        url: '/zjdk/save',
        method: 'post',
        data: {
          list: allTableData.value,
          type: importType.value
        }
      }).then(res => {
        if (res.code === 1) {
           ElMessage.success(res.msg || '保存成功');
        } else {
           ElMessage.error(res.msg || '保存失败');
        }
      });
    })
    .catch(() => {});
};

const importRes = (res) => {
  ElMessage.success('导入成功');
  console.log('导入结果', res);
  if (res && res.data && res.data.list) {
    allTableData.value = res.data.list;
    tableColumns.value = res.data.tableColumns || [];
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
  padding: 24px;
  background-color: #f0f2f5;
  min-height: 100vh;
}

.box-card {
  border-radius: 8px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05) !important;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.header-title {
  display: flex;
  align-items: center;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-icon {
  margin-right: 8px;
  font-size: 20px;
  color: #409eff;
}

.filter-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 24px;
}

.filter-item {
  display: flex;
  align-items: center;
}

.filter-label {
  margin-right: 12px;
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.filter-input {
  width: 240px;
}

.date-range-text {
  margin-left: 12px;
  color: #909399;
  font-size: 13px;
  background: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.action-btn {
  padding: 10px 24px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.alert-container {
  margin-bottom: 24px;
}

.custom-alert {
  border-radius: 6px;
  border: 1px solid #e1f3d8;
  background-color: #f0f9eb;
}

.alert-content p {
  margin: 4px 0;
  line-height: 1.6;
  color: #606266;
  font-size: 14px;
}

.highlight-text {
  color: #409eff;
  font-weight: 600;
  margin: 0 4px;
}

.table-container {
  background: #fff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  padding: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.table-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 10px;
}

/* 调整 Element UI 默认样式 */
:deep(.el-card__header) {
  border-bottom: 1px solid #ebeef5;
  padding: 16px 20px;
}

:deep(.el-card__body) {
  padding: 24px;
}

:deep(.el-table th.el-table__cell) {
  background-color: #f5f7fa !important;
}
</style>
