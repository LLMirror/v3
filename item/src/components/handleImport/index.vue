<template>
  <el-dialog title="文件上传" v-model="open" width="400px" append-to-body :close-on-click-modal="false">
    <el-upload
        ref="uploadRef"
        :limit="limit"
        :accept="accept"
        :headers="headers"
        :action="action"
        :data="params"
        :on-progress="handleFileUploadProgress"
        :on-success="handleFileSuccess"
        :on-error="handleFileError"
        :auto-upload="false"
        drag
        :disabled="upLoading"
    >
      <el-icon ><Plus /></el-icon>
      <div class="el-upload__text">
        将文件拖到此处，或
        <em>点击上传</em>
      </div>
      <template #tip>

        <div class="el-upload__tip" slot="tip" style="text-align: right">
          <el-link v-loading="impLoading" v-if="showTemplate" type="primary"  @click="downloadTemplate"
          >下载模板</el-link>
        </div>
        <div v-if="accept" class="el-upload__tip" style="color: red" slot="tip">
          提示：仅允许导入{{accept}}格式文件！
        </div>
      </template>

    </el-upload>
    <div v-if="upLoading" style="margin-top: 15px">
      <el-progress :percentage="uploadPercent" :format="percentage => percentage === 100 ? '处理中...' : `${percentage}%`"></el-progress>
    </div>
    <template #footer>
      <div class="dialog-footer" v-loading="upLoading">
        <el-button @click="open=false">取 消</el-button>
        <el-button type="primary" @click="submitFileForm">确 定</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import {getToken} from "@/utils/auth";
  import useUserStore from "@/store/modules/user.js";
  import {useRoute} from "vue-router";
  const {proxy}=getCurrentInstance();
  const userStore = useUserStore();
  const route=useRoute();
  const props=defineProps({
    //一次性上传的数量
    limit:{
      type:Number,
      default:1
    },
    accept:{
      type:String,
      default:".xlsx,.xls"
    },
    //上传地址
    url:{
      type:String,
      default:""
    },
    //显示下载模板按钮
    showTemplate:{
      type:Boolean,
      default:true
    },
    //显示导入方式
    sign:{
      type:Boolean,
      default:false
    },
    //附带参数
    parentParams:{
      type:Object,
      default:()=>{return {}}
    },
    //下载模板接口
    downloadApi:{
      type:Function,
      default:async ()=>{}
    }
  });
  const open=ref(false);
  const upLoading=ref(false);
  const uploadPercent = ref(0);
  const impLoading=ref(false);
  const headers={ Token: getToken() };
  const action=ref("");
  const uploadRef=ref(null);
  //默认参数
  const params=ref({name:"导入文件"});
  const emit=defineEmits(["downloadTemplate","importRes"]);
  //显示
  function show(){
    open.value=true;
  }
  /** 下载模板操作 */
  async function downloadTemplate(){
    impLoading.value=true;
    const res=await props.downloadApi();
    proxy.downFile(res);
    setTimeout(()=>{impLoading.value=false;},1500);
  }
  //上传失败
  function handleFileError(){
    open.value=false;
    upLoading.value=false;
  }
  // 文件上传中处理
  function handleFileUploadProgress(event, file, fileList) {
    upLoading.value = true;
    uploadPercent.value = Math.floor(event.percent);
  }
  // 文件上传成功处理
  function handleFileSuccess(response, file, fileList) {
    upLoading.value = false;
    uploadPercent.value = 0;
    uploadRef.value.clearFiles();
    if(response.code==203){
      proxy.$modal.msgError("登陆失效，请重新登陆！");
      userStore.logOut().then(() => {
        try {
          location.href = route.fullPath||'/index';
        }catch (e) {
          location.href = '/index';
        }
      });
      return
    };
    if(response.code!==1) return proxy.$modal.msgError(response.msg||"导入失败！");
    open.value = false;
    emit("importRes",response);
  }
  // 提交上传文件
  function submitFileForm() {
    params.value={...params.value,...props.parentParams};
    uploadRef.value.submit();
  }
  defineExpose({
    show
  })
  onMounted(()=>{
    action.value=import.meta.env.VITE_APP_BASE_HOST+props.url;
  })
</script>

<style scoped lang="scss">

</style>