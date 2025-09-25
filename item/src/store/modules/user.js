import { login, logout, getInfo } from '@/api/login'
import { getToken, setToken, removeToken } from '@/utils/auth'
import {getUserInfo} from "@/api/system/index.js";
import {setTheme} from "@/utils/index.js";
import { handleThemeStyle ,setTextColotThemeStyle} from '@/utils/theme'
import useSettingsStore from '@/store/modules/settings'
import {nextTick} from "vue";
const useUserStore = defineStore(
  'user',
  {
    state: () => ({
      token: getToken(),
      id: '',
      name: '',
      avatar: '',
      roles: [],//角色权限
      permissions: [],
      admin:false
    }),
    actions: {
      // 登录
      login(userInfo) {
        const username = userInfo.username.trim()
        const password = userInfo.password
        const code = userInfo.code
        const uuid = userInfo.uuid
        return new Promise((resolve, reject) => {
          login(username, password, code, uuid).then(res => {
            setToken(res.token)
            this.token = res.token
            resolve()
          }).catch(error => {
            reject(error)
          })
        })
      },
      // 获取用户信息
      async getInfo() {
        let {data}=await getUserInfo();
        this.roles = data.roleKey;
        this.id = data.user.id;
        this.name = data.user.name;
        this.avatar=data.user.url;
        this.admin=!!data.user.admin||!!data.roleAdmin;
        nextTick(()=>{
          try {
            const {menuBg,menuHoverBg,menuActiveText,menuSubActiveText,menuSubBg,menuText,elTheme,elBg,elText}=data.theme;
            setTheme({menuBg,menuHoverBg,menuActiveText,menuSubActiveText,menuSubBg,menuText})
            if(elTheme===1){
              handleThemeStyle(elBg||useSettingsStore().theme)
              elText&&setTextColotThemeStyle(elText)
            }else{
              handleThemeStyle(useSettingsStore().theme)
              setTextColotThemeStyle("#FFF")
            }
          }catch (e) {
            handleThemeStyle(useSettingsStore().theme)
            setTextColotThemeStyle("#FFF")
            console.error("主题错误：",e)
          }
        })
        return data
      },
      // 退出系统
      logOut() {
        return new Promise((resolve, reject) => {
          this.token = ''
          this.roles = []
          this.permissions = []
          removeToken()
          handleThemeStyle(useSettingsStore().theme)
          setTextColotThemeStyle("#FFF")
          resolve()
        })
      }
    }
  })

export default useUserStore
