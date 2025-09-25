<template>
  <div class="app-container">
    <el-row :gutter="10" justify="center" type="flex">
      <el-col :span="6" >
        <el-button type="primary" round v-hasPermi="['roleKey1']">我是自定义指令：菜单权限字符 《roleKey1》</el-button>
      </el-col>
      <el-col :span="6">
        <el-button type="primary" round v-hasPermi="['roleKey2']">我是自定义指令：菜单权限字符 《roleKey2》</el-button>
      </el-col>
    </el-row>
    <el-row :gutter="10" justify="center" type="flex" style="margin-top: 20px">
      <el-col :span="6" >
        <el-button type="success" round v-hasRole="['primary']">我是自定义指令：角色权限字符 《primary》</el-button>
      </el-col>
      <el-col :span="6">
        <el-button type="success" round v-hasRole="['middle']">我是自定义指令：角色权限字符 《middle》</el-button>
      </el-col>
    </el-row>
    <el-row :gutter="10" justify="center" type="flex" style="margin-top: 20px">
      <el-col :span="6" >
        <el-button @click="checkMenuApi" style="margin-top: 20px" type="primary" plain>点击请求拥有菜单：roleKey1权限的接口</el-button>
      </el-col>
      <el-col :span="6">
        <el-button @click="checkRoleEventApi" style="margin-top: 20px" type="warning" plain>点击请求拥有角色：primary权限的接口</el-button>
      </el-col>
    </el-row>
    <div style="margin-top: 50px;color: red">请登录不同账户来测试不同 显示和隐藏（请看控制台打印信息）</div>

    <el-row :gutter="10" justify="center" type="flex" style="margin-top: 50px">
      <el-col :span="8" >
        <el-input
            v-model="moneyVal"
            placeholder="请输入金额"
            v-money="{value:{point:2},call:(val)=>{moneyVal=val}}"
        >
          <template #prepend>只能输入金额，小数保留两位</template>
        </el-input>
      </el-col>
      <el-col :span="8">
        <el-input
            v-model="englishVal"
            v-english="{value:{size:'min'},call:(val)=>englishVal=val}"
        >
          <template #prepend>只能输入小写英文</template>
        </el-input>
      </el-col>
    </el-row>
    <el-row :gutter="10" justify="center" type="flex" style="margin-top: 20px">
      <el-col :span="8" >
        <el-input
            v-model="numVal1"
            placeholder="请输入数字"
            v-number="{value:0,call:(val)=>numVal1=val}"
        >
          <template #prepend>只能输入数字，字数不限制</template>
        </el-input>
      </el-col>
      <el-col :span="8">
        <el-input
            v-model="numVal2"
            placeholder="请输入最多11位数字"
            v-number="{value:11,call:(val)=>numVal2=val}"
        >
          <template #prepend>只能输入最多11位数字</template>
        </el-input>
      </el-col>
    </el-row>
    <el-row :gutter="10" justify="center" type="flex" style="margin-top: 50px">
      <el-col :span="6">
        <el-button type="success" v-throttle="{fun:throttle1,val:2000}">通过指令控制节流，每隔2000毫秒触发一次（请点击测试）</el-button>
      </el-col>
      <el-col :span="6">
        <el-button type="warning" v-throttle="{fun:throttle2,val:throttleStart}">通过指令控制节流，监听传参变化作为开关（请点击测试）</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
  import {checkPermi,checkRole} from "@/utils/permission.js";
  import {checkMenu,checkRole as checkRoleEvent} from "@/api/tests";
  const { proxy } = getCurrentInstance();
  const moneyVal = ref(0);
  const englishVal = ref("");
  const numVal1 = ref(0);
  const numVal2 = ref(0);
  const throttleStart= ref(true);
  console.log(checkPermi(["roleKey1"]),"菜单权限：roleKey1") //菜单权限
  console.log(checkRole(["primary"]),"角色权限：primary") //角色权限
  console.log(checkRole(["middle"],true),"角色权限：middle (总管理也要遵守)") //角色权限(总管理也要遵守)
  async function checkMenuApi(){
    await checkMenu();
    proxy.$modal.msgSuccess("菜单权限字段权限请求通过！！！")
  }
  async function checkRoleEventApi(){
    await checkRoleEvent();
    proxy.$modal.msgSuccess("角色权限请求通过！！！")
  }
  function throttle1(){
    proxy.$modal.msgSuccess("成功触发用毫秒设置的节流事件，2000毫秒内点击不会再触发")
  }
  function throttle2(){
    throttleStart.value=false;
    proxy.$modal.msgWarning("成功触发用传参设置的节流事件，5秒内点击不会再触发")
    setTimeout(()=>{
      throttleStart.value=true;
    },5000)
  }
</script>

<style scoped lang="scss">
  .app-container{
    text-align: center;
    margin-top: 100px;
  }
</style>