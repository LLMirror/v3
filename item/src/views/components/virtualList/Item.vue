<template>
  <div class="list">
    <div>第：{{index+1}} 条</div>
    <div>我是id：{{item.id}} 必须有个唯一值作为 data-key</div>
  </div>
</template>

<script  setup>
const props = defineProps({
  item:{
    type:Object,
    default:()=>{}
  },
  index:Number,
  scope:{
    type:Object,
    default:()=>{}
  }
})
</script>

<style lang="scss" scoped>
.list{
  padding: 10px;
  border: 1px solid #306bf8;
  margin-bottom: 10px;
}
</style>