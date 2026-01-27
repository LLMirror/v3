<template>
  <div class="login-wrap">
    <div class="ms-login">
      <div class="ms-title">系统登陆</div>
      <el-form :model="loginForm" :rules="loginRules" ref="loginFormRef" label-width="0px" class="ms-content">
        <el-form-item prop="name">
          <el-input v-model="loginForm.name" placeholder="用户名" @keyup.enter.native="handleLogin" clearable>
            <el-button slot="prepend" icon="el-icon-user-solid"></el-button>
          </el-input>
        </el-form-item>
        <el-form-item prop="pwd">
          <el-input type="password" placeholder="密码" v-model="loginForm.pwd" @keyup.enter.native="handleLogin" clearable>
            <el-button slot="prepend" icon="el-icon-question"></el-button>
          </el-input>
        </el-form-item>
        <el-form-item prop="captcha">
          <div class="captcha-box">
            <el-input class="captcha-input" type="captcha" placeholder="请输入验证码" v-model="loginForm.captcha"
                      @keyup.enter.native="handleLogin" clearable>
              <el-button slot="prepend">验证码</el-button>
            </el-input>
            <div class="captcha-svg" @click="getCaptchaApi" v-html="captchaSvg"></div>
            <div class="captcha-hint" @click="getCaptchaApi">看不清？点击更换</div>
          </div>
        </el-form-item>
        <div class="login-btn" v-loading="loading">
          <el-button type="primary" @click.native.prevent="handleLogin">登录</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import {getCaptcha, login} from "@/api/system/index.js";
import md5 from 'js-md5';
import {getPwdNodeMD5} from "@/utils/index.js";
const route = useRoute();
const router = useRouter();
const {proxy} = getCurrentInstance();
const loginForm = ref({
  // name: "",
  // pwd: "",
  name: "admin",
  pwd: "icar19654@",
  captcha: ""
});

const loginRules = {
  name: [{required: true, trigger: "blur", message: "请输入您的账号"}],
  pwd: [{required: true, trigger: "blur", message: "请输入您的密码"}],
  captcha: [{required: true, trigger: "blur", message: "请输入验证码"}]
};

const captchaSvg = ref("");
const loading = ref(false);
const redirect = ref(undefined);


watch(route, (newRoute) => {
  redirect.value = newRoute.query && newRoute.query.redirect;
}, {immediate: true});

async function getCaptchaApi() {
  let {data} = await getCaptcha();
  captchaSvg.value = data;
}
async function handleLogin() {
  await proxy.$refs.loginFormRef.validate();
  loading.value = true;
  try {
    await login({...loginForm.value, pwd: md5(getPwdNodeMD5() + loginForm.value.pwd)});
    const query = route.query;
    const otherQueryParams = Object.keys(query).reduce((acc, cur) => {
      if (cur !== "redirect") {
        acc[cur] = query[cur];
      }
      return acc;
    }, {});
    router.push({ path: redirect.value || "/", query: otherQueryParams });
  } catch (e) {
    loading.value = false;
    getCaptchaApi();
  }
}
getCaptchaApi();

</script>

<style scoped lang="scss">
.login-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  background-size: 100%;
  background: #808080; /* fallback for old browsers */
  background: -webkit-linear-gradient(
          to top,
          #2d8cc4,
          #d8d0d0
  ); /* Chrome 10-25, Safari 5.1-6 */
  background: linear-gradient(
          to top,
          #2d8cc4,
          #d8d0d0
  ); /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
}

.ms-title {
  width: 100%;
  line-height: 50px;
  text-align: center;
  font-size: 20px;
  color: #fff;
  border-bottom: 1px solid #ddd;
}

.ms-login {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 450px;
  transform: translate(-50%, -50%);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  overflow: hidden;
}

.ms-content {
  padding: 30px 30px;
}

.login-btn {
  text-align: center;
  margin: 40px 0 10px;
}

.login-btn button {
  width: 100%;
  height: 40px;
}

.ms-login {
  :deep(.el-input__inner) {
    height: 35px;
  }
}

.captcha-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  .captcha-input{
    width: 270px;
  }
}

.captcha-svg {
  height: 70px;
  min-width: 110px;
  border-radius: 3px;
  margin-left: 10px;
  cursor: pointer;
  :deep(svg) {
    height: 70px;
    width: 110px;
  }
}

.captcha-hint {
  color: #6166dc;
  font-size: 12px;
  position: absolute;
  transform: scale(0.9);
  right: 0;
  bottom: -20px;
  text-decoration: underline;
  cursor: pointer;
}
</style>