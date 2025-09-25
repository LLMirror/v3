<template>
  <router-view />
</template>

<script setup>
// import useSettingsStore from '@/store/modules/settings'
// import { handleThemeStyle } from '@/utils/theme'
import {
  closeSocket,
  initSocket,
  subscribeSocket
} from '@/utils/webSocket';
import { ElNotification } from 'element-plus'
onMounted(() => {
  const route = useRoute();
  const router = useRouter();
  watch(()=>route.path,(newPath)=>{
    if(newPath==='/login'){
      closeSocket()
    } else initSocket()
  })
  //messageType1 为区分单例，不同type可共享数据
  subscribeSocket('message','messageType1',(res)=>{
    if(res.msgCode===201){
      const myElNotification=ElNotification({
        title: '你有一条新消息！',
        message: res.msg||'空消息',
        type: 'warning',
        onClick:()=>{
          myElNotification.close()
          router.push('/system/logs')
        }
      })
    }
  })
  // nextTick(() => {
  //   // 初始化主题样式
  //   handleThemeStyle(useSettingsStore().theme)
  // })
})
</script>
