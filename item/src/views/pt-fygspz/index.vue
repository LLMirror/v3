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
          <el-button type="primary" @click="loadSaved" :disabled="!month">加载公司</el-button>

        </div>
        <div class="filter-item">
          <el-button type="success" @click="saveConfig(false)">保存</el-button>
  
        </div>
      </div>
      <div class="table-container">
        <div class="table-header">
          <span class="table-title">公司列表（绑定基础/阶梯配置）</span>
        </div>
        <el-table :data="rows" border stripe height="520">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="company" label="公司" min-width="200">
            <template #default="scope">
              <template v-if="scope.row.id">
                <span>{{ scope.row.company }}</span>
              </template>
              <template v-else>
                <el-input v-model="scope.row.company" placeholder="请输入公司名称" />
              </template>
            </template>
          </el-table-column>
          <el-table-column prop="team" label="绑定车队" min-width="460">
            <template #default="scope">
              <el-select v-model="scope.row.original_names" multiple filterable allow-create default-first-option style="width: 100%" @change="syncOriginal(scope.row)">
                <el-option v-for="n in (scope.row.available_original || scope.row.original_names || [])" :key="n" :label="n" :value="n" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="base_policy_id" label="基础配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.base_policy_id" filterable placeholder="选择基础政策" style="width:100%">
                <el-option v-for="p in basePolicies" :key="p.policy_id" :label="p.policy_id" :value="p.policy_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="ladder_policy_id" label="阶梯配置" min-width="220">
            <template #default="scope">
              <el-select v-model="scope.row.ladder_selected" multiple filterable placeholder="选择阶梯政策（基础/激励各选一个）" style="width:100%" @change="enforceLadder(scope.row)">
                <el-option v-for="p in ladderPolicies" :key="p.policy_id" :label="p.policy_id + '｜' + (p.rule_type||'')" :value="p.policy_id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140">
            <template #default="scope">
              <el-button type="primary" plain size="small" @click="copyRow(scope.$index)">复制</el-button>
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
import dayjs from 'dayjs';
import { ElMessage } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import request from '@/utils/request';

const month = ref(dayjs().subtract(1, 'month').format('YYYY-MM'));
const rows = ref([]);
const baselineRows = ref([]);
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
const copyRow = (i) => {
  const src = rows.value[i];
  const clone = JSON.parse(JSON.stringify(src));
  clone.id = undefined;
  rows.value.splice(i + 1, 0, clone);
};

const loadPolicies = async () => {
  try {
    const baseRes = await request.post('/pt_fylist/rules-query', { table: 'base', page: 1, size: 1000 }, { headers: { repeatSubmit: false } });
    const ladRes = await request.post('/pt_fylist/rules-query', { table: 'ladder', page: 1, size: 1000 }, { headers: { repeatSubmit: false } });
    const baseList = baseRes.data?.list || [];
    const ladderList = ladRes.data?.list || [];
    const uniqBy = (arr, key) => {
      const seen = new Set();
      const out = [];
      arr.forEach(item => {
        const k = item[key];
        if (!seen.has(k)) {
          seen.add(k);
          out.push(item);
        }
      });
      return out;
    };
    const sortAsc = (arr) => arr.sort((a, b) => String(a.policy_id).localeCompare(String(b.policy_id), 'zh-Hans-CN', { numeric: true }));
    basePolicies.value = sortAsc(uniqBy(baseList, 'policy_id'));
    ladderPolicies.value = sortAsc(uniqBy(ladderList, 'policy_id'));
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
    progressVisible.value = true;
    uploadPercentage.value = 0;
    progressStatusText.value = '正在检查已保存配置...';
    const saved = await request.post('/pt_fylist/company-policy/query', { month: month.value }, { headers: { repeatSubmit: false } });
    const savedList = saved.data?.list || [];
    if (savedList.length > 0) {
      const enrich = await request.post('/pt_fylist/company-list/query', { month: month.value }, { headers: { repeatSubmit: false } });
      const map = {};
      (enrich.data?.list || []).forEach(r => { map[r.company] = r.original_names ? JSON.parse(r.original_names) : []; });
      rows.value = savedList.map(r => ({
        id: r.id,
        company: r.company,
        original_names: (() => { try { const t = JSON.parse(r.team || '[]'); return (t && t.length) ? t : (map[r.company] || []); } catch { return map[r.company] || []; } })(),
        available_original: map[r.company] || [],
        base_policy_id: r.base_policy_id || '',
        ladder_selected: (() => { try {
          const arr = JSON.parse(r.ladder_policy_id || '[]');
          return Array.isArray(arr) ? arr.map(x => x.policy_id).filter(Boolean) : [];
        } catch { return []; } })()
      }));
      baselineRows.value = JSON.parse(JSON.stringify(rows.value));
      uploadPercentage.value = 100;
      progressStatusText.value = '完成';
      ElMessage.success(`已加载已保存配置 ${rows.value.length} 条`);
      return;
    }
    uploadPercentage.value = 30;
    progressStatusText.value = '正在检查公司列表...';
    const q = await request.post('/pt_fylist/company-list/query', { month: month.value }, { headers: { repeatSubmit: false } });
    const companies = q.data?.list || [];
    if (companies.length > 0) {
      rows.value = companies.map(r => ({ id: undefined, company: r.company, original_names: r.original_names ? JSON.parse(r.original_names) : [], available_original: r.original_names ? JSON.parse(r.original_names) : [], base_policy_id: '', ladder_selected: [] }));
      baselineRows.value = JSON.parse(JSON.stringify(rows.value));
      uploadPercentage.value = 100;
      progressStatusText.value = '完成';
      ElMessage.success(`已加载公司列表 ${rows.value.length} 条`);
      return;
    }
    uploadPercentage.value = 60;
    progressStatusText.value = '正在从结算表生成公司列表...';
    await request.post('/pt_fylist/company-list/generate', { month: month.value, append: false }, { headers: { repeatSubmit: false }, timeout: 600000 });
    const q2 = await request.post('/pt_fylist/company-list/query', { month: month.value }, { headers: { repeatSubmit: false } });
    const companies2 = q2.data?.list || [];
    rows.value = companies2.map(r => ({ id: undefined, company: r.company, original_names: r.original_names ? JSON.parse(r.original_names) : [], available_original: r.original_names ? JSON.parse(r.original_names) : [], base_policy_id: '', ladder_selected: [] }));
    baselineRows.value = JSON.parse(JSON.stringify(rows.value));
    uploadPercentage.value = 100;
    progressStatusText.value = '完成';
    ElMessage.success(`已生成并加载公司 ${rows.value.length} 条`);
  } catch {
    ElMessage.error('加载失败');
  } finally {
    setTimeout(() => { progressVisible.value = false; }, 500);
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
    const arrEq = (a, b) => {
      const aa = (Array.isArray(a) ? [...a] : []).map(x => String(x)).sort();
      const bb = (Array.isArray(b) ? [...b] : []).map(x => String(x)).sort();
      if (aa.length !== bb.length) return false;
      for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
      return true;
    };
    const baselineMap = new Map((baselineRows.value || []).map(r => [r.id || `${r.company}`, r]));
    const toLadderJson = (row) => {
      const selected = Array.isArray(row.ladder_selected) ? row.ladder_selected : [];
      const typeMap = {};
      selected.forEach(id => {
        const p = ladderPolicies.value.find(x => x.policy_id === id);
        const t = p?.rule_type || '';
        typeMap[t] = { policy_id: id, rule_type: t || null };
      });
      return JSON.stringify(Object.values(typeMap));
    };
    const inserts = [];
    const updates = [];
    rows.value.forEach(r => {
      const key = r.id || `${r.company}`;
      const base = baselineMap.get(key);
      const teamJson = JSON.stringify(r.original_names || []);
      const ladderJson = toLadderJson(r);
      if (!r.id) {
        inserts.push({ company: r.company, team: teamJson, base_policy_id: r.base_policy_id || '', ladder_policy_id: ladderJson });
      } else {
        const baseTeam = JSON.stringify(base?.original_names || []);
        const baseLadder = toLadderJson(base || {});
        const changed = (!arrEq(r.original_names, base?.original_names)) || (String(r.base_policy_id || '') !== String(base?.base_policy_id || '')) || (ladderJson !== baseLadder);
        if (changed) {
          updates.push({ id: r.id, company: r.company, team: teamJson, base_policy_id: r.base_policy_id || '', ladder_policy_id: ladderJson });
        }
      }
    });
    let savedCount = 0;
    if (updates.length > 0) {
      const resU = await request.post('/pt_fylist/company-policy/update', { list: updates }, { headers: { repeatSubmit: false }, timeout: 600000 });
      if (!(resU.code === 1 && resU.data && resU.data.success)) throw new Error(resU.data?.msg || resU.msg || '更新失败');
      savedCount += (resU.data.updated || 0);
    }
    if (inserts.length > 0) {
      const resS = await request.post('/pt_fylist/company-policy/save', { month: month.value, list: inserts, append: true }, { headers: { repeatSubmit: false }, timeout: 600000 });
      if (!(resS.code === 1 && resS.data && resS.data.success)) throw new Error(resS.data?.msg || resS.msg || '保存失败');
      savedCount += (resS.data.saved || 0);
    }
    uploadPercentage.value = 100;
    progressStatusText.value = '保存完成！';
    ElMessage.success(`保存成功：${savedCount} 条`);
    status.title = '保存成功';
    status.type = 'success';
    status.msg = `保存成功，共 ${savedCount} 条。`;
    await loadSaved();
  } catch (e) {
    ElMessage.error('保存失败');
    status.title = '保存失败';
    status.type = 'error';
    status.msg = '保存失败：' + (e.message || '未知错误');
  } finally {
    setTimeout(() => { progressVisible.value = false; }, 500);
  }
};

const syncOriginal = (row) => {
  const names = Array.isArray(row.original_names) ? row.original_names : [];
  const set = new Set(row.available_original || []);
  names.forEach(n => set.add(n));
  row.available_original = Array.from(set);
};

const enforceLadder = (row) => {
  const selected = Array.isArray(row.ladder_selected) ? row.ladder_selected : [];
  const typeIndex = {};
  const result = [];
  selected.forEach(id => {
    const p = ladderPolicies.value.find(x => x.policy_id === id);
    const t = p?.rule_type || '';
    if (typeIndex[t] === undefined) {
      typeIndex[t] = result.length;
      result.push(id);
    } else {
      // replace previous selection of same type with latest
      result[typeIndex[t]] = id;
    }
  });
  row.ladder_selected = result;
};

loadPolicies();
loadSaved();
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
.tags.full-list {
  display: flex;
  flex-wrap: wrap;
  margin-top: 4px;
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
