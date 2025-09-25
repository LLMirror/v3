<template>
  <div style="border: 1px solid #ccc; margin: 0 auto" :style="boxStyleString">
    <Toolbar
        style="border-bottom: 1px solid #ccc"
        :editor="editorRef"
        :defaultConfig="toolbarConfig"
        :mode="mode"
    />
    <Editor
        :style="editorStyleString"
        v-model="html"
        :defaultConfig="editorConfig"
        :mode="mode"
        @onCreated="onCreated"
        @onChange="onChange"
    />
  </div>
  <ImgIndex v-model="imgList" ref="imgIndexRef" @imgAdminRes="imgAdminRes" :size="1" :moreFileNum="1"></ImgIndex>
  <ImgIndex v-model="videoList" ref="videoIndexRef" @imgAdminRes="videoAdminRes" :size="1" :moreFileNum="2"></ImgIndex>
</template>

<script setup>
  //https://www.wangeditor.com/
  //其他好用编辑器
  //https://open-doc.modstart.com/ueditor-plus/manual.html#%E5%9F%BA%E7%A1%80%E4%BD%BF%E7%94%A8
  //https://editor.umodoc.com/cn/docs
  
  import { Editor, Toolbar } from '@wangeditor/editor-for-vue';
  import '@wangeditor/editor/dist/css/style.css';
  import ImgIndex from "@/components/FileBox/index.vue";
  // import {getToken} from "@/utils/auth";
  // import useUserStore from '@/store/modules/user';
  // const userStore = useUserStore();
  import {useRoute,useRouter} from "vue-router";
  const { proxy } = getCurrentInstance();
  const route=useRoute();
  const router=useRouter();
  const props=defineProps({
    /* 编辑器的内容 */
    modelValue: {
      type: String,
    },
    //外层样式
    boxStyleString:{
      type:String,
      default:"width: 100%;"
    },
    //编辑器样式
    editorStyleString:{
      type:String,
      default:"width: 100%;overflow-y: hidden; height: 500px;"
    },
    //菜单栏配置
    toolbarConfig:{
      type:Object,
      default:()=>{return { excludeKeys:[]}}
    },
    //图片上传大小，为0不限制,单位M
    imgSize:{
      type:Number,
      default:10
    },
    //视频上传大小，为0不限制,单位M
    videoSize:{
      type:Number,
      default:10
    }
  });
  const emit=defineEmits([ "update:modelValue" ]);
  const html=ref("");
  const editorRef= shallowRef();
  const mode="default";
  const imgList=ref([]);
  const videoList=ref([]);
  const imgIndexRef=ref(null);
  const videoIndexRef=ref(null);
  let insertImgFn=()=>{}
  let insertVideoFn=()=>{}
  //监听v-model
  watch(() => props.modelValue, (v) => {
    if (v !== html.value) {
      nextTick(()=>{
        html.value = v === undefined ? "<p></p>" : v;
      })
    }
  }, { immediate: true });
  const editorConfig={
    placeholder: '请输入内容（可上传图片和视频）...',
    //上传图片的配置
    MENU_CONF:{
      uploadImage:{
        // server: import.meta.env.VITE_APP_BASE_HOST+"/file/file",
        // fieldName:"file",
        // maxFileSize: props.imgSize * 1024 * 1024,//限制大小
        // headers: {
        //   token:getToken()
        // },
        // customInsert:async (res, insertFn)=> {
        //   let {code,data,msg}=res;
        //   if(code===203) {
        //     proxy.$modal.msgError(msg||"登陆失效，请重新登陆！");
        //     userStore.logOut().then(() => {
        //       router.push({path:"/login"});
        //     })
        //     return;
        //   }
        //   if(code!=1) return proxy.$modal.msgError(msg||"上传错误！");
        //   insertFn(data[0].url, data[0].name, data[0].url)
        // },
        // // 上传错误，或者触发 timeout 超时
        // onError:(file, err, res)=> {  // TS 语法
        //   proxy.$modal.msgError(`上传出错：${err}，${props.imgSize>0?`《请注意，最大可上传 ${props.imgSize}M 图片》`:""}`);
        // },
        customBrowseAndUpload:(fun)=>{
          insertImgFn=fun;
          imgIndexRef.value.showOpen()
        }
      },
      uploadVideo:{
        // server: import.meta.env.VITE_APP_BASE_HOST+"/file/file",
        // fieldName:"file",
        // maxFileSize: props.videoSize * 1024 * 1024,//最大3M
        // headers: {
        //   token:getToken()
        // },
        // customInsert:async (res, insertFn)=> {
        //   let {code,data,msg}=res;
        //   if(code===203) {
        //     proxy.$modal.msgError(msg||"登陆失效，请重新登陆！");
        //     userStore.logOut().then(() => {
        //       router.push({path:"/login"});
        //     })
        //     return;
        //   }
        //   if(code!=1) return proxy.$modal.msgError(msg||"上传错误！");
        //   insertFn(data[0].url)
        // },
        // // 上传错误，或者触发 timeout 超时
        // onError:(file, err, res)=> {  // TS 语法
        //   proxy.$modal.msgError(`上传出错：${err}，${props.videoSize>0?`《请注意，最大可上传 ${props.videoSize}3M 视频》`:""}`);
        // },
        customBrowseAndUpload:(fun)=>{
          insertVideoFn=fun;
          videoIndexRef.value.showOpen()
        }
      }
    }
  }
  function imgAdminRes(res){
    res.map(item=>insertImgFn(proxy.fileHost+item.url,item.name,proxy.fileHost+item.url))
  }
  function videoAdminRes(res){
    res.map(item=>insertVideoFn(proxy.fileHost+item.url))
  }
  //修改触发
  function onChange(){
    emit('update:modelValue', html.value);
    // emit("htmlChange",{html:html.value!=="<p><br></p>"?html.value:""});
  }
  function onCreated(editor) {
    editorRef.value = editor;
  }
  // 组件销毁时，也及时销毁编辑器
  onBeforeUnmount(() => {
    const editor = editorRef.value
    if (editor == null) return
    editor.destroy()
  });
</script>

<style scoped>

</style>
