<template>
  <el-form-item :label="props.params.label" :prop="props.params.prop" :style="{width:props.params.formItemWidth}">
    <el-input
      v-model.trim="inputValue"
      :placeholder="props.params.placeholder||'请输入'"
      :size="props.size"
      :clearable="props.params.clearable===undefined?true:props.params.clearable"
      @keyup.enter.native="onChange"
      @clear="onChange"
      @input="onInput"
      :disabled="props.params.disabled"
    />
  </el-form-item>
</template>

<script  setup>
defineOptions({
  name: 'FormInput'
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
const emits = defineEmits(['update:modelValue','change','input']);
const inputValue = computed({
  get() {
    return props.modelValue
  },
  set(val) {
    emits('update:modelValue', val)
  },
})
const onChange = () => {
  emits('change',{})
}
const onInput=()=>{
  setTimeout(()=>{emits('input',{prop:props.params.prop,value:inputValue.value})})
}
</script>

<style lang="scss" scoped>

</style>