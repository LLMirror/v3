 /**
 * v-hasPermi 操作权限处理
 * Copyright (c) 2019 node
 */

import {checkPermi} from "@/utils/permission.js";

export default {
  mounted(el, binding, vnode) {
    const { value } = binding
    if (value && value instanceof Array && value.length > 0) {
      if(!checkPermi(value)) el.parentNode.removeChild(el);
    } else {
      throw new Error(`请设置操作权限标签值`)
    }
  }
}
