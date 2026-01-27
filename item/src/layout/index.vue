<template>
  <div :class="classObj" class="app-wrapper" :style="{ '--current-color': theme }">
    <div v-if="device === 'mobile' && sidebar.opened" class="drawer-bg" @click="handleClickOutside"/>
    <sidebar v-if="!sidebar.hide" class="sidebar-container" />
    <div :class="{ hasTagsView: needTagsView, sidebarHide: sidebar.hide, fixedHeader }" class="main-container">
      <div :class="{ 'fixed-header': fixedHeader }">
        <navbar @setLayout="setLayout" />
        <tags-view v-if="needTagsView" />
      </div>
      <app-main />
      <settings ref="settingRef" />
    </div>
  </div>
</template>

<script setup>
import { useWindowSize } from '@vueuse/core'
import Sidebar from './components/Sidebar/index.vue'
import { AppMain, Navbar, Settings, TagsView } from './components'
import defaultSettings from '@/settings'

import useAppStore from '@/store/modules/app'
import useSettingsStore from '@/store/modules/settings'
import useUserStore from '@/store/modules/user'
import { useRouter, useRoute } from 'vue-router'
import { sendSocket } from '@/utils/webSocket'

const settingsStore = useSettingsStore()
const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// 监控逻辑：定时和路由变化时上报用户状态
let reportTimer = null
const reportActivity = async () => {
  // 如果没有ID和Name，尝试从Token或Store获取，或者等待
  const userId = userStore.id || userStore.name;
  const userName = userStore.nickName || userStore.name;
  
  if (!userId) {
    // console.log('Monitor: User info not ready yet');
    return 
  }
  
  const payload = {
    code: 101,
    userId: userId,
    userName: userName,
    path: route.path,
    timestamp: Date.now()
  }

  // 获取地理位置 (可选，可能会被浏览器拦截)
  // 注意：http 协议下 navigator.geolocation 可能会被禁用，或者用户拒绝授权
  // 为了保证至少有心跳，我们在 finally 或 回调外层先发送一次基础包，或者只在成功/失败后发送
  // 简单起见，我们并行处理：先发一个无位置包(如果需要极速响应)，或者等待位置
  // 这里逻辑改为：如果有权限则带位置，否则不带位置。
  // 为避免等待超时导致不上报，设置较短超时
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      payload.location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      sendSocket(payload)
    }, (err) => {
      // 权限被拒或超时，依然上报
      // console.warn('Geolocation failed:', err.message);
      sendSocket(payload)
    }, { timeout: 3000, maximumAge: 60000 })
  } else {
    sendSocket(payload)
  }
}

// 监听路由变化
watch(() => route.path, () => {
  reportActivity()
})

// 监听用户信息变化 (确保登录后立即上报)
watch(() => userStore.name, (val) => {
  if (val) reportActivity()
})

// 定时上报 (心跳)
onMounted(() => {
  // 延迟一点执行，给Store一点时间恢复
  setTimeout(reportActivity, 2000)
  reportTimer = setInterval(reportActivity, 30000)
})

onUnmounted(() => {
  if (reportTimer) clearInterval(reportTimer)
})

const theme = computed(() => settingsStore.theme);
const sideTheme = computed(() => settingsStore.sideTheme);
const sidebar = computed(() => useAppStore().sidebar);
const device = computed(() => useAppStore().device);
const needTagsView = computed(() => settingsStore.tagsView);
const fixedHeader = computed(() => settingsStore.fixedHeader);

const classObj = computed(() => ({
  hideSidebar: !sidebar.value.opened,
  openSidebar: sidebar.value.opened,
  withoutAnimation: sidebar.value.withoutAnimation,
  mobile: device.value === 'mobile'
}))

const { width, height } = useWindowSize();
const WIDTH = 992; // refer to Bootstrap's responsive design

watchEffect(() => {
  if (device.value === 'mobile' && sidebar.value.opened) {
    useAppStore().closeSideBar({ withoutAnimation: false })
  }
  if (width.value - 1 < WIDTH) {
    // useAppStore().toggleDevice('mobile')
    useAppStore().closeSideBar({ withoutAnimation: true })
  } else {
    useAppStore().toggleDevice('desktop')
  }
})

function handleClickOutside() {
  useAppStore().closeSideBar({ withoutAnimation: false })
}

const settingRef = ref(null);
function setLayout() {
  settingRef.value.openSetting();
}
</script>

<style lang="scss" scoped>
  @import "@/assets/styles/mixin.scss";
  @import "@/assets/styles/variables.module.scss";

.app-wrapper {
  @include clearfix;
  position: relative;
  height: 100%;
  width: 100%;

  &.mobile.openSidebar {
    position: fixed;
    top: 0;
  }
}

.drawer-bg {
  background: #000;
  opacity: 0.3;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 999;
}

.fixed-header {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 9;
  width: calc(100% - #{$base-sidebar-width});
  transition: width 0.28s;
}

.hideSidebar .fixed-header {
  width: calc(100% - 54px);
}

.sidebarHide .fixed-header {
  width: 100%;
}

.mobile .fixed-header {
  width: 100%;
}
</style>