import auth from '@/plugins/auth'
import { constantRoutes } from '@/router'
// import { getRouters } from '@/api/menu'
import {getRouter} from "@/api/system/index.js";
import Layout from '@/layout/index'
import ParentView from '@/components/ParentView'
import InnerLink from '@/layout/components/InnerLink'
import parentView from '@/components/parentView'
// 匹配views里面所有的.vue文件
const modules = import.meta.glob('./../../views/**/*.vue')

const usePermissionStore = defineStore(
  'permission',
  {
    state: () => ({
      routes: [],
      addRoutes: [],
      defaultRoutes: [],
      topbarRouters: [],
      sidebarRouters: [],
      role:[]//字符串权限
    }),
    actions: {
      setRoutes(menu) {
        this.addRoutes = menu
        this.routes = constantRoutes.concat(menu)
      },
      setDefaultRoutes(menu) {
        this.defaultRoutes = constantRoutes.concat(menu)
      },
      setTopbarRoutes(menu) {
        this.topbarRouters = menu
      },
      setSidebarRouters(menu) {
        this.sidebarRouters = constantRoutes.concat(menu)
      },
      setRole(role){
        this.role=role;
      },
      async generateRoutes(roles) {
        const {data} = await getRouter();
        let {menu,role} = filterAsyncRoutes(data.routerMenu);
        this.setSidebarRouters(menu)
        this.setDefaultRoutes(menu)
        this.setTopbarRoutes(menu)
        this.setRoutes(menu)
        this.setRole(role);
        return menu;
        // return new Promise(resolve => {
        //   // 向后端请求路由数据
        //   getRouter().then(res => {
        //     console.log(res,555)
        //     const sdata = JSON.parse(JSON.stringify(res.data))
        //     const rdata = JSON.parse(JSON.stringify(res.data))
        //     const defaultData = JSON.parse(JSON.stringify(res.data))
        //     const sidebarRoutes = filterAsyncRouter(sdata)
        //     const rewriteRoutes = filterAsyncRouter(rdata, false, true)
        //     const defaultRoutes = filterAsyncRouter(defaultData)
        //     const asyncRoutes = filterDynamicRoutes(dynamicRoutes)
        //     asyncRoutes.forEach(route => { router.addRoute(route) })
        //     this.setRoutes(rewriteRoutes)
        //     this.setSidebarRouters(constantRoutes.concat(sidebarRoutes))
        //     this.setDefaultRoutes(sidebarRoutes)
        //     this.setTopbarRoutes(defaultRoutes)
        //     resolve(rewriteRoutes)
        //   })
        // })
      }
    }
  })

// 遍历后台传来的路由字符串，转换为组件对象
function filterAsyncRouter(asyncRouterMap, lastRouter = false, type = false) {
  return asyncRouterMap.filter(route => {
    if (type && route.children) {
      route.children = filterChildren(route.children)
    }
    if (route.component) {
      // Layout ParentView 组件特殊处理
      if (route.component === 'Layout') {
        route.component = Layout
      } else if (route.component === 'ParentView') {
        route.component = ParentView
      } else if (route.component === 'InnerLink') {
        route.component = InnerLink
      } else {
        route.component = loadView(route.component)
      }
    }
    if (route.children != null && route.children && route.children.length) {
      route.children = filterAsyncRouter(route.children, route, type)
    } else {
      delete route['children']
      delete route['redirect']
    }
    return true
  })
}

function filterChildren(childrenMap, lastRouter = false) {
  var children = []
  childrenMap.forEach((el, index) => {
    if (el.children && el.children.length) {
      if (el.component === 'ParentView' && !lastRouter) {
        el.children.forEach(c => {
          c.path = el.path + '/' + c.path
          if (c.children && c.children.length) {
            children = children.concat(filterChildren(c.children, c))
            return
          }
          children.push(c)
        })
        return
      }
    }
    if (lastRouter) {
      el.path = lastRouter.path + '/' + el.path
      if (el.children && el.children.length) {
        children = children.concat(filterChildren(el.children, el))
        return
      }
    }
    children = children.concat(el)
  })
  return children
}

// 动态路由遍历，验证是否具备权限
export function filterDynamicRoutes(routes) {
  const res = []
  routes.forEach(route => {
    if (route.permissions) {
      if (auth.hasPermiOr(route.permissions)) {
        res.push(route)
      }
    } else if (route.roles) {
      if (auth.hasRoleOr(route.roles)) {
        res.push(route)
      }
    }
  })
  return res
}

export const loadView = (view) => {
  let res;
  for (const path in modules) {
    const dir = path.split('views/')[1].split('.vue')[0];
    if (dir === view) {
      res = () => modules[path]();
    }
  }
  return res;
}

export function filterAsyncRoutes(routes) {
  //菜单   权限数组
  const menu = [],role=[];
  routes.forEach(route => {
    const tmp = { ...route };
    // 动态加载页面
    if (tmp.component !== '') {
      tmp.component = loadView(tmp.component);
    }
    // 动态加载左边主体菜单
    if (tmp.layout) {
      tmp.component = Layout
    }
    // 如果还需要套二级
    if (tmp.menuType==="M"&&tmp.parentId!=0) {
      tmp.component = parentView
    }
    if (tmp.children && tmp.children.length != 0) {
      let childrenRes=filterAsyncRoutes(tmp.children);
      tmp.children =childrenRes.menu;
      role.push(...childrenRes.role);
    }

    tmp.roleKey&&role.push(tmp.roleKey);
    menu.push(tmp)
  })

  return {
    menu,
    role
  }
}

export default usePermissionStore
