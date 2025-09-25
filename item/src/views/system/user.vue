<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button class="mb10" icon="Plus" type="primary" plain @click="openDialog">添加用户</el-button>
    <el-table :data="dataList" style="width: 100%" v-loading="tableLoading">
      <el-table-column label="编号" align="center" prop="id" />
      <el-table-column label="用户名称" align="center" prop="name">
        <template #default="scope">
          {{scope.row.name}} <el-tag v-if="scope.row.admin===1" size="small" effect="dark">超级管理员</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="用户头像" align="center" prop="url" width="120">
        <template #default="scope">
          <el-image
              style="width: 100px; height: 100px"
              :src="proxy.fileHost+scope.row.url"
              :preview-src-list="[proxy.fileHost+scope.row.url]"
              fit="cover"
              :preview-teleported="true"
          >
          </el-image>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="name">
        <template #default="scope">
          <el-tag v-if="scope.row.status===1" size="small" effect="dark">正常</el-tag>
          <el-tag v-else size="small" effect="dark" type="danger">禁用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="账号归属" align="center" prop="name" :formatter="formatMore" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="创建时间" align="center" prop="createTime"  />
      <el-table-column label="操作" align="center" width="350">
        <template #default="scope">
          <el-button link size="small" type="primary" v-if="scope.row.admin!==1" @click="handleEdit( scope.row)"  icon="Edit">修改</el-button>
          <el-button link size="small" type="warning" @click="upUserPwdApi(scope.row)"  icon="Edit">修改密码</el-button>
          <el-button link size="small" type="success" @click="upThemeShow(scope.row)"  icon="Orange" >主题修改</el-button>
          <el-button link size="small" type="danger" v-if="scope.row.admin!==1"  @click="handleDelete( scope.row)"  icon="Delete">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="pageConfig.page"
      v-model:limit="pageConfig.size"
      @pagination="pageRefresh"
    />
    <el-dialog title="用户管理" v-model="open" width="500px">
      <el-form class="demo-form-inline" label-width="80px" :model="form" :rules="rules" ref="ruleForm">
        <el-form-item label="用户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入用户名称" />
        </el-form-item>

        <el-form-item label="用户密码" prop="pwd" v-if="!form.id">
          <el-input  v-model="form.pwd" placeholder="请输入密码">
          </el-input>
        </el-form-item>

        <el-form-item label="用户头像" prop="url">
          <FileList v-model="form.url" :selectNum="1" selectAccept=".jpg,.png,.jpeg,.webp,.gif"></FileList>
        </el-form-item>
        <el-form-item label="状态" prop="status" >
          <el-select v-model="form.status" placeholder="请选择状态" >
            <el-option  label="正常" :value="1">
            </el-option>
            <el-option  label="禁用" :value="0">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="角色选择" prop="rolesId" v-if="form.admin!==1">
          <el-select v-model="form.rolesId" filterable placeholder="请选择角色" multiple>
            <el-option v-for="(item) in rolesArr" :key="item.id" :label="item.name" :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="账号归属" prop="moreId" v-if="form.admin!==1">
          <el-select v-model="form.moreId" filterable placeholder="请选择账号">
            <el-option v-for="(item) in moreArr" :key="item.id" :label="item.name" :value="item.id">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="open=false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog title="主题修改" v-model="themeOpen" width="800" @close="themeClose">
      <el-form class="demo-form-inline" label-width="80px" :model="form" ref="themeForm" >
        <div style="text-align: center;margin-bottom: 30px;" @click="defaultTheme"><el-button type="primary" size="small" plain>恢复默认主题</el-button></div>
        <el-row style="text-align: center">
          <el-col :span="4">
            <div class="color-title">默认背景</div>
            <el-color-picker v-model="form.menuBg" @change="changeColor($event,'--menuBg-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <div class="color-title">展开背景</div>
            <el-color-picker v-model="form.menuSubBg" @change="changeColor($event,'--menuSubBg-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <div class="color-title">默认文字</div>
            <el-color-picker v-model="form.menuText" @change="changeColor($event,'--menuText-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <div class="color-title">选中文字</div>
            <el-color-picker v-model="form.menuActiveText" @change="changeColor($event,'--menuActiveText-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <div class="color-title">当前选中展开文字</div>
            <el-color-picker v-model="form.menuSubActiveText" @change="changeColor($event,'--menuSubActiveText-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <div class="color-title">hover背景</div>
            <el-color-picker v-model="form.menuHoverBg" @change="changeColor($event,'--menuHoverBg-color')"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
        </el-row>
        <el-row justify="end" align="middle" style="text-align: center;margin-top: 20px">
          <el-col :span="3">
            <div class="color-title">el主题背景</div>
            <el-color-picker v-model="form.elBg" @change="changeElColor($event,1)"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="3">
            <div class="color-title">el主题文字</div>
            <el-color-picker v-model="form.elText" @change="changeElColor($event,2)"  class="color-picker"  popper-class="theme-picker-dropdown" ></el-color-picker>
          </el-col>
          <el-col :span="4">
            <el-switch
              v-model="form.elTheme"
              active-text="开启el主题跟随"
              inactive-text="关闭el主题跟随"
              inline-prompt
              :active-value="1"
              :inactive-value="0"
              @change="elThemeChange"
            />
          </el-col>
          <el-tooltip content="开启后el的默认主题会跟随目前设置的主题颜色" placement="top">
            <el-icon><question-filled /></el-icon>
          </el-tooltip>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="themeOpen=false">取 消</el-button>
          <el-button type="primary" @click="upThemeApi">确认修改</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="User">
import {getUser, getRolesAll, getMoreAll, addUser, upUser, delUser,upUserPwd,upTheme,getTheme} from "@/api/system/index.js";
import FileList from "@/components/FileBox/FileList.vue";
import md5 from 'js-md5';
import {getPwdNodeMD5, setTheme} from "@/utils/index.js";
import { handleThemeStyle ,setTextColotThemeStyle} from '@/utils/theme'
import {  ElMessageBox } from 'element-plus';
import useUserStore from '@/store/modules/user';
import {useRoute, useRouter} from "vue-router";
import useSettingsStore from "@/store/modules/settings.js";
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const userStore = useUserStore();
const { proxy } = getCurrentInstance();
const router=useRouter();
const route=useRoute();
const open = ref(false);
const themeOpen = ref(false);
const loading = ref(false);
const title = ref("");
const rolesArr=ref([]);
const moreArr=ref([]);
const fileList=ref([]);
const upFileRef=ref(null);

const formOptions=computed(()=>{
  return [
    {label:"用户名称",prop:"name",type:"FormInput",placeholder:"请输入用户名称"},
    {label:"账号归属",prop:"moreId",type:"FormSelect",options:moreArr.value,keyLabel:"name",keyValue:'id',placeholder:"请选择账号归属"},
    {label:"状态",prop:"status",type:"FormSelect",options:[{label:'正常',id:1},{label:'禁用',id:0}],keyValue:'id',placeholder:"请选择状态"},
  ]
})
const data = reactive({
  form: {},
  rules: {
    name: [
      { required: true, message: '请输入用户名称', trigger: 'blur' },
      { min: 2, max: 15, message: '长度在 2 到 15 个字符', trigger: 'blur' }
    ],
    pwd: [
      { required: true, message: '请输入用户密码', trigger: 'blur' },
      { min: 6, max: 15, message: '长度在 6 到 15 个字符', trigger: 'blur' },
    ],
    rolesId: [
      { required: true, message: '请选择用户角色', trigger: 'change' }
    ],
    moreId: [
      { required: true, message: '请选择归属账号', trigger: 'change' }
    ],
    status: [
      { required: true, message: '请选择状态', trigger: 'change' }
    ],
    url: [
      { required: true, message: '请上传用户头像！', trigger: 'blur' }
    ],
  }
});
const { form, rules } = toRefs(data);
function openDialog(){
  open.value=true;
  form.value={};
  nextTick(()=>{
    upFileRef.value.clearFiles();
  })
}
function handleEdit(row){
  open.value=true;
  form.value={...row,rolesId:row.rolesId.split(",")};
  nextTick(()=>{
    fileList.value=[{name:row.url,url:row.url}];
  })
}
async function submitForm(){
  await proxy.$refs["ruleForm"].validate();
  try {
    loading.value=true;
    const data={...form.value,rolesId:form.value.rolesId.join(",")};
    !form.value.id&&await addUser({...data,pwd:md5(getPwdNodeMD5()+data.pwd)});
    form.value.id&&await upUser(data);
    proxy.$modal.msgSuccess(form.value.id? "修改成功" : "新增成功");
    open.value = false;
    pageRefresh();
  }finally {
    loading.value=false;
  }
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await proxy.$modal.confirm(`是否删除用户：${row.name}？`)
  await delUser({id:row.id})
  pageRefresh();
  proxy.$modal.msgSuccess("删除成功");
}
async function upUserPwdApi(row){
  let {name,admin}=row;
  const {value}=await ElMessageBox.prompt(admin===1?`当前修改的是《总管理》密码，请务必再次确认！`:`当前修改的是《${name}》密码`, '温馨提示', {
    confirmButtonText: '确定修改',
    cancelButtonText: '取消',
    inputPattern: /.{6,15}/,
    inputErrorMessage: '密码6-15位密码'
  });
  await upUserPwd({id:row.id,pwd:md5(getPwdNodeMD5()+value)});
  proxy.$modal.msgSuccess("修改成功");
  if(admin===1) userStore.logOut().then(() => {
    try {
      location.href = route.fullPath||'/index';
    }catch (e) {
      location.href = '/index';
    }
  })

}
function upThemeShow(row){
  if(row.elTheme===1){
    handleThemeStyle(row.elBg);
    setTextColotThemeStyle(row.elText);
  }
  themeOpen.value=true;
  form.value={...row};
}
async function upThemeApi(){
 try {
   loading.value=true;
   await upTheme(form.value);
   pageRefresh();
   proxy.$modal.msgSuccess("修改成功");
   themeOpen.value=false;
 }finally {
   loading.value=false;
 }
}
function changeColor(val,name){
  document.getElementsByTagName('body')[0].style.setProperty(name,val);
}
function changeElColor(val,num){
  num===1&&handleThemeStyle(val);
  num===2&&setTextColotThemeStyle(val);
}
function elThemeChange(num){
  if(num===1){
    handleThemeStyle(form.value.elBg);
    setTextColotThemeStyle(form.value.elText);
  }else{
    handleThemeStyle(useSettingsStore().theme);
    setTextColotThemeStyle("#FFF")
  }
}
function themeClose(){
  userStore.getInfo()
}
async function defaultTheme(){
  const {data}=await getTheme();
  const {menuBg,menuHoverBg,menuActiveText,menuSubActiveText,menuSubBg,menuText}=data[0];
  setTheme({menuBg,menuHoverBg,menuActiveText,menuSubActiveText,menuSubBg,menuText,form});
  if(form.value.elTheme===1){
    handleThemeStyle(menuBg);
    setTextColotThemeStyle(menuText);
  }
  form.value.elBg=menuBg;
  form.value.elText=menuText;
}

async function getRolesAllApi(){
  const {data}=await getRolesAll();
  rolesArr.value= data.map(t=>{t.id=t.id.toString(); return t});
}
async function getMoreAllApi(){
  const {data}=await getMoreAll();
  moreArr.value=data;
}
function formatMore (row) {
  if(row.admin===1) return "总管理";
  let res = moreArr.value.filter(t => t.id == row.moreId);
  if (res.length == 0) return "“账号不存在”"
  return res[0].name
}
onMounted(async  ()=>{
  initData(getUser);
  getRolesAllApi();
  await getMoreAllApi();
})
</script>

<style scoped lang="scss">

</style>