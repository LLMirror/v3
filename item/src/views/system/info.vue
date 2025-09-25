<template>
  <div class="app-container info-box">

    <el-row type="flex" justify="center" style="margin-top: 30px">
      <el-col :span="6">
        <el-form class="demo-form-inline" label-width="80px" :model="form" :rules="rules" ref="formRef">
          <el-form-item label="头像" prop="url">
            <FileList v-model="form.url" :selectNum="1" selectAccept=".jpg,.png,.jpeg,.webp,.gif"></FileList>
          </el-form-item>
          <el-form-item label="登陆账号" prop="name">
            <el-input v-model="form.name" placeholder="请输入登陆账号" />
          </el-form-item>
          <el-form-item label="登陆密码" prop="pwd">
            <el-input type="password" disabled v-model="form.pwd" placeholder="请输入登陆密码" >
              <template #append> <el-button v-loading="loading" type="danger"  @click="upUserPwdInfoApi" style="background: #f56c6c;color: #fff">修改密码</el-button></template>
            </el-input>
          </el-form-item>
        </el-form>
        <el-button v-loading="loading" type="primary" @click="submitForm"  style="width: 300px">确认修改</el-button>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Info">
  import FileList from "@/components/FileBox/FileList.vue";
  import md5 from 'js-md5';
  import {getPwdNodeMD5} from "@/utils/index.js";
  import {upUserInfo,upUserPwdInfo} from "@/api/system";
  import useUserStore from "@/store/modules/user.js";
  import {useRoute, useRouter} from "vue-router";
  import {ElMessageBox} from "element-plus";
  const userStore=useUserStore();
  const {proxy}=getCurrentInstance();
  const loading=ref(false);
  const router=useRouter();
  const route=useRoute();
  const data = reactive({
    form: {
      pwd:"***********",
      name:userStore.name,
      url:userStore.avatar
    },
    rules: {
      name: [
        { required: true, message: '请输入登陆账号', trigger: 'blur' },
        { min: 2, max: 15, message: '长度在 2 到 15 个字符', trigger: 'blur' }
      ],
      pwd: [
        { required: true, message: '请输入登陆密码', trigger: 'blur' },
      ],
      url: [
        { required: true, message: '请上传你的头像！', trigger: 'blur' },
      ],
    }
  });
  const { form, rules } = toRefs(data);
  async function submitForm(){
    await proxy.$refs["formRef"].validate();
    try {
      loading.value=true;
      await upUserInfo(form.value);
      proxy.$message.success("修改成功");
      setTimeout(()=>{router.go(0);},1000)
    }finally {
      loading.value=false;
    }
  }
  async function upUserPwdInfoApi(){
    try {
      loading.value=true;
      const {value}=await ElMessageBox.prompt('修改密码需要重新登录，请再次确认！', '温馨提示', {
        confirmButtonText: '确定修改',
        cancelButtonText: '取消',
        inputPattern: /^[^\u4e00-\u9fa5]{6,15}$/,
        inputErrorMessage: '密码需要6-15位不为中文密码',
        inputPlaceholder:"请输入新密码",
      });
      await upUserPwdInfo({pwd:md5(getPwdNodeMD5()+value)});
      proxy.$message.success("修改成功");
      userStore.logOut().then(() => {
        try {
          location.href = route.fullPath||'/index';
        }catch (e) {
          location.href = '/index';
        }
      })
    }finally {
      loading.value=false;
    }
  }
</script>

<style scoped lang="scss">
  .info-box{
    padding-top: 100px;
  }
</style>