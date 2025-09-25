import {throttle} from "@/utils"
/**
 *  v-throttle="{fun:function,val:0/boolean}"
 * @param {Function} fun 触发事件
 * @param {number|boolean} val 如果为Boolean 则为是否开启节流，为毫秒则作为节流定时器触发时间
 * */
function isBoolean(val) {
  return typeof val === 'boolean';
}
export default {
  beforeMount(el, binding) {
    const { value } = binding;
    const {fun,val}=value;
    if(typeof fun!=="function") return;
    el._throttledFn = throttle(event => {
      fun(event);
    }, isBoolean(val)? 0 : val);
    el.addEventListener('click', el._throttledFn);
  },
  updated(el, binding) {
    const { value } = binding;
    const {val}=value;
    if (el._throttledFn&&isBoolean(val)&&!val) {
      el.removeEventListener('click', el._throttledFn);
    }else{
      el._throttledFn&&el.addEventListener('click', el._throttledFn);
    }
  },
  unmounted(el) {
    // 确保在组件卸载时移除事件监听器
    if (el._throttledFn) {
      el.removeEventListener('click', el._throttledFn);
    }
  }
}