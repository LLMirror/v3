<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>收款信息维护</span>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="loadCompanyBanks">刷新</el-button>
            <el-button type="success" @click="saveCompanyBanks">保存</el-button>
          </div>
        </div>
      </template>
      <el-table :data="rows" border stripe :height="tableHeight">
        <el-table-column prop="company" label="公司" min-width="240" />
        <el-table-column prop="account_name" label="银行账户名称" min-width="220">
          <template #default="scope">
            <el-input v-model="scope.row.account_name" placeholder="银行账户名称" />
          </template>
        </el-table-column>
        <el-table-column prop="account_number" label="银行收款账号" min-width="220">
          <template #default="scope">
            <el-input v-model="scope.row.account_number" placeholder="银行收款账号" />
          </template>
        </el-table-column>
        <el-table-column prop="payment_info" label="支付信息" min-width="220">
          <template #default="scope">
            <el-input v-model="scope.row.payment_info" placeholder="支付信息" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { Document } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import request from '@/utils/request';

const rows = ref([]);
const tableHeight = ref(600);
const calcHeight = () => {
  nextTick(() => {
    const card = document.querySelector('.box-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const paddingBottom = 24;
    const headerExtra = 100;
    const h = window.innerHeight - rect.top - paddingBottom - headerExtra;
    tableHeight.value = Math.max(320, h);
  });
};

const loadCompanyBanks = async () => {
  try {
    const res = await request.post('/pt_fylist/company-bank/query', {}, { headers: { repeatSubmit: false } });
    rows.value = (res.data?.list || []).map(r => ({
      company: r.company,
      account_name: r.account_name || '',
      account_number: r.account_number || '',
      payment_info: r.payment_info || ''
    }));
    ElMessage.success('加载成功');
    calcHeight();
  } catch {
    ElMessage.error('加载失败');
  }
};
const saveCompanyBanks = async () => {
  try {
    const res = await request.post('/pt_fylist/company-bank/save', { list: rows.value }, { headers: { repeatSubmit: false }, timeout: 600000 });
    if (res.code === 1 && res.data && res.data.success) {
      ElMessage.success('保存成功');
      loadCompanyBanks();
    } else {
      ElMessage.error(res.data?.msg || res.msg || '保存失败');
    }
  } catch {
    ElMessage.error('保存失败');
  }
};

loadCompanyBanks();
onMounted(() => {
  calcHeight();
  window.addEventListener('resize', calcHeight);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', calcHeight);
});
</script>

<style scoped>
.app-container {
  padding: 24px;
  background-color: #f0f2f5;
  min-height: 100vh;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
