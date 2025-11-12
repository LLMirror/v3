<template>
  <div>
    <div v-for="(item, idx) in formComponentValues" :key="idx" style="margin-bottom:8px;">
      <input v-model="item.name" placeholder="表单项名称(name)" />
      <input v-model="item.value" placeholder="表单项值(value)" style="margin-left:8px;" />
      <button @click="removeRow(idx)" style="margin-left:8px;">删除</button>
    </div>
    <button @click="addRow">添加一行</button>
  </div>

  <div style="margin-top:12px;">
    <button @click="onStartProcess">获取钉钉token</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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

</style>