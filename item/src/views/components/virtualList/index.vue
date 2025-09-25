<template>
  <div class="app-container">
    <VirtualList
      class="virtual-List"
      :class="{ 'smooth-scroll': smooth}"
      data-key="id"
      :data-sources="list"
      ref="virtualListRef">
      
      <template #header>
        <el-text type="primary">我是头部插槽header</el-text>
      </template>
      
      <template #item="{ item, index, scope }">
        <Item :item="item" :index="index" :scope="scope"></Item>
      </template>
      
      <template #footer>
        <el-text type="success">我是底部插槽footer</el-text>
      </template>
      
    </VirtualList>
    
    
    <div class="operation">
      <el-text type="primary" size="large">当前数据量：{{list.length}} 条</el-text>
      <el-divider />
      <el-switch
        v-model="smooth"
        size="large"
        active-text="开启滚动过度效果"
        inactive-text="关闭滚动过度效果"
      />
      <el-divider />
      <el-space :size="50">
        <el-button type="primary" @click="add">新增500条数据</el-button>
        <el-button type="success" @click="virtualListRef.scrollToIndex(100)">滚动到第100条位置</el-button>
        <el-button type="warning" @click="virtualListRef.scrollToBottom()">滚动到底部</el-button>
        <el-button type="danger" @click="virtualListRef.scrollToIndex(0)">滚动到顶部</el-button>
      </el-space>
      <el-divider />
      <el-text type="success" size="large">更多使用说明请查看@/utils/virtualList/使用说明.md文件</el-text>
    </div>
  </div>
</template>

<script setup>
import VirtualList from '@/utils/virtualList/index';
import Item from './Item.vue';
import { ref } from 'vue';
const virtualListRef=ref(null)
const smooth=ref(false)
const getNewList=()=>{
  return Array.from({ length: 500 }, (_, index) => ({
    id: Math.random().toString(36).substring(2, 10), // 随机ID（8位字母数字组合）
    name: `列表name${index + 1}` // name拼接索引（从1开始）
  }))
}
const list=ref(getNewList())
const add=()=>{
  list.value=[...list.value,...getNewList()];
  virtualListRef.value.scrollToBottom();
}

</script>

<style lang="scss" scoped>
.virtual-List{
  width: 400px;
  height: 500px; 
  padding: 10px;
  margin: 10px auto 0;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow-y: auto;
}
.smooth-scroll{
  scroll-behavior: smooth;
}
.operation{
  text-align: center;
  margin: 10px 0;
}
</style>