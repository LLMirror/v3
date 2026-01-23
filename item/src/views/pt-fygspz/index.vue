<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>公司返佣配置</span>
          </div>
        </div>
      </template>
      <div class="filter-container">
        <div class="filter-item">
          <span class="filter-label">生效月份</span>
          <el-date-picker v-model="yearMonth" type="month" placeholder="选择月份" format="YYYY-MM" value-format="YYYY-MM" class="filter-input" @change="handleMonthChange" />
        </div>
        <div class="filter-item">
          <el-button type="primary" @click="loadCompanies" :disabled="!yearMonth">加载公司</el-button>
          <el-button @click="loadExistingRules" :disabled="!yearMonth">加载现有绑定</el-button>
        </div>
      </div>

      <div class="table-container">
        <div class="table-header">
          <span class="table-title">公司列表（绑定基础/阶梯配置）</span>
          <div>
            <el-button type="success" @click="handleSave" :disabled="companies.length===0">保存</el-button>
            <el-button @click="overwrite = !overwrite">{{ overwrite ? '覆盖当前月份所有绑定' : '追加保存' }}</el-button>
          </div>
        </div>
        <el-table :data="companies" border stripe height="500" :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }">
          <el-table-column prop="company" label="公司" min-width="220" />
          <el-table-column label="基础配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.base_policy_id" filterable placeholder="选择基础配置" style="width:200px">
                <el-option v-for="opt in baseOptions" :key="opt.policy_id" :label="opt.policy_id" :value="opt.policy_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="阶梯配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.ladder_policy_id" filterable placeholder="选择阶梯配置" style="width:200px">
                <el-option v-for="opt in ladderOptions" :key="opt.policy_id" :label="opt.policy_id" :value="opt.policy_id" />
              </el-select>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="alert-container" v-if="status.msg">
        <el-alert :title="status.title" :type="status.type" :closable="false" show-icon class="custom-alert">
          <template #default>
            <div class="alert-content" v-html="status.msg"></div>
          </template>
        </el-alert>
      </div>
    </el-card>
  </div>
  <el-dialog v-model="progressVisible" title="正在保存绑定" width="400px" :close-on-click-modal="false" :show-close="false" center>
    <div class="progress-content">
      <el-progress type="circle" :percentage="uploadPercentage" />
      <div class="progress-text">{{ progressStatusText }}</div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import request from '@/utils/request';

const yearMonth = ref('');
const companies = ref([]);
const baseOptions = ref([]);
const ladderOptions = ref([]);
const overwrite = ref(false);

const progressVisible = ref(false);
const uploadPercentage = ref(0);
const progressStatusText = ref('准备保存...');

const status = reactive({
  title: '提示',
  type: 'info',
  msg: '请选择生效月份，并加载公司与配置选项。'
});

const handleMonthChange = () => {
  companies.value = [];
};

const loadCompanies = async () => {
  if (!yearMonth.value) {
    ElMessage.warning('请选择生效月份');
    return;
  }
  try {
    const res = await request({ url: '/pt_fylist/company-by-month', method: 'get', params: { yearMonth: yearMonth.value } });
    if (res.code === 1 && res.data && res.data.success) {
      companies.value = (res.data.companies || []).map(c => ({ company: c, base_policy_id: '', ladder_policy_id: '' }));
      status.title = '公司加载成功';
      status.type = 'success';
      status.msg = `共加载 ${companies.value.length} 个公司，选择基础/阶梯配置后保存。`;
      await loadRuleOptions();
    } else {
      ElMessage.error(res.data?.msg || res.msg || '加载公司失败');
    }
  } catch (e) {
    ElMessage.error('加载公司失败');
  }
};

const loadRuleOptions = async () => {
  try {
    const res = await request({ url: '/pt_fylist/rules-options', method: 'get' });
    if (res.code === 1 && res.data && res.data.success) {
      baseOptions.value = res.data.baseOptions || [];
      ladderOptions.value = res.data.ladderOptions || [];
    }
  } catch {}
};

const loadExistingRules = async () => {
  if (!yearMonth.value) {
    ElMessage.warning('请选择生效月份');
    return;
  }
  try {
    const res = await request({ url: '/pt_fylist/company-rules', method: 'get', params: { yearMonth: yearMonth.value } });
    if (res.code === 1 && res.data && res.data.success) {
      const map = new Map((res.data.list || []).map(r => [r.company, r]));
      companies.value = (companies.value.length ? companies.value : []).map(row => {
        const m = map.get(row.company);
        return m ? { company: row.company, base_policy_id: m.base_policy_id || '', ladder_policy_id: m.ladder_policy_id || '' } : row;
      });
      if (companies.value.length === 0) {
        // if companies not loaded yet, construct from mapping
        companies.value = (res.data.list || []).map(r => ({ company: r.company, base_policy_id: r.base_policy_id || '', ladder_policy_id: r.ladder_policy_id || '' }));
      }
      status.title = '绑定加载成功';
      status.type = 'success';
      status.msg = `已加载 ${res.data.list?.length || 0} 条历史绑定，可编辑后保存。`;
      await loadRuleOptions();
    } else {
      ElMessage.error(res.data?.msg || res.msg || '加载绑定失败');
    }
  } catch {
    ElMessage.error('加载绑定失败');
  }
};

const handleSave = async () => {
  if (!yearMonth.value) {
    ElMessage.warning('请选择生效月份');
    return;
  }
  if (companies.value.length === 0) {
    ElMessage.warning('请先加载公司');
    return;
  }
  progressVisible.value = true;
  uploadPercentage.value = 0;
  progressStatusText.value = '正在保存公司绑定...';
  try {
    const items = companies.value.map(r => ({ company: r.company, base_policy_id: r.base_policy_id || '', ladder_policy_id: r.ladder_policy_id || '' }));
    const res = await request.post('/pt_fylist/company-rules-save', { yearMonth: yearMonth.value, items, overwrite: overwrite.value }, { headers: { repeatSubmit: false }, timeout: 600000 });
    if (res.code === 1 && res.data && res.data.success) {
      uploadPercentage.value = 100;
      progressStatusText.value = '保存完成！';
      ElMessage.success(`保存成功：${res.data.saved} 条`);
      status.title = '保存成功';
      status.type = 'success';
      status.msg = `保存成功：${res.data.saved} 条绑定。`;
    } else {
      const msg = res.data?.msg || res.msg || '保存失败';
      ElMessage.error(msg);
      status.title = '保存失败';
      status.type = 'error';
      status.msg = msg;
    }
  } catch (e) {
    ElMessage.error('保存失败');
    status.title = '保存失败';
    status.type = 'error';
    status.msg = '保存失败：' + (e.message || '未知错误');
  } finally {
    setTimeout(() => { progressVisible.value = false; }, 500);
  }
};
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
  gap: 16px;
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
.alert-container {
  margin-top: 16px;
}
.custom-alert {
  border-radius: 6px;
  border: 1px solid #e1f3d8;
  background-color: #f0f9eb;
}
.alert-content {
  line-height: 1.6;
  font-size: 14px;
}
.progress-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.progress-text {
  margin-top: 15px;
  color: #606266;
  font-size: 14px;
}
</style>
