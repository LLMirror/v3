import { createApp, h, ref } from 'vue';
import DialogWrapper from './index.vue';
import ElementPlus from 'element-plus';
const openDialog = (options) => {
  const { title, width, content, beforeClose, onConfirm, onClose } = options;

  const div = document.createElement('div');
  document.body.appendChild(div);

  const dialogRef = ref(null);

  const app = createApp({
    setup() {
      const openDialog = () => {
        dialogRef.value.open();
      };

      return {
        openDialog
      };
    },
    render() {
      return h(DialogWrapper, {
        ref: dialogRef,
        title,
        width,
        beforeClose,
        closeOnPressEscape: true, // 允许按 ESC 关闭
        closeOnClickModal: true, // 允许点击模态框关闭
        onConfirm: () => {
          onConfirm && onConfirm();
          app.unmount();
          div.remove();
        },
        onClose: () => {
          onClose && onClose();
          app.unmount();
          div.remove();
        }
      }, {
        default: () => content
      });
    }
  });
  app.use(ElementPlus);
  const vm = app.mount(div);
  vm.openDialog();
};

export default openDialog;