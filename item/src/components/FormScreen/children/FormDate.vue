<template>
  <el-form-item :label="props.params.label" :prop="props.params.prop" :style="{width:props.params.formItemWidth}">
    <el-date-picker
      v-model="inputValue"
      :placeholder="props.params.placeholder||'请选择日期'"
      :size="props.size"
      :clearable="props.params.clearable===undefined?true:props.params.clearable"
      @change="onChange"
      :type="props.params.dateType||'date'"
      :value-format="valueFormat(props.params)"
      :start-placeholder="props.params.startPlaceholder||'开始日期'"
      :end-placeholder="props.params.endPlaceholder||'结束日期'"
      :default-time="props.params.dateType==='datetimerange'?[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]:undefined"
      :disabled="props.params.disabled"
    />
  </el-form-item>
</template>

<script  setup>
import {throttle} from "@/utils/index.js";

defineOptions({
  name: 'FormDate'
})
const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  params:{
    type: Object,
    default: () => {}
  },
  size:{
    type:String,
    default:'default'
  },
});
const emits = defineEmits(['update:modelValue','change']);
const inputValue = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    switch (props.params.dateType) {
      case 'daterange':
      case 'datetimerange':
        if(val){
          emits('update:startProp', getTimeVal(props.params.valTime,val[0],0)||'')
          emits('update:endProp', getTimeVal(props.params.valTime,val[1],1)||'')
          emits('update:modelValue', val)
        }else{
          emits('update:startProp', '')
          emits('update:endProp', '')
          emits('update:modelValue', [])
        }
        break
      default:
        emits('update:modelValue', getTimeVal(props.params.valTime,val,0)||'')
    }
  },
})
function getTimeVal(valTime,val,type){
  return type===0?(valTime? val+' 00:00:00': val):(valTime? val+' 23:59:59': val)
}
function valueFormat(params){
  switch (params.dateType) {
    case 'datetime':
    case 'datetimerange':
      return params.valueFormat||'YYYY-MM-DD HH:mm:ss'
    default:
      return params.valueFormat||'YYYY-MM-DD'
  }
}
const onChange =throttle(()=>{
  setTimeout(()=>{emits('change',{prop:props.params.prop,value:inputValue.value})})
},1000)

</script>

<style lang="scss" scoped>

</style>