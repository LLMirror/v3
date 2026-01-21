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
        <el-button type="success" icon="Document" @click="handleGenerateStatement">生成最新一周对账单</el-button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import request from '@/utils/request';
import { ElMessage, ElMessageBox } from 'element-plus';

const queryType = ref('rent_withholding');
const dateRange = ref([]);
const tableData = ref([]);
const total = ref(0);
const pageNum = ref(1);
const pageSize = ref(20);
const loading = ref(false);
const dynamicColumns = ref([]);

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
  try {
    await ElMessageBox.confirm('确认生成最新一周（上周一至上周日）的对账单吗？这将覆盖同周期的旧数据。', '提示', {
      type: 'warning'
    });
    
    const res = await request({
      url: '/zjdk/generate-statement',
      method: 'post'
    });
    
    if (res.code === 1) {
      ElMessage.success('对账单生成成功');
    } else {
      ElMessage.error(res.msg || '生成失败');
    }
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err);
      ElMessage.error('生成出错');
    }
  }
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
</style>
