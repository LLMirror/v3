<template>
  <div class="app-container">
    <h1>页面2-1</h1>
    <el-button type="primary" @click="router.push('/multilayer/multilayer2/multilayer2_2')">跳转隐藏的 页面2-2</el-button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router= useRouter()
</script>