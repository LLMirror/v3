<template>
  <div class="file-box">
    <el-upload
        :action="action"
        :list-type="listType"
        :multiple="multiple"
        ref="upImg"
        :limit="limit"
        v-model:file-list="fileList"
        :headers="headers"
        :drag="drag"
        :accept="accept"
        :on-success="onSuccess"
        :on-remove="onRemove"
        :before-upload="beforeUpload"
        :on-exceed="handleExceed"
        :on-preview="handlePictureCardPreview"
        :disabled="disabled"
        :data="uploadData"
    >
      <template v-if="!disabled">
        <el-icon v-if="listType==='picture-card'"><Plus /></el-icon>
        <el-button v-else size="small" type="primary" plain style="margin-top: 5px">{{fileBtnText}}</el-button>
      </template>
      <template #tip v-if="!disabled">
        <div v-if="drag" class="el-upload__text"><em>支持拖拽上传</em></div>
        <div v-if="accept" class="el-upload__tip" slot="tip">上传类型：{{accept}}</div>
        <div v-if="size" class="el-upload__tip" slot="tip">最大不超过：{{size}} M</div>
      </template>

    </el-upload>
    <el-dialog   v-model="dialogVisible" size="tiny" append-to-body width="50%">
      <img v-if="isImg" style="width: 100%" :src="dialogImageUrl" alt="预览">
      <template v-if="dialogVisible&&!isImg">
        <VideoView :url="dialogImageUrl" videoStyle="width: 100%;height: 100%"></VideoView>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="UpFile">
  import {ref,watch} from 'vue'
  import {getToken} from "@/utils/auth.js";
  import { deepClone, fileUrlType } from '@/utils';
  import Compressor from 'compressorjs';
  import VideoView from "@/components/FileBox/VideoView.vue";
  import useUserStore from "@/store/modules/user";
  import {useRoute,useRouter} from "vue-router";
  const {proxy}=getCurrentInstance();
  const userStore = useUserStore();
  const route=useRoute();
  const router=useRouter();
  const props=defineProps({
    //接收字符串："url,url,url"    数组：[{url:""},{url:""}]或者["url","url"]
    modelValue: [String, Array],
    //modelValue返回格式，string 返回"url,url,url" ；arrayStr 返回["url","url"] ； arrayObj 返回[{url:""},{url:""}]
    runType:{
      type:String,
      default:"string"
    },
    //文件数量 为0 不限制
    limit:{
      type:Number,
      default: 0
    },
    //是否多选
    multiple:{
      type:Boolean,
      default:false
    },
    //是否拖拽
    drag:{
      type:Boolean,
      default:false
    },
    //展示类型  picture-card/picture/text
    listType:{
      default:"picture-card"
    },
    //文件类型 为空不限制 .jpg,.png
    accept:{
      type:String,
      default:""
    },
    //文件大小限制，为0不限制   单位M
    size:{
      type:Number,
      default: 0
    },
    //是否禁用
    disabled:{
      type:Boolean,
      default:false
    },
    //是否上传完成马上清除上传显示目录
    isClearFiles:{
      type:Boolean,
      default:false
    },
    //上传额外参数
    upData:{
      type:Object,
      default:()=>{}
    },
    //图片是否需要压缩
    isCompress:{
      type:Boolean,
      default: false
    },
    //图片压缩阈值
    quality:{
      type:Number,
      default: 0.7
    },
    //上传按钮文字
    fileBtnText:{
      type: String,
      default: '点击上传'
    }
  });
  const number = ref(0);
  const dialogImageUrl = ref('');
  const dialogVisible = ref(false);
  const action= import.meta.env.VITE_APP_BASE_HOST+'/file/file';
  const list=ref([]);
  const fileList=ref([]);
  const upImg=ref(null);
  const isImg=ref(true);
  const emit= defineEmits(["upSuccess","upRemove"]);
  const headers=computed(()=>{
    return {token:getToken()}
  });
  const uploadData=computed(()=>{
    return Object.assign({},props.upData)
  })
  watch(() => props.modelValue, val => {
    if (val) {
      // 首先将值转为数组
      const listArr = Array.isArray(val) ? val : val.split(",");
      // 然后将数组转为对象数组
      list.value = fileList.value = listArr.map(item => {
        if (typeof item === "string") {
          item = { url: proxy.fileHost+item,name: item };
        }else{
          item = { url: proxy.fileHost+item.url,name:item.name}
        }
        return item;
      });
    } else {
      list.value = fileList.value = [];
    }
    number.value=list.value.length;
  },{ deep: true, immediate: true });

  function updateModelValue(){
    nextTick(()=>{ emit("update:modelValue", listToString(list.value));})
  }
  // 对象转成指定字符串分隔
  function listToString(list, separator) {
    const listArr=deepClone(list);
    switch (props.runType) {
      case "string":
        let strs = "";
        separator = separator || ",";
        for (let i in listArr) {
          if (undefined !== listArr[i].url && listArr[i].url.indexOf("blob:") !== 0) {
            strs += listArr[i].url.replace(proxy.fileHost, "") + separator;
          }
        }
        return strs != "" ? strs.substr(0, strs.length - 1) : "";
      case "arrayStr":
        return listArr.map(t=>t.url.replace(proxy.fileHost, ""));
      case "arrayObj":
        return list.map(t=>{t.url=t.url.replace(proxy.fileHost, ""); return t});
      default :
        return ""
    }
  }

  function getFileRes(){
    return listToString(list.value);
  }
  function handlePictureCardPreview(file){
    const {url,response}=file;
    if(fileUrlType(url)===1){
      isImg.value=true;
      dialogImageUrl.value = url?url:response.data[0].url;
    }else if(fileUrlType(url)===2){
      isImg.value=false;
      dialogImageUrl.value =response?response.data[0].url:url;
    }else{
      return window.open(response?response.data[0].url:url)
    }
    dialogVisible.value = true;
  }
  function onSuccess(res){
    let {data,code,msg}=res;
    if(code==203){
      proxy.$modal.msgError("登陆失效，请重新登陆！");
      userStore.logOut().then(() => {
        router.push({path:'/login'})
      });
      number.value--;
      return
    };
    if(code!=1){
      number.value--;
      return proxy.$modal.msgError(msg||"上传失败！");
    }
    list.value=list.value.concat(data);
    emit("upSuccess",{data});
    //根据选择的数量判断为最后一次触发
    if (number.value > 0 && list.value.length === number.value) {
      number.value=0;
      updateModelValue()
      //图片管理使用
      emit("uploadSuccessImgAdmin", list.value);
      // 清除上传文件（/图片管理使用）
      if(props.isClearFiles){
        list.value=[];
        setTimeout(()=>{proxy.$refs.upImg.clearFiles();},500);
      }
    }
  }
  function onRemove(res){
    let {response,status}=res;
    let data=response?response.data:[res];
    const dataUrl=data.map(item=>item.url)
    list.value= list.value.filter(item=> !dataUrl.includes(item.url));
    if(status==='success')number.value--;
    updateModelValue()
    return emit("upRemove",{data});
  }
  async function beforeUpload(res){
    const compress=(file)=>{
      return new Promise((resolve) => {
        // 使用 compressorjs 进行压缩
        new Compressor(file, {
          quality: props.quality, // 压缩质量，0到1之间
          width: 500, // 压缩后图片的宽度
          height: 500,
          success(result) {
            resolve(result);
          },
          error() {
            resolve(file);
          },
        });
      });
    }
    let file = res;
    try {
      if(props.isCompress) file=await compress(res)
    }catch (e) {
      console.log("文件压缩错误",e);
    }
    if(props.size&&(file.size/1024/1024)>props.size){
      proxy.$modal.msgError(`最大不超过${props.size} M`);
      return false;
    }
    if(props.accept){
      const regex = /\.([^.]*)$/;
      const match = file.name.match(regex);
      const result = match ? match[0] : "";
      //小写化文件后缀
      if(!props.accept.toLowerCase().includes(result.toLowerCase())){
        proxy.$modal.msgError(`只能上传类型：${props.accept}`);
        return false;
      }
    }
    number.value++;
    return file;
  }
  function handleExceed(){
    proxy.$modal.msgError(`一次性最多可上传：${props.limit}个`);
  }
  function clearFiles(){
    list.value=[];
    upImg.value.clearFiles();
  }
  defineExpose({
    getFileRes,
    clearFiles
  })
</script>

<style scoped lang="scss">
.file-box{
  :deep(.el-upload-dragger){
    width: 148px;
    height: 148px;
    .el-upload__text{
      width: 100%;
      position: absolute;
      top: 45px;
    }
  }
  :deep(.el-upload__tip){
    line-height: 15px;
  }
}
</style>
