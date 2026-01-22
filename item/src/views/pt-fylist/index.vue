<template>
  <div class="app-container">
    <el-card class="box-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon class="header-icon"><Document /></el-icon>
            <span>返佣数据导入</span>
          </div>
        </div>
      </template>

      <div class="filter-container">
        <div class="filter-item">
          <span class="filter-label">数据类型</span>
          <el-select v-model="formData.tableType" placeholder="请选择数据类型" class="filter-input" @change="handleTypeChange">
            <el-option label="司机流水" :value="1" />
            <el-option label="结算明细-订单" :value="2" />
            <el-option label="平台活动" :value="3" />
            <el-option label="优惠账单" :value="4" />
          </el-select>
        </div>

        <div class="filter-item">
          <span class="filter-label">所属账期</span>
          <el-date-picker
            v-model="formData.yearMonth"
            type="month"
            placeholder="选择账期"
            format="YYYY-MM"
            value-format="YYYY-MM"
            class="filter-input"
            @change="handleDateChange"
          />
        </div>

        <div class="filter-item">
          <el-upload
            ref="uploadRef"
            action="#"
            :show-file-list="false"
            :http-request="customUpload"
            :before-upload="beforeUpload"
            accept=".xlsx, .xls"
            class="upload-btn-wrapper"
            :disabled="isUploadDisabled"
          >
            <el-button type="primary" icon="Upload" :loading="uploading" :disabled="isUploadDisabled">上传文件</el-button>
          </el-upload>

          <el-button 
            type="warning" 
            plain 
            icon="Download" 
            @click="handleDownloadTemplate" 
            class="action-btn"
            :disabled="isDownloadDisabled"
          >
            {{ downloadBtnText }}
          </el-button>

          <el-button 
            v-if="previewData.length > 0" 
            type="success" 
            icon="Check" 
            @click="handleSave" 
            class="action-btn"
            :loading="saving"
          >
            确认导入数据库
          </el-button>
        </div>
      </div>

      <!-- 操作提示 / 状态显示 -->
      <div class="alert-container" v-if="importStatus.msg">
        <el-alert 
          :title="importStatus.title" 
          :type="importStatus.type" 
          :closable="false" 
          show-icon 
          class="custom-alert"
        >
          <template #default>
            <div class="alert-content" v-html="importStatus.msg"></div>
          </template>
        </el-alert>
      </div>

      <!-- 进度条 Dialog -->
      <el-dialog
        v-model="progressVisible"
        title="正在上传解析"
        width="400px"
        :close-on-click-modal="false"
        :show-close="false"
        center
      >
        <div class="progress-content">
          <el-progress type="circle" :percentage="uploadPercentage" />
          <div class="progress-text">文件上传解析中...</div>
        </div>
      </el-dialog>

      <!-- 预览表格 -->
      <div v-if="previewData.length > 0" class="table-container">
        <div class="table-header">
          <span class="table-title">数据预览 (前 {{ previewData.length }} 条 / 共 {{ totalRows }} 条)</span>
          <el-tag type="info" effect="plain">仅预览前100条数据，确认无误后请点击“确认导入数据库”</el-tag>
        </div>
        
        <el-table 
          :data="previewData" 
          border 
          stripe 
          style="width: 100%" 
          height="500"
          :header-cell-style="{ background: '#f5f7fa', color: '#606266', fontWeight: 'bold' }"
        >
          <el-table-column
            v-for="col in previewHeaders"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            min-width="150"
            show-overflow-tooltip
          />
        </el-table>
      </div>

    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Document, Upload, Download, Check } from '@element-plus/icons-vue';
import request from '@/utils/request';

// State
const formData = reactive({
  tableType: '',
  yearMonth: ''
});

const uploadRef = ref(null);
const uploading = ref(false);
const saving = ref(false);
const progressVisible = ref(false);
const uploadPercentage = ref(0);

const previewData = ref([]);
const previewHeaders = ref([]);
const totalRows = ref(0);
const allTableData = ref([]); // Store all parsed data

const importStatus = reactive({
  title: '操作提示',
  type: 'info',
  msg: '请选择数据类型和账期，然后上传 Excel 文件进行预览。'
});

const TABLE_TYPE_MAP = {
  1: '司机流水',
  2: '结算明细-订单',
  3: '平台活动',
  4: '优惠账单'
};

const isUploadDisabled = computed(() => !formData.tableType || !formData.yearMonth);
const isDownloadDisabled = computed(() => !formData.tableType);

const downloadBtnText = computed(() => {
  const name = TABLE_TYPE_MAP[formData.tableType];
  return name ? `${name} 下载模板` : '下载模板';
});

// Handlers
const handleTypeChange = () => {
  resetPreview();
};

const handleDateChange = () => {
  resetPreview();
};

const resetPreview = () => {
  previewData.value = [];
  previewHeaders.value = [];
  allTableData.value = [];
  totalRows.value = 0;
  importStatus.title = '操作提示';
  importStatus.type = 'info';
  importStatus.msg = '请选择数据类型和账期，然后上传 Excel 文件进行预览。';
};

const handleDownloadTemplate = async () => {
  if (!formData.tableType) {
    ElMessage.warning('请先选择数据类型');
    return;
  }
  
  try {
    const res = await request({
      url: '/pt_fylist/template',
      method: 'get',
      params: { tableType: formData.tableType },
      responseType: 'blob'
    });

    const blob = new Blob([res.data]);
    if (blob.type === 'application/json') {
        const text = await blob.text();
        const result = JSON.parse(text);
        ElMessage.error(result.msg || '下载失败');
        return;
    }

    const fileNameMap = {
      1: '司机流水导入模板.xlsx',
      2: '结算明细-订单导入模板.xlsx',
      3: '平台活动导入模板.xlsx',
      4: '优惠账单导入模板.xlsx'
    };
    
    const fileName = fileNameMap[formData.tableType] || '模板.xlsx';
    
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
    
  } catch (error) {
    console.error('Download error:', error);
    ElMessage.error('下载模板失败');
  }
};

const beforeUpload = (file) => {
  if (!formData.tableType) {
    ElMessage.warning('请先选择数据类型');
    return false;
  }
  if (!formData.yearMonth) {
    ElMessage.warning('请先选择账期');
    return false;
  }
  const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === 'application/vnd.ms-excel';
  if (!isExcel) {
    ElMessage.error('只能上传 xlsx/xls 文件');
    return false;
  }
  return true;
};

const customUpload = async (options) => {
  const { file } = options;
  const fd = new FormData();
  fd.append('file', file);
  fd.append('tableType', formData.tableType);
  fd.append('yearMonth', formData.yearMonth);

  uploading.value = true;
  progressVisible.value = true;
  uploadPercentage.value = 0;

  try {
    // Need to use axios directly to get upload progress if request wrapper doesn't support it easily
    // Or check if request wrapper supports onUploadProgress. Assuming request is an axios instance.
    // To be safe, I'll use the request utility but I need to see if I can pass onUploadProgress.
    // Usually request wrapper in these projects returns the data directly.
    // Let's try to use the request utility and hope it passes config.
    // If not, I'll use standard axios, but I need the baseURL.
    
    // Assuming request is axios instance
    const res = await request({
      url: '/pt_fylist/import-preview',
      method: 'post',
      data: fd,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        uploadPercentage.value = percentCompleted;
      }
    });

    // Check response structure
    if (res.code === 1) {
      if (res.data && res.data.success) {
        const { list, previewHeaders: headers, totalRows: total, exists, lastTime, totalCount } = res.data;
        
        allTableData.value = list;
        previewData.value = list.slice(0, 100); // Preview first 100 rows
        previewHeaders.value = headers;
        totalRows.value = total;

        // Update Alert
        if (exists) {
          importStatus.title = '数据重复警告';
          importStatus.type = 'warning';
          importStatus.msg = `该账期 (${formData.yearMonth}) 已存在数据。<br/>上次上传: ${lastTime}<br/>已存条数: ${totalCount} 条。<br/><strong>点击“确认导入数据库”将覆盖现有数据！</strong>`;
        } else {
          importStatus.title = '解析成功';
          importStatus.type = 'success';
          importStatus.msg = `文件解析成功，共 ${total} 条数据。请预览下方数据，确认无误后点击“确认导入数据库”按钮进行保存。`;
        }
        
        ElMessage.success('解析成功，请确认数据');
      } else {
        // Soft error (Validation failed, etc.)
        previewData.value = [];
        previewHeaders.value = [];
        allTableData.value = [];
        totalRows.value = 0;
        
        importStatus.title = '解析失败';
        importStatus.type = 'error';
        importStatus.msg = res.data?.msg || res.msg || '解析失败';
      }
    } else {
      // Clear data but show error in alert area
      previewData.value = [];
      previewHeaders.value = [];
      allTableData.value = [];
      totalRows.value = 0;
      
      importStatus.title = '解析失败';
      importStatus.type = 'error';
      importStatus.msg = res.msg || '解析失败';
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clear data but show error in alert area
    previewData.value = [];
    previewHeaders.value = [];
    allTableData.value = [];
    totalRows.value = 0;
    
    importStatus.title = '上传失败';
    importStatus.type = 'error';
    importStatus.msg = '上传失败: ' + (error.message || '未知错误');
  } finally {
    uploading.value = false;
    setTimeout(() => {
      progressVisible.value = false;
    }, 500);
  }
};

const handleSave = async () => {
  if (allTableData.value.length === 0) {
    ElMessage.error('没有可保存的数据，请重新上传');
    return;
  }

  // Confirmation
  try {
    let confirmMsg = `确认将 ${totalRows.value} 条数据导入到数据库吗？`;
    if (importStatus.type === 'warning') {
      confirmMsg = `该账期已存在数据，导入将<b>覆盖（删除旧数据）</b>！<br/>确认继续吗？`;
    }

    await ElMessageBox.confirm(confirmMsg, '确认导入', {
      confirmButtonText: '确定导入',
      cancelButtonText: '取消',
      type: 'warning',
      dangerouslyUseHTMLString: true
    });

    saving.value = true;
    const res = await request.post('/pt_fylist/save-data', {
      tableType: formData.tableType,
      yearMonth: formData.yearMonth,
      list: allTableData.value, // Send full data list
      overwrite: true // Always overwrite if confirmed
    });

    if (res.code === 200) {
      ElMessage.success(`导入成功，共保存 ${res.data.count} 条数据`);
      resetPreview();
    } else {
      ElMessage.error(res.msg || '保存失败');
    }

  } catch (err) {
    if (err !== 'cancel') {
      console.error(err);
      ElMessage.error('系统错误');
    }
  } finally {
    saving.value = false;
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

.action-btn {
  margin-left: 12px;
  padding: 10px 24px;
  font-weight: 500;
  letter-spacing: 0.5px;
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
