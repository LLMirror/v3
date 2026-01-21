<template>
  <div class="app-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>租金代扣导入</span>
        </div>
      </template>
      <div style="display: flex; align-items: center; gap: 20px;">
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
        <el-button type="primary" icon="Upload" @click="handleImport">导入数据</el-button>
      </div>
      
      <div style="margin-top: 20px;">
        <el-alert title="操作提示" type="info" :closable="false" show-icon>
          <template #default>
            <p>1. 请先选择数据所属的时间周期（默认为上周一至上周日）。</p>
            <p>2. 点击“导入数据”按钮上传 Excel 文件。</p>
            <p>3. 系统将自动处理租金代扣数据。</p>
          </template>
        </el-alert>
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
import { ref, computed, onMounted } from 'vue';
import HandleImport from "@/components/handleImport";
import { ElMessage } from 'element-plus';

const weekDate = ref(null);
const handleImportRef = ref(null);

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
  // 当前日期减去 (当前星期几 + 6) 天 -> 上周一?
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
    endDate: range.end
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
};

onMounted(() => {
  initLastWeek();
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
