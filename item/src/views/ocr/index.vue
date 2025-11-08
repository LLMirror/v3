<template>
  <div style="padding: 20px; max-width: 600px;">
    <h2>百度 OCR 识别</h2>

    <!-- 模式选择 -->
    <el-radio-group v-model="mode" size="small" style="margin-bottom: 20px;">
      <el-radio-button label="ocr">通用文字识别</el-radio-button>
      <el-radio-button label="idcard">身份证识别</el-radio-button>
    </el-radio-group>

    <!-- 上传提示 -->
    <div v-if="mode === 'idcard'" style="margin-bottom: 20px;">
      <p>请上传身份证正反面两张图片</p>
    </div>

    <!-- 文件上传 -->
    <el-upload
      ref="uploadRef"
      class="upload-demo"
      action=""
      :auto-upload="false"
      :limit="mode === 'ocr' ? 10 : 2"
      :multiple="mode === 'ocr'"
      :on-change="handleFileChange"
      :on-remove="handleFileRemove"
      :before-upload="beforeUpload"
      accept="image/*"
      list-type="picture-card"
    >
      <i class="el-icon-plus"></i>
      <template #file="{ file }">
        <img :src="file.url" class="upload-image" />
      </template>
    </el-upload>

    <!-- 开始识别按钮 -->
    <el-button
      type="primary"
      style="margin-top: 20px"
      :disabled="!fileList.length"
      @click="submitOCR"
    >
      开始识别
    </el-button>
    <el-button
      type="success"
      style="margin-top: 20px; margin-left: 10px"
      :disabled="mode !== 'idcard' || !Object.keys(idCardResult).length"
      @click="saveIdCard"
    >
      保存
    </el-button>

    <!-- 识别结果展示 -->
    <div v-if="ocrResults.length || Object.keys(idCardResult).length" style="margin-top: 20px;">
      <h3>识别结果：</h3>

      <!-- OCR 普通文字 -->
      <el-card v-if="mode === 'ocr'">
        <div v-for="(page, i) in ocrResults" :key="i" style="margin-bottom: 10px;">
          <h4>第 {{ i + 1 }} 页：</h4>
          <pre>{{ page }}</pre>
        </div>
      </el-card>

      <!-- 身份证 -->
      <el-card v-else-if="mode === 'idcard'">
        <p><strong>姓名：</strong>{{ idCardResult.姓名 || '-' }}</p>
        <p><strong>身份证号：</strong>{{ idCardResult.身份证号 || '-' }}</p>
        <p><strong>签发机关：</strong>{{ idCardResult.签发机关 || '-' }}</p>
        <p><strong>有效期限：</strong>{{ idCardResult.有效期限 || '-' }}</p>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ocr, idcard, saveIdcardInfo } from "@/api/system/index.js";

// === 响应式变量 ===
const mode = ref('ocr')
const fileList = ref([])
const ocrResults = ref([])
const idCardResult = ref({})
const uploadRef = ref(null)

// === 方法 ===
const beforeUpload = () => false

const handleFileChange = (file, newFileList) => {
  // 身份证模式限制上传两张
  if (mode.value === 'idcard' && newFileList.length > 2) {
    ElMessage.warning('身份证模式只能上传两张图片')
    return
  }
  fileList.value = newFileList
}

const handleFileRemove = (file, newFileList) => {
  fileList.value = newFileList
}

const readFileAsBase64 = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result.split(',')[1])
    reader.readAsDataURL(file)
  })
}


const submitOCR = async () => {
  if (!fileList.value.length) {
    ElMessage.warning('请先上传图片')
    return
  }

  try {
    if (mode.value === 'ocr') {
      // 通用 OCR
      ocrResults.value = []
      for (let file of fileList.value) {
        const base64 = await readFileAsBase64(file.raw)
        const res = await ocr({ imageBase64: base64 })
        ocrResults.value.push(res.data || '')
      }
      ElMessage.success('文字识别完成')
    } else if (mode.value === 'idcard') {
      // 身份证模式
      if (fileList.value.length !== 2) {
        ElMessage.warning('请上传身份证正反面两张图片！')
        return
      }

      // 只识别一次，正面一次，反面一次
      const [frontFile, backFile] = fileList.value
      const frontBase64 = await readFileAsBase64(frontFile.raw)
      const backBase64 = await readFileAsBase64(backFile.raw)

      const [frontRes, backRes] = await Promise.all([
        idcard({ imageBase64: frontBase64, side: 'front' }),
        idcard({ imageBase64: backBase64, side: 'back' })
      ])

      const front = frontRes.data || {}
      const back = backRes.data || {}

      idCardResult.value = {
        姓名: front.姓名?.words || '-',
        身份证号: front.公民身份号码?.words || '-',
        签发机关: back.签发机关?.words || '-',
        有效期限: back.签发日期?.words
          ? `${back.签发日期.words} - ${back.失效日期?.words || ''}`
          : '-'
      }

      ElMessage.success('身份证识别完成')
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('识别失败')
  }
}

// 手动保存身份证识别信息到数据库
const saveIdCard = async () => {
  if (mode.value !== 'idcard') {
    ElMessage.warning('当前仅支持保存身份证识别结果')
    return
  }
  if (!Object.keys(idCardResult.value).length) {
    ElMessage.warning('请先完成身份证识别')
    return
  }

  const { 姓名, 身份证号, 签发机关, 有效期限 } = idCardResult.value
  // 解析有效期限为起止
  let validFrom = ''
  let validTo = ''
  if (有效期限 && 有效期限.includes('-')) {
    const parts = 有效期限.split('-').map(s => s.trim())
    validFrom = parts[0] || ''
    validTo = parts[1] || ''
  }

  try {
    await saveIdcardInfo({
      name: 姓名 || '',
      idNumber: 身份证号 || '',
      issuingAuthority: 签发机关 || '',
      validFrom,
      validTo
    })
    ElMessage.success('保存成功')
  } catch (e) {
    console.error('保存身份证信息失败', e)
    ElMessage.error('保存失败，请稍后重试')
  }
}


</script>

<style scoped>
.upload-demo {
  width: 100%;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 20px;
  text-align: center;
}
.upload-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
