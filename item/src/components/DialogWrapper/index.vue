<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    :width="width"
    :before-close="beforeClose"
    @close="handleClose"
    v-bind="$attrs"
    close-on-click-modal
    close-on-press-escape
    @closed="handleClose"
  >
    <div>函数弹窗</div>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: '提示'
  },
  width: {
    type: String,
    default: '50%'
  },
  beforeClose: {
    type: Function,
    default: () => {}
  }
});

const emits = defineEmits(['confirm', 'close']);

const dialogVisible = ref(false);

const open = () => {
  console.log(6699)
  dialogVisible.value = true;
};

const handleConfirm = () => {
  emits('confirm');
  dialogVisible.value = false;
};

const handleClose = () => {
  dialogVisible.value = false;
  emits('close');
};

defineExpose({
  open
});
</script>