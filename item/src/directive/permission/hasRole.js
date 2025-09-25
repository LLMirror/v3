 /**
 * v-hasRole 角色权限处理
 * Copyright (c) 2019 node
 */

import {checkRole} from "@/utils/permission.js";

export default {
  mounted(el, binding, vnode) {
    const { value } = binding
    if (value && value instanceof Array && value.length > 0) {
      if(!checkRole(value)) el.parentNode.removeChild(el);
    } else {
      throw new Error(`请设置角色权限标签值`)
    }
  }
}
