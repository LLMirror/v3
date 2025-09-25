<template>
  <div>
    <el-form :model="formData" ref="formRef" inline @submit.native.prevent>
      <template v-for="item in list" :key="item.prop">
        <slot :name="item.prop">
          <component
            v-model="formData[item.prop]"
            v-model:startProp="formData[item.startProp||'startTime']"
            v-model:endProp="formData[item.endProp||'endTime']"
            :is="item.component"
            :params="item"
            :size="props.size"
            @change="onChange"
            @input="onInput"
          ></component>
        </slot>
      </template>
      <el-form-item v-if="showBtn">
        <el-button type="primary" @click="onSearch" icon="Search" :size="props.size">{{props.searchText}}</el-button>
        <el-button v-if="showRefresh" @click="onResetForm" icon="Refresh" :size="props.size">{{props.resetText}}</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import {throttle} from "@/utils/index.js";

const props=defineProps({
  options:{
    type:Array,
    default:()=>[]
  },
  size:{
    type:String,
    default:''
  },
  showBtn:{
    type:Boolean,
    default:true
  },
  showRefresh:{
    type:Boolean,
    default:true
  },
  searchText:{
    type:String,
    default:'查询'
  },
  resetText:{
    type:String,
    default:'重置'
  },
  //是否需要加载完成自动调一次search
  initGetFormData:{
    type:Boolean,
    default:false
  },
})
let isInitForm = false;
const emits=defineEmits(['search','reset','change','input'])
const list=computed(()=>{
  return props.options.map(item=>{
    let component=null;
    switch (item.type) {
      case 'FormInput':
        component=defineAsyncComponent(() => import('./children/FormInput.vue'));
        break;
      case 'FormSelect':
        component=defineAsyncComponent(() => import('./children/FormSelect.vue'));
        break;
      case 'FormDate':
        component=defineAsyncComponent(() => import('./children/FormDate.vue'));
        break;
    }
    return {
      ...item,
      component
    }
  })
})
const formData = inject('dataParams')||ref({});
const formRef=ref(null);
const initForm=throttle(()=>{
  if(isInitForm) return;
  emits('search',formData.value)
  isInitForm=true;
},5000)
function onChange(e){
  emits('change',e)
  onSearch()
}
function onInput(e){
  emits('input',e)
}
function onSearch(){
  emits('search',formData.value)
}
function multipleEvent(item){
  return (item.multiple||range(item))
}
function range(item){
  return (item.dateType==='daterange'||item.dateType==='datetimerange')
}
function onResetForm(){
  emits('reset');
  formRef.value.resetFields();
  list.value.map(item=>{
    if(multipleEvent(item)) {
      formData.value[item.prop]=[]
    }else formData.value[item.prop]=''
    if(range(item)){
      formData.value[item.startProp||'startTime']=''
      formData.value[item.endProp||'endTime']=''
    }
  });
  onSearch()
}
const initModel = () => {
  if (props.options) {
    formData.value = props.options.reduce((obj, item) => {
      if(multipleEvent(item)){
        obj[item.prop] = item.modelValue || []
        if(range(item)){
          if(obj[item.prop].length>=1)obj[item.startProp||'startTime'] =item.modelValue[0]  || ''
          if(obj[item.prop].length>=2)obj[item.endProp||'endTime'] = item.modelValue[1]  || ''
        }
      }else obj[item.prop] = item.modelValue || ''
      return obj
    }, formData.value)
  }
}
watch(()=>props.options,()=>{
  initModel()
  if(props.options&&props.options.length!==0&&props.initGetFormData)initForm();
},{immediate:true})

</script>

<style lang="scss" scoped>

</style>