import {getDictType} from "@/api/system/index.js";

/**
 * 获取字典数据
 */
export function useDict(...args) {
  const res = ref({});
  return (() => {
    args.forEach((dictType, index) => {
      res.value[dictType] = [];
      getDictType(dictType).then(resp => {
        res.value[dictType] = resp.data;
      })
    })
    return toRefs(res.value);
  })()
}