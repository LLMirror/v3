<template>
  <div class="app-container">
    <h2>收付情况表</h2>
    
    <!-- 筛选区域 -->
    <div class="filter-container" style="margin-bottom: 20px;">
      <el-form :inline="true" :model="queryParams" class="demo-form-inline">
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="queryParams.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px;"
          />
        </el-form-item>

        <el-form-item label="系列">
          <el-select v-model="queryParams.series" placeholder="请选择系列" clearable style="width: 180px;" @change="handleSeriesChange">
             <el-option
              v-for="item in seriesOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="公司">
          <el-select v-model="queryParams.company" placeholder="请选择公司" clearable style="width: 380px;">
            <el-option
              v-for="item in companyOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleQuery">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 数据展示区域 -->
    <div v-loading="loading">
      <el-empty v-if="!profitData || profitData.length === 0" description="暂无数据" />
      
      <div v-else v-for="(monthData, index) in profitData" :key="index" class="month-section">
        <el-card class="box-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="month-title">{{ monthData.month }} 收付情况</span>
              <div class="month-summary">
                <el-tag type="info">期初余额: {{ formatMoney(monthData.openingBalance) }}</el-tag>
                <el-tag type="success">本月收入: {{ formatMoney(monthData.income) }}</el-tag>
                <el-tag type="danger">本月支出: {{ formatMoney(monthData.expense) }}</el-tag>
                <el-tag :type="monthData.netProfit >= 0 ? 'warning' : 'danger'">
                  净收益: {{ formatMoney(monthData.netProfit) }}
                </el-tag>
                <el-tag type="primary">期末余额: {{ formatMoney(monthData.closingBalance) }}</el-tag>
              </div>
            </div>
          </template>
          
          <el-table
            :data="monthData.details"
            border
            style="width: 100%"
            :summary-method="(param) => getSummaries(param, monthData)"
            show-summary
            size="small"
          >
            <el-table-column prop="company" label="公司" width="380" />
            <el-table-column prop="category" label="大类" width="150" />
            <el-table-column prop="subcategory" label="子类/标签" />
            <el-table-column prop="income" label="收入" width="150" align="right">
              <template #default="scope">
                {{ formatMoney(scope.row.income) }}
              </template>
            </el-table-column>
            <el-table-column prop="expense" label="支出" width="150" align="right">
              <template #default="scope">
                {{ formatMoney(scope.row.expense) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { getProfitTable, getCompanyList, getSeriesList } from '@/api/system/index.js';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const profitData = ref([]);
const companyOptions = ref([]);
const seriesOptions = ref([]);

const queryParams = reactive({
  dateRange: [],
  company: '',
  series: ''
});

// 初始化加载
onMounted(() => {
  fetchSeries();
  fetchCompanies();
});

const fetchSeries = async () => {
  try {
    const seriesRes = await getSeriesList();
    if (seriesRes.code === 1 || seriesRes.code === 200) {
      seriesOptions.value = seriesRes.data || [];
    }
  } catch (error) {
    console.error("Failed to fetch series", error);
  }
};

const fetchCompanies = async () => {
  try {
    const params = {};
    if (queryParams.series) {
      params.series = queryParams.series;
    }
    // Pass params directly, not wrapped in { data: ... } because backend expects req.body.series
    const companyRes = await getCompanyList(params);
    if (companyRes.code === 1 || companyRes.code === 200) {
      companyOptions.value = companyRes.data || [];
    }
  } catch (error) {
    console.error("Failed to fetch companies", error);
  }
};

const handleSeriesChange = () => {
  queryParams.company = '';
  fetchCompanies();
};

const handleQuery = async () => {
  loading.value = true;
  try {
    const params = {
      dateFrom: queryParams.dateRange?.[0] || '',
      dateTo: queryParams.dateRange?.[1] || '',
      company: queryParams.company,
      series: queryParams.series
    };
    
    const res = await getProfitTable({ data: params }); 
    
    if (res.code === 1 || res.code === 200) {
      profitData.value = res.data;
      if (!res.data || res.data.length === 0) {
        ElMessage.info('未查询到数据');
      }
    } else {
      ElMessage.error(res.msg || '查询失败');
    }
  } catch (error) {
    console.error(error);
    // ElMessage.error('系统异常'); // Interceptor likely showed error already
  } finally {
    loading.value = false;
  }
};

const resetQuery = () => {
  queryParams.dateRange = [];
  queryParams.company = '';
  queryParams.series = '';
  profitData.value = [];
  fetchCompanies(); // Fetch all companies
};

const formatMoney = (value) => {
  if (value === null || value === undefined) return '0.00';
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// 表格合计行
const getSummaries = (param, monthData) => {
  const { columns, data } = param;
  const sums = [];
  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = '本月合计';
      return;
    }
    // 只计算收入和支出列
    if (['income', 'expense'].includes(column.property)) {
       // 使用 monthData 中已经计算好的总计，避免前端浮点数计算误差
       if (column.property === 'income') {
         sums[index] = formatMoney(monthData.income);
       } else {
         sums[index] = formatMoney(monthData.expense);
       }
    } else {
      sums[index] = '';
    }
  });
  return sums;
};
</script>

<style scoped>
.app-container {
  padding: 20px;
}

.month-section {
  margin-bottom: 30px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-title {
  font-size: 18px;
  font-weight: bold;
}

.month-summary {
  display: flex;
  gap: 10px;
}
</style>
