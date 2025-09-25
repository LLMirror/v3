import useUserStore from '@/store/modules/user'
import usePermissionStore from "@/store/modules/permission.js";
/**
 * 字符权限校验
 * @param {Array} value 校验值
 * @param {Boolean} admin 总管理是否也要遵守
 * @returns {Boolean}
 */
export function checkPermi(value,admin=false) {
  if (value && value instanceof Array && value.length > 0) {
    const userStore=useUserStore();
    const permissionStore=usePermissionStore();
    if(userStore.admin&&!admin) return true;
    return value.some(permission => {
      return permissionStore.role.includes(permission)
    });
  } else {
    console.error(`need roles! Like checkPermi="['system:user:add','system:user:edit']"`)
    return false
  }
}

/**
 * 角色权限校验
 * @param {Array} value 校验值
 * @param {Boolean} admin 总管理是否也要遵守
 * @returns {Boolean}
 */
export function checkRole(value,admin=false) {
  if (value && value instanceof Array && value.length > 0) {
    const userStore=useUserStore();
    if(userStore.admin&&!admin) return true;
    return value.some(permission => {
      return userStore.roles.includes(permission)
    });
  } else {
    console.error(`need roles! Like checkRole="['admin','editor']"`)
    return false
  }
}