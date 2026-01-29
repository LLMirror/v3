<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>返佣规则导入</span>
          </div>
        </div>
      </template>
      <div class="filter-container">
        <div class="filter-item">
          <el-button type="warning" plain icon="Download" @click="handleDownloadRulesTemplate" class="action-btn">
            下载规则模板
          </el-button>
          <el-upload
            action="#"
            :show-file-list="false"
            :http-request="customRulesUpload"
            accept=".xlsx, .xls"
            class="upload-btn-wrapper"
          >
            <el-button type="primary" icon="Upload" :loading="uploading">上传规则模板</el-button>
          </el-upload>
        </div>
      </div>
      <div class="table-container">
        <div class="table-header">
          <span class="table-title">已上传规则</span>
          <div>
            <el-button type="primary" @click="loadBaseOnline">刷新基础</el-button>
            <el-button type="primary" @click="loadLadderOnline">刷新阶梯</el-button>
            <el-button type="success" @click="saveOnlineEdits">保存修改</el-button>
            <el-button type="danger" @click="deleteSelectedOnline">删除选中</el-button>
            <el-button @click="addNewBase">新增基础</el-button>
            <el-button @click="addNewLadder">新增阶梯</el-button>
          </div>
        </div>
        <el-tabs type="border-card" v-model="activeOnline">
          <el-tab-pane label="基础配置" name="online-base">
            <el-table :data="baseOnlineRows" border stripe height="400" @selection-change="sel=>baseSelectedIds=sel.map(r=>r.id)">
              <el-table-column type="selection" width="55" />
              <el-table-column prop="policy_id" label="政策ID" width="140">
                <template #default="scope"><el-input v-model="scope.row.policy_id" :disabled="isBaseDisabled(scope.row)" /></template>
              </el-table-column>
              <el-table-column prop="category" label="分类" width="120">
                <template #default="scope"><span>基础</span></template>
              </el-table-column>
              <el-table-column prop="port" label="端口" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.port" :disabled="isBaseDisabled(scope.row)" style="width: 110px">
                    <el-option label="司机" value="司机" />
                    <el-option label="乘客" value="乘客" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="base_metric" label="基数" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.base_metric" :disabled="isBaseDisabled(scope.row)" style="width: 110px">
                    <el-option label="单量" value="单量" />
                    <el-option label="金额" value="金额" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="double_calc" label="双计算开关" width="120">
                <template #default="scope">
                  <el-switch v-model="scope.row.double_calc" :active-value="1" :inactive-value="0" :disabled="isBaseDisabled(scope.row)" @change="onDoubleCalcChange(scope.row)" />
                </template>
              </el-table-column>
              <el-table-column prop="free_rate_value" label="免佣费率/单价" width="140">
                <template #default="scope">
                  <el-input v-model="scope.row.free_rate_display" @blur="formatRateWithKey(scope.row,'free_rate_display','free_rate_value')" :disabled="isBaseDisabled(scope.row) || scope.row.double_calc !== 1" />
                </template>
              </el-table-column>
              <el-table-column prop="unfree_rate_value" label="不免佣费率/单价" width="160">
                <template #default="scope">
                  <el-input v-model="scope.row.unfree_rate_display" @blur="formatRateWithKey(scope.row,'unfree_rate_display','unfree_rate_value')" :disabled="isBaseDisabled(scope.row) || scope.row.double_calc !== 1" />
                </template>
              </el-table-column>
              <el-table-column prop="subtract_free" label="是否减免佣" width="120">
                <template #default="scope"><el-switch v-model="scope.row.subtract_free" :active-value="1" :inactive-value="0" :disabled="isBaseDisabled(scope.row) || scope.row.double_calc === 1" /></template>
              </el-table-column>
              <el-table-column prop="subtract_mozhu" label="是否扣除墨竹" width="120">
                <template #default="scope"><el-switch v-model="scope.row.subtract_mozhu" :active-value="1" :inactive-value="0" :disabled="isBaseDisabled(scope.row)" /></template>
              </el-table-column>
              <el-table-column prop="method" label="返佣方式" width="120">
                <template #default="scope"><el-select v-model="scope.row.method" :disabled="isBaseDisabled(scope.row)"><el-option label="百分比" value="百分比" /><el-option label="单价" value="单价" /></el-select></template>
              </el-table-column>
              <el-table-column prop="rate_value" label="费率/单价" width="140">
                <template #default="scope"><el-input v-model="scope.row.rate_display" @blur="formatRate(scope.row)" :disabled="isBaseDisabled(scope.row) || scope.row.double_calc === 1" /></template>
              </el-table-column>
              <el-table-column prop="remark" label="备注" min-width="180">
                <template #default="scope"><el-input v-model="scope.row.remark" :disabled="isBaseDisabled(scope.row)" /></template>
              </el-table-column>
            </el-table>
            <div class="pagination-container">
              <el-pagination v-model:current-page="basePage" v-model:page-size="baseSize" :total="baseTotal" @current-change="loadBaseOnline" @size-change="loadBaseOnline" layout="total, sizes, prev, pager, next, jumper" />
            </div>
          </el-tab-pane>
          <el-tab-pane label="阶梯规则" name="online-ladder">
            <el-table :data="ladderOnlineRows" border stripe height="400" @selection-change="sel=>ladderSelectedIds=sel.map(r=>r.id)">
              <el-table-column type="selection" width="55" />
              <el-table-column prop="policy_id" label="政策ID" width="140">
                <template #default="scope"><el-input v-model="scope.row.policy_id" :disabled="isLadderDisabled(scope.row)" /></template>
              </el-table-column>
              <el-table-column prop="rule_type" label="规则类型" width="160">
                <template #default="scope">
                  <el-select v-model="scope.row.rule_type" style="width:140px" :disabled="isLadderDisabled(scope.row)">
                    <el-option label="阶梯《基础》规则" value="阶梯《基础》规则" />
                    <el-option label="阶梯《激励》规则" value="阶梯《激励》规则" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="dimension" label="维度" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.dimension" :disabled="isLadderDisabled(scope.row)" style="width: 110px">
                    <el-option label="司机" value="司机" />
                    <el-option label="乘客" value="乘客" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="subtract_free" label="扣减免佣" width="120">
                <template #default="scope"><el-switch v-model="scope.row.subtract_free" :active-value="1" :inactive-value="0" :disabled="isLadderDisabled(scope.row) || scope.row.double_calc === 1" /></template>
              </el-table-column>
              <el-table-column prop="metric" label="基数" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.metric" :disabled="isLadderDisabled(scope.row)" style="width: 120px">
                    <el-option label="单量" value="单量" />
                    <el-option label="金额" value="金额" />
                    <el-option label="日均单" value="日均单" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="min_val" label="最小值(>=)" width="140">
                <template #default="scope"><el-input v-model="scope.row.min_val" @blur="formatNumber(scope.row,'min_val')" :disabled="isLadderDisabled(scope.row)" /></template>
              </el-table-column>
              <el-table-column prop="max_val" label="最大值(<)" width="140">
                <template #default="scope"><el-input v-model="scope.row.max_val" @blur="formatNumber(scope.row,'max_val')" :disabled="isLadderDisabled(scope.row)" /></template>
              </el-table-column>
              <el-table-column prop="range_preview" label="范围预览" min-width="180" />
              <el-table-column prop="method" label="返佣方式" width="120">
                <template #default="scope">
                  <el-select v-model="scope.row.method" style="width:110px" :disabled="isLadderDisabled(scope.row)">
                    <el-option label="百分比" value="百分比" />
                    <el-option label="单价" value="单价" />
                    <el-option label="返现" value="返现" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column prop="double_calc" label="双计算开关" width="120">
                <template #default="scope">
                  <el-switch v-model="scope.row.double_calc" :active-value="1" :inactive-value="0" :disabled="isLadderDisabled(scope.row)" @change="onLadderDoubleCalcChange(scope.row)" />
                </template>
              </el-table-column>
              <el-table-column prop="free_rate_value" label="免佣费率/单价" width="140">
                <template #default="scope">
                  <el-input v-model="scope.row.free_rate_display" @blur="formatRateWithKey(scope.row,'free_rate_display','free_rate_value')" :disabled="isLadderDisabled(scope.row) || scope.row.double_calc !== 1" />
                </template>
              </el-table-column>
              <el-table-column prop="unfree_rate_value" label="不免佣费率/单价" width="160">
                <template #default="scope">
                  <el-input v-model="scope.row.unfree_rate_display" @blur="formatRateWithKey(scope.row,'unfree_rate_display','unfree_rate_value')" :disabled="isLadderDisabled(scope.row) || scope.row.double_calc !== 1" />
                </template>
              </el-table-column>
              <el-table-column prop="rule_value" label="费率/单价" width="140">
                <template #default="scope"><el-input v-model="scope.row.rule_display" @blur="formatRule(scope.row)" :disabled="isLadderDisabled(scope.row) || scope.row.double_calc === 1" /></template>
              </el-table-column>
              <el-table-column prop="unit" label="单位" width="100" />
            </el-table>
            <div class="pagination-container">
              <el-pagination v-model:current-page="ladderPage" v-model:page-size="ladderSize" :total="ladderTotal" @current-change="loadLadderOnline" @size-change="loadLadderOnline" layout="total, sizes, prev, pager, next, jumper" />
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div class="alert-container" v-if="importStatus.msg">
        <el-alert :title="importStatus.title" :type="importStatus.type" :closable="false" show-icon class="custom-alert">
          <template #default>
            <div class="alert-content" v-html="importStatus.msg"></div>
          </template>
        </el-alert>
      </div>
      <div v-if="baseHeaders.length || ladderHeaders.length" class="table-container">
        <div class="table-header">
          <span class="table-title">规则预览</span>
        </div>
        <el-tabs type="border-card" v-model="activeTab">
          <el-tab-pane label="基础配置" name="base">
            <el-table :data="basePreview" border stripe height="400" :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }">
              <el-table-column v-for="c in baseHeaders" :key="c.prop" :prop="c.prop" :label="c.label" show-overflow-tooltip min-width="140" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="阶梯规则" name="ladder">
            <el-table :data="ladderPreview" border stripe height="400" :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }">
              <el-table-column v-for="c in ladderHeaders" :key="c.prop" :prop="c.prop" :label="c.label" show-overflow-tooltip min-width="140" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
        <div class="action-row">
          <el-switch v-model="overwrite" inline-prompt active-text="覆盖旧规则" inactive-text="追加规则" />
          <el-button type="success" icon="Check" :loading="saving" @click="handleSaveRules">确认导入数据库</el-button>
        </div>
      </div>
      <el-dialog v-model="progressVisible" title="正在导入规则" width="400px" :close-on-click-modal="false" :show-close="false" center>
        <div class="progress-content">
          <el-progress type="circle" :percentage="uploadPercentage" />
          <div class="progress-text">{{ progressStatusText }}</div>
        </div>
      </el-dialog>
      <el-dialog v-model="dupDialogVisible" title="重复政策ID处理" width="800px">
        <div class="dup-container">
          <div class="dup-section" v-if="baseDupList.length">
            <div class="dup-title">基础配置重复（勾选表示覆盖上传）</div>
            <el-table :data="baseDupList" border stripe height="240">
              <el-table-column label="覆盖" width="80">
                <template #default="scope">
                  <el-checkbox :model-value="baseDupSelected.includes(scope.row.policy_id)" @change="(v)=>toggleBaseDup(scope.row.policy_id, v)" />
                </template>
              </el-table-column>
              <el-table-column prop="policy_id" label="政策ID" width="140" />
              <el-table-column prop="count" label="现有条数" width="120" />
              <el-table-column prop="category" label="分类" width="120" />
              <el-table-column prop="port" label="端口" width="120" />
              <el-table-column prop="base_metric" label="基数" width="120" />
              <el-table-column prop="method" label="返佣方式" width="120" />
              <el-table-column prop="rate_value" label="费率/单价" width="140" />
            </el-table>
          </div>
          <div class="dup-section" v-if="ladderDupList.length" style="margin-top:12px;">
            <div class="dup-title">阶梯规则重复（勾选表示覆盖上传）</div>
            <el-table :data="ladderDupList" border stripe height="240">
              <el-table-column label="覆盖" width="80">
                <template #default="scope">
                  <el-checkbox :model-value="ladderDupSelected.includes(scope.row.policy_id)" @change="(v)=>toggleLadderDup(scope.row.policy_id, v)" />
                </template>
              </el-table-column>
              <el-table-column prop="policy_id" label="政策ID" width="140" />
              <el-table-column prop="count" label="现有条数" width="120" />
              <el-table-column prop="rule_type" label="规则类型" width="120" />
              <el-table-column prop="dimension" label="维度" width="120" />
              <el-table-column prop="metric" label="基数" width="120" />
              <el-table-column prop="method" label="返佣方式" width="120" />
              <el-table-column prop="rule_display" label="费率/单价" width="140" />
            </el-table>
          </div>
        </div>
        <template #footer>
          <el-button @click="dupDialogVisible=false">取消</el-button>
          <el-button type="primary" @click="confirmDupAndSave">确定覆盖并保存</el-button>
        </template>
      </el-dialog>
      <div v-if="summaryVisible" class="summary-container">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="基础配置导入条数">{{ summary.baseSimpleCount }}</el-descriptions-item>
          <el-descriptions-item label="阶梯规则导入条数">{{ summary.ladderCount }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Document, Upload, Download, Check } from '@element-plus/icons-vue';
import request from '@/utils/request';

const uploading = ref(false);
const progressVisible = ref(false);
const uploadPercentage = ref(0);
const progressStatusText = ref('准备上传...');
const summaryVisible = ref(false);
const summary = reactive({ baseSimpleCount: 0, ladderCount: 0 });
const baseHeaders = ref([]);
const ladderHeaders = ref([]);
const baseRows = ref([]);
const ladderRows = ref([]);
const activeTab = ref('base');
const overwrite = ref(false);
const saving = ref(false);
const dupDialogVisible = ref(false);
const baseDupList = ref([]);
const ladderDupList = ref([]);
const baseDupSelected = ref([]);
const ladderDupSelected = ref([]);
const inUseBaseSet = ref(new Set());
const inUseLadderSet = ref(new Set());
const fetchInUse = async () => {
  try {
    const res = await request({ url: '/pt_fylist/rules-in-use', method: 'get' });
    const base = (res.data?.base || []).map(String);
    const lad = (res.data?.ladder || []).map(String);
    inUseBaseSet.value = new Set(base);
    inUseLadderSet.value = new Set(lad);
  } catch {}
};
const isBaseDisabled = (row) => inUseBaseSet.value.has(String(row.policy_id || ''));
const isLadderDisabled = (row) => inUseLadderSet.value.has(String(row.policy_id || ''));

const importStatus = reactive({
  title: '提示',
  type: 'info',
  msg: '请下载规则模板，并上传填写后的 Excel 进行导入。'
});

const handleDownloadRulesTemplate = async () => {
  try {
    const res = await request({
      url: '/pt_fylist/rules-template',
      method: 'get',
      responseType: 'blob'
    });
    const blob = new Blob([res.data]);
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = '规则导入模板.xlsx';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    ElMessage.success('模板下载成功');
  } catch {
    ElMessage.error('下载规则模板失败');
  }
};

const customRulesUpload = async (options) => {
  const { file } = options;
  const fd = new FormData();
  fd.append('file', file);
  uploading.value = true;
  progressVisible.value = true;
  uploadPercentage.value = 0;
  progressStatusText.value = '正在上传文件...';
  try {
    const res = await request({
      url: '/pt_fylist/rules-import',
      method: 'post',
      data: fd,
      headers: { 'Content-Type': 'multipart/form-data', repeatSubmit: false },
      timeout: 600000,
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / e.total);
        uploadPercentage.value = percent < 100 ? percent : 99;
        progressStatusText.value = percent < 100 ? `正在上传文件... ${percent}%` : '上传完成，正在导入...';
      }
    });
    uploadPercentage.value = 100;
    progressStatusText.value = '导入完成！';
    if (res.code === 1 && res.data && res.data.success) {
      const { baseSimpleCount = 0, ladderCount = 0, baseSimpleHeaders = [], ladderHeaders: ladders = [], baseSimpleRows = [], ladderRows: laddersRows = [] } = res.data;
      summary.baseSimpleCount = baseSimpleCount;
      summary.ladderCount = ladderCount;
      summaryVisible.value = true;
      baseHeaders.value = baseSimpleHeaders;
      ladderHeaders.value = ladders;
      baseRows.value = baseSimpleRows;
      ladderRows.value = laddersRows;
      importStatus.title = '规则导入成功';
      importStatus.type = 'success';
      importStatus.msg = `规则导入成功：基础配置 ${baseSimpleCount} 条，阶梯规则 ${ladderCount} 条。`;
      ElMessage.success('规则导入成功');
    } else {
      const errMsg = (res && res.data && res.data.msg) ? res.data.msg : (res.msg || '规则导入失败');
      importStatus.title = '规则导入失败';
      importStatus.type = 'error';
      importStatus.msg = errMsg;
      ElMessage.error(errMsg);
    }
  } catch (error) {
    uploadPercentage.value = 0;
    importStatus.title = '规则导入失败';
    importStatus.type = 'error';
    importStatus.msg = '规则导入失败：' + (error.message || '未知错误');
    ElMessage.error('规则导入失败');
  } finally {
    uploading.value = false;
    setTimeout(() => {
      progressVisible.value = false;
    }, 500);
  }
};

const basePreview = computed(() => baseRows.value.slice(0, 100));
const ladderPreview = computed(() => ladderRows.value.slice(0, 100));

const handleSaveRules = async () => {
  if (baseRows.value.length === 0 && ladderRows.value.length === 0) {
    ElMessage.error('没有可保存的规则数据');
    return;
  }
  // check duplicates by policy_id
  const baseIds = Array.from(new Set(baseRows.value.map(r => r.policy_id).filter(Boolean)));
  const ladderIds = Array.from(new Set(ladderRows.value.map(r => r.policy_id).filter(Boolean)));
  try {
    const dup = await request.post('/pt_fylist/rules-check-duplicates', {
      basePolicyIds: baseIds,
      ladderPolicyIds: ladderIds
    }, { headers: { repeatSubmit: false } });
    const baseDup = (dup.data && dup.data.base && dup.data.base.duplicates) ? dup.data.base.duplicates : [];
    const ladderDup = (dup.data && dup.data.ladder && dup.data.ladder.duplicates) ? dup.data.ladder.duplicates : [];
    if ((baseDup.length + ladderDup.length) > 0 && !overwrite.value) {
      baseDupList.value = baseDup;
      ladderDupList.value = ladderDup;
      baseDupSelected.value = baseDup.map(d => d.policy_id);
      ladderDupSelected.value = ladderDup.map(d => d.policy_id);
      dupDialogVisible.value = true;
      importStatus.title = '发现重复政策ID';
      importStatus.type = 'warning';
      importStatus.msg = '检测到数据库已有相同政策ID，请勾选需要覆盖的项或开启“覆盖旧规则”后再保存。';
      return;
    }
  } catch (e) {
    // ignore dup check error and continue
  }
  saving.value = true;
  try {
    const res = await request.post('/pt_fylist/rules-save', {
      baseSimpleRows: baseRows.value,
      ladderRows: ladderRows.value,
      overwrite: overwrite.value,
      overwriteBasePolicyIds: baseDupSelected.value,
      overwriteLadderPolicyIds: ladderDupSelected.value
    }, { headers: { repeatSubmit: false }, timeout: 600000 });
    if (res.code === 1 && res.data && res.data.success) {
      let statsMsg = '';
      try {
        const stats = await request({ url: '/pt_fylist/rules-stats', method: 'get' });
        if (stats.code === 1 && stats.data) {
          statsMsg = `（当前库：基础 ${stats.data.baseCount} 条，阶梯 ${stats.data.ladderCount} 条）`;
        }
      } catch {}
      ElMessage.success(`保存成功：基础 ${res.data.baseSaved}，阶梯 ${res.data.ladderSaved} ${statsMsg}`);
      importStatus.title = '规则保存成功';
      importStatus.type = 'success';
      importStatus.msg = `保存成功：基础 ${res.data.baseSaved} 条，阶梯 ${res.data.ladderSaved} 条。${statsMsg}`;
    } else {
      const msg = (res && res.data && res.data.msg) ? res.data.msg : (res.msg || '保存失败');
      ElMessage.error(msg);
      importStatus.title = '规则保存失败';
      importStatus.type = 'error';
      importStatus.msg = msg;
    }
  } catch (e) {
    ElMessage.error('保存失败');
    importStatus.title = '规则保存失败';
    importStatus.type = 'error';
    importStatus.msg = '保存失败：' + (e.message || '未知错误');
  } finally {
    saving.value = false;
  }
};

const toggleBaseDup = (id, checked) => {
  const set = new Set(baseDupSelected.value);
  if (checked) set.add(id); else set.delete(id);
  baseDupSelected.value = Array.from(set);
};
const toggleLadderDup = (id, checked) => {
  const set = new Set(ladderDupSelected.value);
  if (checked) set.add(id); else set.delete(id);
  ladderDupSelected.value = Array.from(set);
};
const confirmDupAndSave = async () => {
  dupDialogVisible.value = false;
  progressVisible.value = true;
  uploadPercentage.value = 0;
  progressStatusText.value = '准备覆盖重复数据...';
  try {
    const baseIds = Array.from(new Set(baseDupSelected.value));
    const ladderIds = Array.from(new Set(ladderDupSelected.value));
    const totalTasks = baseIds.length + ladderIds.length + baseRows.value.length + ladderRows.value.length;
    let doneTasks = 0;
    const updateProgress = (extra = 0) => {
      doneTasks += extra;
      const pct = Math.floor((doneTasks / Math.max(totalTasks, 1)) * 100);
      uploadPercentage.value = pct < 100 ? pct : 99;
    };
    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };
    const delBaseChunks = chunk(baseIds, 50);
    const delLadderChunks = chunk(ladderIds, 50);
    for (const ids of delBaseChunks) {
      progressStatusText.value = `正在覆盖基础重复（${doneTasks}/${totalTasks}）`;
      await request.post('/pt_fylist/rules-delete-by-policy', { basePolicyIds: ids }, { headers: { repeatSubmit: false } });
      updateProgress(ids.length);
    }
    for (const ids of delLadderChunks) {
      progressStatusText.value = `正在覆盖阶梯重复（${doneTasks}/${totalTasks}）`;
      await request.post('/pt_fylist/rules-delete-by-policy', { ladderPolicyIds: ids }, { headers: { repeatSubmit: false } });
      updateProgress(ids.length);
    }
    const baseChunks = chunk(baseRows.value, 1000);
    const ladderChunks = chunk(ladderRows.value, 1000);
    for (const rows of baseChunks) {
      progressStatusText.value = `正在上传基础配置（${doneTasks}/${totalTasks}）`;
      await request.post('/pt_fylist/rules-save-chunk', { baseSimpleRows: rows, ladderRows: [] }, { headers: { repeatSubmit: false }, timeout: 600000 });
      updateProgress(rows.length);
    }
    for (const rows of ladderChunks) {
      progressStatusText.value = `正在上传阶梯规则（${doneTasks}/${totalTasks}）`;
      await request.post('/pt_fylist/rules-save-chunk', { baseSimpleRows: [], ladderRows: rows }, { headers: { repeatSubmit: false }, timeout: 600000 });
      updateProgress(rows.length);
    }
    uploadPercentage.value = 100;
    progressStatusText.value = '导入完成！';
    const stats = await request({ url: '/pt_fylist/rules-stats', method: 'get' });
    const statsMsg = (stats.code === 1 && stats.data) ? `（当前库：基础 ${stats.data.baseCount} 条，阶梯 ${stats.data.ladderCount} 条）` : '';
    ElMessage.success(`保存成功 ${statsMsg}`);
    importStatus.title = '规则保存成功';
    importStatus.type = 'success';
    importStatus.msg = `保存成功。${statsMsg}`;
  } catch (e) {
    ElMessage.error('保存失败');
    importStatus.title = '规则保存失败';
    importStatus.type = 'error';
    importStatus.msg = '保存失败：' + (e.message || '未知错误');
  } finally {
    setTimeout(() => {
      progressVisible.value = false;
    }, 500);
  }
};

const activeOnline = ref('online-base');
const baseOnlineRows = ref([]);
const ladderOnlineRows = ref([]);
const baseSelectedIds = ref([]);
const ladderSelectedIds = ref([]);
const basePage = ref(1);
const baseSize = ref(20);
const baseTotal = ref(0);
const ladderPage = ref(1);
const ladderSize = ref(20);
const ladderTotal = ref(0);
const loadBaseOnline = async () => {
  try {
    const res = await request.post('/pt_fylist/rules-query', { table: 'base', page: basePage.value, size: baseSize.value }, { headers: { repeatSubmit: false } });
    if (res.code === 1) {
      baseOnlineRows.value = (res.data?.list || []).map(r => ({
        ...r,
        category: '基础',
        rate_display: (r.method === '百分比' && r.rate_value != null) ? ((Number(r.rate_value) * 100).toFixed(2) + '%') : (r.rate_value != null ? Number(r.rate_value).toFixed(2) : ''),
        free_rate_display: (r.method === '百分比' && r.free_rate_value != null) ? ((Number(r.free_rate_value) * 100).toFixed(2) + '%') : (r.free_rate_value != null ? Number(r.free_rate_value).toFixed(2) : ''),
        unfree_rate_display: (r.method === '百分比' && r.unfree_rate_value != null) ? ((Number(r.unfree_rate_value) * 100).toFixed(2) + '%') : (r.unfree_rate_value != null ? Number(r.unfree_rate_value).toFixed(2) : '')
      }));
      baseTotal.value = res.total || 0;
    }
  } catch {}
};
const loadLadderOnline = async () => {
  try {
    const res = await request.post('/pt_fylist/rules-query', { table: 'ladder', page: ladderPage.value, size: ladderSize.value }, { headers: { repeatSubmit: false } });
    if (res.code === 1) {
      ladderOnlineRows.value = (res.data?.list || []).map(r => ({
        ...r,
        range_preview: `${Number(r.min_val ?? 0).toFixed(2)} ≤ x < ${Number(r.max_val ?? 0).toFixed(2)}`,
        unit: r.method === '百分比' ? '%' : (r.method === '返现' ? '元/人' : '元/单'),
        rule_display: (r.method === '百分比' && r.rule_value != null) ? ((Number(r.rule_value) * 100).toFixed(2) + '%') : (r.rule_value != null ? Number(r.rule_value).toFixed(2) : ''),
        free_rate_display: (r.method === '百分比' && r.free_rate_value != null) ? ((Number(r.free_rate_value) * 100).toFixed(2) + '%') : (r.free_rate_value != null ? Number(r.free_rate_value).toFixed(2) : ''),
        unfree_rate_display: (r.method === '百分比' && r.unfree_rate_value != null) ? ((Number(r.unfree_rate_value) * 100).toFixed(2) + '%') : (r.unfree_rate_value != null ? Number(r.unfree_rate_value).toFixed(2) : '')
      }));
      ladderTotal.value = res.total || 0;
    }
  } catch {}
};
const formatRate = (row) => {
  const s = String(row.rate_display || '').trim();
  if (row.method === '百分比') {
    let n = s.endsWith('%') ? parseFloat(s.replace('%','')) : parseFloat(s);
    if (Number.isNaN(n)) n = 0;
    row.rate_display = n.toFixed(2) + '%';
    row.rate_value = n / 100;
  } else {
    let n = parseFloat(s.replace(/[^\d.\-\.]/g,''));
    if (Number.isNaN(n)) n = 0;
    row.rate_display = n.toFixed(2);
    row.rate_value = n;
  }
};
const formatRateWithKey = (row, displayKey, valueKey) => {
  const s = String(row[displayKey] || '').trim();
  if (row.method === '百分比') {
    let n = s.endsWith('%') ? parseFloat(s.replace('%','')) : parseFloat(s);
    if (Number.isNaN(n)) n = 0;
    row[displayKey] = n.toFixed(2) + '%';
    row[valueKey] = n / 100;
  } else {
    let n = parseFloat(s.replace(/[^\d.\-\.]/g,''));
    if (Number.isNaN(n)) n = 0;
    row[displayKey] = n.toFixed(2);
    row[valueKey] = n;
  }
};
const onDoubleCalcChange = (row) => {
  if (row.double_calc === 1) {
    row.rate_display = '';
    row.rate_value = null;
  }
};
const onLadderDoubleCalcChange = (row) => {
  if (row.double_calc === 1) {
    row.rule_display = '';
    row.rule_value = null;
  }
};
const formatRule = (row) => {
  const s = String(row.rule_display || '').trim();
  if (row.method === '百分比') {
    let n = s.endsWith('%') ? parseFloat(s.replace('%','')) : parseFloat(s);
    if (Number.isNaN(n)) n = 0;
    row.rule_display = n.toFixed(2) + '%';
    row.rule_value = n / 100;
  } else {
    let n = parseFloat(s.replace(/[^\d.\-\.]/g,''));
    if (Number.isNaN(n)) n = 0;
    row.rule_display = n.toFixed(2);
    row.rule_value = n;
  }
};
const formatNumber = (row, key) => {
  let n = parseFloat(String(row[key] || '').replace(/[^\d.\-\.]/g,''));
  if (Number.isNaN(n)) n = 0;
  row[key] = Number(n.toFixed(2));
};
const saveOnlineEdits = async () => {
  try {
    const baseEditable = baseOnlineRows.value.filter(r => !isBaseDisabled(r));
    const ladderEditable = ladderOnlineRows.value.filter(r => !isLadderDisabled(r));

    const baseCreates = baseEditable
      .filter(r => !r.id)
      .map(r => ({
        policy_id: r.policy_id,
        category: '基础',
        port: r.port,
        base_metric: r.base_metric,
        double_calc: r.double_calc ? 1 : 0,
        subtract_free: r.subtract_free,
        subtract_mozhu: r.subtract_mozhu,
        method: r.method,
        rate_value: r.rate_value,
        free_rate_value: r.free_rate_value,
        unfree_rate_value: r.unfree_rate_value,
        remark: r.remark
      }));
    const baseUpdates = baseEditable
      .filter(r => !!r.id)
      .map(r => ({
        id: r.id,
        policy_id: r.policy_id,
        category: '基础',
        port: r.port,
        base_metric: r.base_metric,
        double_calc: r.double_calc ? 1 : 0,
        subtract_free: r.subtract_free,
        subtract_mozhu: r.subtract_mozhu,
        method: r.method,
        rate_value: r.rate_value,
        free_rate_value: r.free_rate_value,
        unfree_rate_value: r.unfree_rate_value,
        remark: r.remark
      }));
    const ladderCreates = ladderEditable
      .filter(r => !r.id)
      .map(r => ({
        policy_id: r.policy_id,
        rule_type: r.rule_type,
        dimension: r.dimension,
        metric: r.metric,
        min_val: r.min_val,
        max_val: r.max_val,
        method: r.method,
        rule_value: r.rule_value,
        subtract_free: r.subtract_free
      }));
    const ladderUpdates = ladderEditable
      .filter(r => !!r.id)
      .map(r => ({
        id: r.id,
        policy_id: r.policy_id,
        rule_type: r.rule_type,
        dimension: r.dimension,
        metric: r.metric,
        min_val: r.min_val,
        max_val: r.max_val,
        method: r.method,
        rule_value: r.rule_value,
        subtract_free: r.subtract_free
      }));

    if (baseCreates.length || ladderCreates.length) {
      await request.post('/pt_fylist/rules-save-chunk', {
        baseSimpleRows: baseCreates,
        ladderRows: ladderCreates
      }, { headers: { repeatSubmit: false }, timeout: 600000 });
    }

    const res = await request.post('/pt_fylist/rules-update', {
      baseUpdates,
      ladderUpdates
    }, { headers: { repeatSubmit: false }, timeout: 600000 });
    if (res.code === 1 && res.data && res.data.success) {
      ElMessage.success('保存修改成功');
      loadBaseOnline();
      loadLadderOnline();
    } else {
      ElMessage.error(res.data?.msg || res.msg || '保存修改失败');
    }
  } catch {
    ElMessage.error('保存修改失败');
  }
};
const deleteSelectedOnline = async () => {
  try {
    const baseIds = baseSelectedIds.value.filter(id => {
      const row = baseOnlineRows.value.find(r => r.id === id);
      return row && !isBaseDisabled(row);
    });
    const ladderIds = ladderSelectedIds.value.filter(id => {
      const row = ladderOnlineRows.value.find(r => r.id === id);
      return row && !isLadderDisabled(row);
    });
    const res = await request.post('/pt_fylist/rules-delete-by-id', { baseIds, ladderIds }, { headers: { repeatSubmit: false } });
    if (res.code === 1 && res.data && res.data.success) {
      ElMessage.success('删除成功');
      loadBaseOnline();
      loadLadderOnline();
    } else {
      ElMessage.error(res.data?.msg || res.msg || '删除失败');
    }
  } catch {
    ElMessage.error('删除失败');
  }
};
const addNewBase = () => {
  baseOnlineRows.value.unshift({
    id: undefined,
    policy_id: '',
    category: '基础',
    port: '',
    base_metric: '',
    double_calc: 0,
    subtract_free: 0,
    subtract_mozhu: 0,
    method: '单价',
    rate_display: '',
    rate_value: null,
    free_rate_display: '',
    free_rate_value: null,
    unfree_rate_display: '',
    unfree_rate_value: null,
    remark: ''
  });
};
const addNewLadder = () => {
  ladderOnlineRows.value.unshift({
    id: undefined,
    policy_id: '',
    rule_type: '',
    dimension: '',
    metric: '',
    min_val: null,
    max_val: null,
    method: '单价',
    double_calc: 0,
    free_rate_display: '',
    free_rate_value: null,
    unfree_rate_display: '',
    unfree_rate_value: null,
    rule_display: '',
    rule_value: null,
    subtract_free: 0
  });
};

loadBaseOnline();
loadLadderOnline();
fetchInUse();
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
.action-btn {
  margin-right: 12px;
}
.upload-btn-wrapper {
  display: inline-block;
}
.alert-container {
  margin-bottom: 24px;
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
.summary-container {
  margin-top: 12px;
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
.action-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.dup-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.pagination-container {
  margin-top: 8px;
}
</style>
