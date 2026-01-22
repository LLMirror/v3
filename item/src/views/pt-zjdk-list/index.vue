<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>数据查询与对账单生成</span>
        </div>
      </template>
      
      <div class="filter-container">
        <el-select v-model="queryType" placeholder="选择查询类型" style="width: 200px; margin-right: 10px;" @change="handleQuery">
          <el-option label="租金代扣" value="rent_withholding" />
          <el-option label="租金调账" value="rent_adjustment" />
        </el-select>
        
        <el-input v-model="companyName" placeholder="运力公司" style="width: 200px; margin-right: 10px;" clearable @keyup.enter="handleQuery" />
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="上传开始日期"
          end-placeholder="上传结束日期"
          value-format="YYYY-MM-DD"
          style="margin-right: 10px;"
        />
        
        <el-button type="primary" icon="Search" @click="handleQuery">查询</el-button>
        <el-button type="success" icon="Document" @click="openStatementDialog">生成对账单</el-button>
      </div>

      <el-table :data="tableData" border style="width: 100%; margin-top: 20px;" v-loading="loading">
        <el-table-column v-for="col in dynamicColumns" :key="col.prop" :prop="col.prop" :label="col.label" show-overflow-tooltip min-width="120" />
      </el-table>
      
      <div class="pagination-container">
         <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleQuery"
            @current-change="handleQuery"
         />
      </div>
    </el-card>

    <!-- Generate Statement Dialog -->
    <el-dialog
      v-model="statementDialogVisible"
      title="生成对账单"
      width="500px"
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="选择周期">
          <el-date-picker
            v-model="statementWeek"
            type="week"
            format="ww 周"
            placeholder="选择周"
            :disabled-date="disabledDate"
            @change="handleWeekChange"
          />
          <div style="margin-left: 10px; font-size: 12px; color: #666;" v-if="statementDateRange.start">
             {{ statementDateRange.start }} 至 {{ statementDateRange.end }}
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="statementDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleGenerateStatement" :loading="generating">生成</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Progress Dialog -->
    <el-dialog
      v-model="progressVisible"
      title="正在生成对账单"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      append-to-body
    >
       <div style="text-align: center;">
         <el-progress type="circle" :percentage="progressPercentage" />
         <div style="margin-top: 10px;">正在处理数据，请稍候...</div>
       </div>
    </el-dialog>

    <!-- Duplicate Data Dialog -->
    <el-dialog
      v-model="dialogVisible"
      title="发现已生成的对账单数据"
      width="800px"
      append-to-body
    >
      <div style="margin-bottom: 10px;">
        <el-alert
          :title="`检测到当前周期 [${currentPeriod}] 已有生成的对账单数据。您可以选择勾选特定公司进行重新生成（覆盖），或选择全部覆盖。`"
          type="warning"
          :closable="false"
          show-icon
        />
      </div>
      
      <el-table
        :data="existingData"
        border
        style="width: 100%; max-height: 500px; overflow-y: auto;"
        @selection-change="handleSelectionChange"
        :row-class-name="tableRowClassName"
      >
        <el-table-column type="selection" width="55" :selectable="checkSelectable" />
        <el-table-column prop="nameValue" label="公司" min-width="150" show-overflow-tooltip />
        <el-table-column prop="totalAmount" label="租金代扣金额" width="120" />
        <el-table-column prop="totalAmount1" label="调账金额" width="120" />
        <el-table-column prop="totalAmount2" label="合计金额" width="120" />
        <el-table-column prop="status" label="状态" width="100">
           <template #default="scope">
             <el-tag :type="scope.row.status === '未提交' ? 'warning' : 'info'">{{ scope.row.status }}</el-tag>
           </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleOverwriteSelected">勾选覆盖</el-button>
          <el-button type="danger" @click="handleOverwriteAll">全部覆盖</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
dayjs.extend(isoWeek);

const queryType = ref('rent_withholding');
const companyName = ref('');
const dateRange = ref([]);
const tableData = ref([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const dynamicColumns = ref([]);

// Statement Generation
const statementDialogVisible = ref(false);
const statementWeek = ref('');
const statementDateRange = ref({ start: '', end: '' });
const progressVisible = ref(false);
const progressPercentage = ref(0);
const generating = ref(false);

const openStatementDialog = () => {
  statementDialogVisible.value = true;
  // Default to last week
  const lastWeek = dayjs().subtract(1, 'week');
  statementWeek.value = lastWeek.toDate();
  handleWeekChange(lastWeek.toDate());
};

const handleWeekChange = (val) => {
  if (!val) {
    statementDateRange.value = { start: '', end: '' };
    return;
  }
  const date = dayjs(val);
  const start = date.startOf('isoWeek').format('YYYY-MM-DD');
  const end = date.endOf('isoWeek').format('YYYY-MM-DD');
  statementDateRange.value = { start, end };
};

const disabledDate = (time) => {
  return time.getTime() > Date.now();
};


// 字段名称映射
const fieldLabels = {
  uploadDate: '上传时间',
  timePeriod: '时间周期',
  previousDate: '上一周期',
  sjxm: '司机姓名',
  sjbh: '司机编号',
  cs: '城市',
  ylgsmc: '运力公司',
  gzmc: '规则名称',
  gzID: '规则ID',
  kkje: '扣款金额',
  kksj: '扣款时间',
  zdbh: '账单编号',
  zdzq: '账单周期',
  zjlx: '租金类型',
  zdkssj: '账单开始时间',
  zdjssj: '账单结束时间',
  cd: '车队',
  zt: '状态',
  ylgs: '运力公司',
  sjzhID: '司机账号ID',
  sjsjh: '司机手机号',
  sqsj: '申请时间',
  jylm: '交易类目',
  xgje: '修改金额',
  gldd: '关联订单',
  jysm: '交易说明',
  sqr: '申请人',
  sqyy: '申请原因',
  cxr: '撤销人',
  cxyy: '撤销原因',
  sqzt: '申请状态',
  tkzt: '调款状态'
};

const handleQuery = async () => {
  loading.value = true;
  try {
    const params = {
      type: queryType.value,
      companyName: companyName.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    };
    if (dateRange.value && dateRange.value.length === 2) {
      params.startDate = dateRange.value[0];
      params.endDate = dateRange.value[1];
    }
    
    const res = await request({
      url: '/zjdk/list',
      method: 'post',
      data: params
    });
    
    if (res.code === 1) {
      tableData.value = res.data.list;
      total.value = res.data.total;
      
      // 动态生成表头
      if (tableData.value.length > 0) {
        const keys = Object.keys(tableData.value[0]);
        const cols = [];
        keys.forEach(key => {
          if (key !== 'id') {
             cols.push({
               prop: key,
               label: fieldLabels[key] || key // 如果有映射则显示中文，否则显示字段名
             });
          }
        });
        dynamicColumns.value = cols;
      } else {
        dynamicColumns.value = [];
      }
    } else {
      ElMessage.error(res.msg || '查询失败');
    }
  } catch (err) {
    console.error(err);
    ElMessage.error('查询出错');
  } finally {
    loading.value = false;
  }
};

const handleGenerateStatement = async () => {
  if (!statementDateRange.value.start || !statementDateRange.value.end) {
    ElMessage.warning('请选择账单周期');
    return;
  }
  
  // Close the initial dialog first
  statementDialogVisible.value = false;

  try {
    // 1. Check if statement data already exists
    const checkRes = await request({
      url: '/zjdk/statement-list',
      method: 'post',
      data: { 
        pageSize: 1000,
        startDate: statementDateRange.value.start,
        endDate: statementDateRange.value.end
      }
    });
    
    if (checkRes.code === 1 && checkRes.data && checkRes.data.total > 0) {
      // Data exists, show dialog
      await showDuplicateDialog(checkRes.data.list);
    } else {
      // No data, generate directly
      await confirmAndGenerate();
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err);
      ElMessage.error('操作出错');
    }
  }
};

const confirmAndGenerate = async (companyNames = []) => {
  const msg = companyNames.length > 0 
    ? `确认重新生成选中的 ${companyNames.length} 家公司的对账单吗？`
    : `确认生成 ${statementDateRange.value.start} 至 ${statementDateRange.value.end} 的对账单吗？这将覆盖同周期的旧数据。`;
    
  await ElMessageBox.confirm(msg, '提示', {
    type: 'warning'
  });
  
  await executeGenerate(companyNames);
};

const executeGenerate = async (companyNames = []) => {
  progressVisible.value = true;
  progressPercentage.value = 0;
  generating.value = true;
  
  // Simulate progress
  const timer = setInterval(() => {
    if (progressPercentage.value < 90) {
      progressPercentage.value += 10;
    }
  }, 500);

  try {
    const res = await request({
      url: '/zjdk/generate-statement',
      method: 'post',
      data: { 
        companyNames,
        startDate: statementDateRange.value.start,
        endDate: statementDateRange.value.end
      }
    });
    
    clearInterval(timer);
    progressPercentage.value = 100;
    
    if (res.code === 1) {
      setTimeout(() => {
         progressVisible.value = false;
         ElMessage.success('对账单生成成功');
         dialogVisible.value = false;
      }, 500);
    } else {
      progressVisible.value = false;
      ElMessage.error(res.msg || '生成失败');
    }
  } catch (err) {
    clearInterval(timer);
    progressVisible.value = false;
    console.error(err);
    ElMessage.error('生成请求出错');
  } finally {
    generating.value = false;
  }
};

// Duplicate Dialog Logic
const dialogVisible = ref(false);
const existingData = ref([]);
const selectedRows = ref([]);
const currentPeriod = ref('');

const showDuplicateDialog = (data) => {
  existingData.value = data;
  if (data && data.length > 0) {
    currentPeriod.value = data[0].listValue || '未知周期';
  } else {
    currentPeriod.value = '未知周期';
  }
  dialogVisible.value = true;
};

const handleSelectionChange = (val) => {
  selectedRows.value = val;
};

const checkSelectable = (row) => {
  return row.status === '未提交';
};

const tableRowClassName = ({ row }) => {
  if (row.status !== '未提交') {
    return 'disabled-row';
  }
  return '';
};

const handleOverwriteSelected = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要覆盖的公司');
    return;
  }
  const companies = selectedRows.value.map(row => row.nameValue);
  await confirmAndGenerate(companies);
};

const handleOverwriteAll = async () => {
  await confirmAndGenerate([]);
};

onMounted(() => {
  handleQuery();
});
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.filter-container {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.pagination-container {
  margin-top: 20px;
  text-align: right;
}
:deep(.disabled-row) {
  color: #999;
  text-decoration: line-through;
  background-color: #f5f7fa;
}
</style>
