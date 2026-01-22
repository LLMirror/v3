<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>返佣数据导入</span>
        </div>
      </template>

      <el-form :model="formData" :rules="rules" ref="formRef" label-width="120px" class="import-form">
        <el-form-item label="数据类型" prop="tableType">
          <el-select v-model="formData.tableType" placeholder="请选择数据类型" style="width: 100%">
            <el-option label="司机端数据" :value="1" />
            <el-option label="客户端数据" :value="2" />
            <el-option label="司机流水详情" :value="3" />
            <el-option label="商务规则" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item>
           <el-button 
            type="warning" 
            plain 
            icon="Download" 
            @click="handleDownloadTemplate" 
          >
            {{ formData.tableType ? (formData.tableType === 1 ? '司机端数据模板下载' : formData.tableType === 2 ? '客户端数据模板下载' : formData.tableType === 3 ? '司机流水详情模板下载' : '商务规则模板下载') : '下载导入模板' }}
          </el-button>
        </el-form-item>

        <el-form-item label="所属账期" prop="yearMonth">
          <el-date-picker
            v-model="formData.yearMonth"
            type="month"
            placeholder="选择账期"
            format="YYYY-MM"
            value-format="YYYY-MM"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="上传文件" prop="file">
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :limit="1"
            accept=".xlsx, .xls"
          >
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 xlsx/xls 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleImport" :loading="loading">开始导入</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import request from '@/utils/request';

const formRef = ref(null);
const uploadRef = ref(null);
const loading = ref(false);
const fileList = ref([]);

const formData = reactive({
  tableType: '',
  yearMonth: '',
  file: null
});

const rules = {
  tableType: [{ required: true, message: '请选择数据类型', trigger: 'change' }],
  yearMonth: [{ required: true, message: '请选择账期', trigger: 'change' }],
  file: [{ required: true, message: '请上传文件', trigger: 'change' }]
};

const handleDownloadTemplate = async () => {
  if (!formData.tableType) {
    ElMessage.warning('请先选择数据类型');
    return;
  }
  
  loading.value = true;
  try {
    const res = await request({
      url: '/pt_fylist/template',
      method: 'get',
      params: { tableType: formData.tableType },
      responseType: 'blob'
    });

    const blob = new Blob([res.data]);
    // Check if the blob is actually an error message (JSON)
    if (blob.type === 'application/json') {
        const text = await blob.text();
        const result = JSON.parse(text);
        ElMessage.error(result.msg || '下载失败');
        return;
    }

    const fileNameMap = {
      1: '司机端数据导入模板.xlsx',
      2: '客户端数据导入模板.xlsx',
      3: '司机流水详情导入模板.xlsx',
      4: '商务规则导入模板.xlsx'
    };
    
    const fileName = fileNameMap[formData.tableType] || '模板.xlsx';
    
    // Create download link
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
  } finally {
    loading.value = false;
  }
};

const handleFileChange = (uploadFile, uploadFiles) => {
  formData.file = uploadFile.raw;
  fileList.value = uploadFiles;
  // Clear validation error if exists
  if (formRef.value) {
    formRef.value.validateField('file');
  }
};

const handleFileRemove = () => {
  formData.file = null;
  fileList.value = [];
};

const handleImport = async () => {
  if (!formRef.value) return;
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      if (!formData.file) {
        ElMessage.warning('请选择文件');
        return;
      }

      loading.value = true;
      try {
        // 1. Check data existence
        const checkRes = await request.post('/pt_fylist/checkData', {
          tableType: formData.tableType,
          yearMonth: formData.yearMonth
        });

        if (checkRes.code === 200) {
          if (checkRes.data.exists) {
            // Confirm overwrite
            ElMessageBox.confirm(
              `该账期 (${formData.yearMonth}) 已存在数据。\n上次上传时间: ${checkRes.data.lastTime}\n总条数: ${checkRes.data.total}\n是否覆盖？`,
              '数据已存在',
              {
                confirmButtonText: '覆盖并导入',
                cancelButtonText: '取消',
                type: 'warning',
              }
            ).then(() => {
              doUpload(true);
            }).catch(() => {
              loading.value = false;
              ElMessage.info('已取消导入');
            });
          } else {
            // No data, proceed
            doUpload(false);
          }
        } else {
          ElMessage.error(checkRes.msg || '检查数据失败');
          loading.value = false;
        }
      } catch (error) {
        console.error(error);
        ElMessage.error('系统错误');
        loading.value = false;
      }
    }
  });
};

const doUpload = async (overwrite) => {
  const fd = new FormData();
  fd.append('file', formData.file);
  fd.append('tableType', formData.tableType);
  fd.append('yearMonth', formData.yearMonth);
  fd.append('overwrite', overwrite);

  try {
    const res = await request.post('/pt_fylist/importData', fd, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (res.code === 200) {
      ElMessage.success(`导入成功，共导入 ${res.data.count} 条数据`);
      // Reset form
      uploadRef.value.clearFiles();
      formData.file = null;
      formData.tableType = '';
      formData.yearMonth = '';
    } else {
      ElMessage.error(res.msg || '导入失败');
    }
  } catch (error) {
    console.error(error);
    ElMessage.error('导入请求失败');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.app-container {
  padding: 20px;
}
.box-card {
  max-width: 600px;
  margin: 0 auto;
}
.import-form {
  margin-top: 20px;
}
</style>
