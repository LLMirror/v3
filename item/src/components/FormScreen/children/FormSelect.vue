<template>
  <el-form-item :label="props.params.label" :prop="props.params.prop" :style="{width:props.params.formItemWidth}">
    <el-select
      v-model="inputValue"
      :placeholder="props.params.placeholder||'请选择'"
      :size="props.size"
      :clearable="props.params.clearable===undefined?true:props.params.clearable"
      @change="onChange"
      filterable
      :multiple="props.params.multiple"
      :disabled="props.params.disabled"
    >
      <el-option
        v-for="(item) in props.params.options"
        :key="item[props.params.keyValue||'value']"
        :value="item[props.params.keyValue||'value']"
        :label="item[props.params.keyLabel||'label']"
      >
      </el-option>
    </el-select>
  </el-form-item>
</template>

<script  setup>
defineOptions({
  name: 'FormSelect'
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
    emits('update:modelValue', val)
  },
})
const onChange = () => {
  setTimeout(()=>{emits('change',{prop:props.params.prop,value:inputValue.value})})
}
</script>

<style lang="scss" scoped>

</style>