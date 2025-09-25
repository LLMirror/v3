<template>
  <el-text v-if="isText" style="cursor: pointer" :type="data[keyType]" :size="size" :effect="effect" :round="round" :style="{color:data.tagColor,background:data.tagBg}" @click="tagClick">{{data[keyLabel]||'-'}}</el-text>
  <el-tag v-else style="cursor: pointer" :type="data[keyType]" :size="size" :effect="effect" :round="round" :style="{color:data.tagColor,background:data.tagBg}" @click="tagClick">{{data[keyLabel]||'-'}}</el-tag>
</template>

<script setup>
const props=defineProps({
  value: [String, Number],
  options:{
    type:Array,
    default:()=>[]
  },
  // 对比的属性 key
  keyValue:{
    type:String,
    default:'value'
  },
  // 展示的属性key
  keyLabel:{
    type:String,
    default:'label'
  },
  // le type的key
  keyType:{
    type:String,
    default:'dictClass'
  },
  // small/large
  size:{
    type:String,
    default:''
  },
  // dark/light/plain
  effect:{
    type:String,
    default:'dark'
  },
  // 是否圆角
  round:{
    type:Boolean,
    default: true
  },
  // 是否文本
  isText:{
    type:Boolean,
    default: false
  },

})
const emits=defineEmits(['tagClick'])

const data=computed(()=>{
  const res=props.options.find(item=>item[props.keyValue]==props.value);
  return res?res:{}
})
const tagClick=()=>{
  emits('tagClick',data.value)
}
</script>
