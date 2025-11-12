<template>
  <div class="page">
    <el-card shadow="hover" class="card">
      <template #header>
        <div class="card-header">
          <span>审批表单项</span>
          <el-button type="primary" size="small" @click="addRow">添加一行</el-button>
        </div>
      </template>

      <el-form label-width="90px" class="form-list">
        <div v-if="!formComponentValues.length" class="empty-tip">
          <el-empty description="暂无表单项，点击右上角添加一行" />
        </div>
        <div v-else>
          <el-row v-for="(item, idx) in formComponentValues" :key="idx" :gutter="12" class="form-row">
            <el-col :span="8">
              <el-form-item label="名称">
                <el-input v-model="item.name" placeholder="表单项名称" clearable />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="值">
                <el-input v-model="item.value" placeholder="表单项值" clearable />
              </el-form-item>
            </el-col>
            <el-col :span="4" class="row-actions">
              <el-button type="danger" @click="removeRow(idx)" plain>删除</el-button>
            </el-col>
          </el-row>
        </div>
      </el-form>

      <div class="footer-actions">
        <el-button type="success" @click="onStartProcess" :disabled="!canSubmit">启动钉钉流程</el-button>
        <span class="hint">仅提交 formComponentValues 数组</span>
      </div>
    </el-card>
  </div>
  
  
  
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getDingTalkToken } from '@/api/system'

const formComponentValues = ref([
  { name: '付款内容', value: '测试发起审批' },
  { name: '金额（元）', value: '1000' },
  { name: '收款账户名', value: '哈哈哈哈' },
  { name: '开户行', value: '中国银行' },
  { name: '收款账户', value: '64723648' }
])

const addRow = () => {
  formComponentValues.value.push({ name: '', value: '' })
}
const removeRow = (idx) => {
  formComponentValues.value.splice(idx, 1)
}

const canSubmit = computed(() => formComponentValues.value.length > 0 && formComponentValues.value.every(i => i.name && i.value))

const onStartProcess = async () => {
  try {
    const payload = {
      formComponentValues: formComponentValues.value
    }
    console.log("payload------ **********:", payload.formComponentValues);
    const res = await getDingTalkToken({ payload: payload.formComponentValues })
    const ok = (res && res.code === 0) || (res && res.data && res.data.code === 0)
    if (ok) {
      ElMessage.success('发起审批成功')
    } else {
      ElMessage.error(res?.msg || res?.data?.msg || '发起审批失败')
    }
  } catch (e) {
    ElMessage.error('发起审批异常')
  }
}

</script>

<style scoped>
.page { padding: 16px; }
.card { max-width: 900px; margin: 0 auto; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.form-list { margin-top: 8px; }
.form-row { padding: 6px 0; border-bottom: 1px dashed #eee; }
.row-actions { display: flex; align-items: center; }
.footer-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.hint { color: #909399; font-size: 12px; }
.empty-tip { padding: 20px 0; }
</style>