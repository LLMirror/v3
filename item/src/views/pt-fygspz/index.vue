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
          <el-date-picker v-model="month" type="month" placeholder="选择月份" format="YYYY-MM" value-format="YYYY-MM" class="filter-input" />
        </div>
        <div class="filter-item">
          <el-button type="primary" @click="loadSaved">加载公司</el-button>
          <el-button type="primary" @click="loadPolicies">加载联邦政策</el-button>
          <el-button type="warning" plain @click="downloadTemplate">下载导入模板</el-button>
          <el-upload action="#" :show-file-list="false" :http-request="uploadImport" accept=".xlsx,.xls">
            <el-button type="success">批量导入</el-button>
          </el-upload>
        </div>
        <div class="filter-item">
          <el-button type="success" @click="saveConfig(false)">保存</el-button>
          <el-button type="success" plain @click="saveConfig(true)">追加保存</el-button>
          <el-button @click="addRow">添加保存</el-button>
        </div>
      </div>
      <div class="table-container">
        <div class="table-header">
          <span class="table-title">公司列表（绑定基础/阶梯配置）</span>
        </div>
        <el-table :data="rows" border stripe height="520">
          <el-table-column prop="company" label="公司" min-width="200">
            <template #default="scope">
              <el-input v-model="scope.row.company" />
            </template>
          </el-table-column>
          <el-table-column prop="team" label="绑定车队" min-width="200">
            <template #default="scope">
              <el-input v-model="scope.row.team" />
            </template>
          </el-table-column>
          <el-table-column prop="base_policy_id" label="基础配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.base_policy_id" filterable placeholder="选择基础政策">
                <el-option v-for="p in basePolicies" :key="p.policy_id" :label="p.policy_id + '｜' + (p.category||'') + '｜' + (p.port||'') + '｜' + (p.method||'')" :value="p.policy_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="ladder_policy_id" label="阶梯配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.ladder_policy_id" filterable placeholder="选择阶梯政策">
                <el-option v-for="p in ladderPolicies" :key="p.policy_id" :label="p.policy_id + '｜' + (p.rule_type||'') + '｜' + (p.dimension||'') + '｜' + (p.method||'')" :value="p.policy_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="scope">
              <el-button type="danger" plain size="small" @click="removeRow(scope.$index)">删除</el-button>
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
      <el-dialog v-model="progressVisible" title="正在处理" width="400px" :close-on-click-modal="false" :show-close="false" center>
        <div class="progress-content">
          <el-progress type="circle" :percentage="uploadPercentage" />
          <div class="progress-text">{{ progressStatusText }}</div>
        </div>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import request from '@/utils/request';

const month = ref('');
const rows = ref([]);
const basePolicies = ref([]);
const ladderPolicies = ref([]);
const status = reactive({ title: '提示', type: 'info', msg: '请选择生效月份，并加载公司与政策选项。' });
const progressVisible = ref(false);
const uploadPercentage = ref(0);
const progressStatusText = ref('准备中...');

const addRow = () => {
  rows.value.push({ company: '', team: '', base_policy_id: '', ladder_policy_id: '' });
};
const removeRow = (i) => {
  rows.value.splice(i, 1);
};

const loadPolicies = async () => {
  try {
    const baseRes = await request.post('/pt_fylist/rules-query', { table: 'base', page: 1, size: 1000 }, { headers: { repeatSubmit: false } });
    const ladRes = await request.post('/pt_fylist/rules-query', { table: 'ladder', page: 1, size: 1000 }, { headers: { repeatSubmit: false } });
    basePolicies.value = baseRes.data?.list || [];
    ladderPolicies.value = ladRes.data?.list || [];
    ElMessage.success('政策加载完成');
  } catch {
    ElMessage.error('政策加载失败');
  }
};

const loadSaved = async () => {
  if (!month.value) {
    ElMessage.warning('请先选择生效月份');
    return;
  }
  try {
    const res = await request.post('/pt_fylist/company-policy/query', { month: month.value }, { headers: { repeatSubmit: false } });
    rows.value = res.data?.list || [];
    ElMessage.success('已加载公司配置');
  } catch {
    ElMessage.error('加载失败');
  }
};

const downloadTemplate = async () => {
  try {
    const res = await request({ url: '/pt_fylist/company-policy/template', method: 'get', responseType: 'blob' });
    const blob = new Blob([res.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = '公司返佣配置模板.xlsx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    ElMessage.success('模板下载成功');
  } catch {
    ElMessage.error('下载模板失败');
  }
};

const uploadImport = async (options) => {
  try {
    if (!month.value) {
      ElMessage.warning('请先选择生效月份');
      return;
    }
    const fd = new FormData();
    fd.append('file', options.file);
    fd.append('month', month.value);
    progressVisible.value = true;
    uploadPercentage.value = 0;
    progressStatusText.value = '正在上传文件...';
    const res = await request({ url: '/pt_fylist/company-policy/import', method: 'post', data: fd, headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false }, timeout: 600000 });
    uploadPercentage.value = 100;
    progressStatusText.value = '解析完成！';
    if (res.code === 1 && res.data && res.data.success) {
      rows.value = res.data.list || [];
      ElMessage.success(`解析成功，共 ${rows.value.length} 条`);
    } else {
      ElMessage.error(res.data?.msg || res.msg || '解析失败');
    }
  } catch (e) {
    ElMessage.error('解析失败');
  } finally {
    setTimeout(() => { progressVisible.value = false; }, 500);
  }
};

const saveConfig = async (append) => {
  if (!month.value) {
    ElMessage.warning('请先选择生效月份');
    return;
  }
  if (rows.value.length === 0) {
    ElMessage.warning('没有可保存的数据');
    return;
  }
  try {
    progressVisible.value = true;
    uploadPercentage.value = 0;
    progressStatusText.value = '正在保存配置...';
    const res = await request.post('/pt_fylist/company-policy/save', { month: month.value, list: rows.value, append: !!append }, { headers: { repeatSubmit: false }, timeout: 600000 });
    uploadPercentage.value = 100;
    progressStatusText.value = '保存完成！';
    if (res.code === 1 && res.data && res.data.success) {
      ElMessage.success(`保存成功：${res.data.saved} 条`);
      status.title = '保存成功';
      status.type = 'success';
      status.msg = `保存成功，共 ${res.data.saved} 条。`;
    } else {
      ElMessage.error(res.data?.msg || res.msg || '保存失败');
      status.title = '保存失败';
      status.type = 'error';
      status.msg = res.data?.msg || res.msg || '保存失败';
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
  margin-top: 12px;
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
