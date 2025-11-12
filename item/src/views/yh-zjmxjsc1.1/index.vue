<template>
  <button @click="getDingTalkToken">获取钉钉token</button>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getDingTalkToken } from '@/api/system'

const token = ref("")

</script>

<style scoped>

</style>