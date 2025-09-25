<template>
  <div>
    <div class="img-list">
      <el-icon class="delete-all" @click="deleteImgAll" v-if="!disabled&&isDeleteIcon&&list.length>1" color="#ce0303" :size="iconSize" title="删除全部" ><Delete /></el-icon>
      <Draggable
          :list="list"
          :force-fallback="true"
          :sort="sort"
          item-key="url"
          @end="draggableEnd"
          animation="300"
      >
        <template #item="{element,index}">
          <div class="img-item"  :style="imgStyle">
            <el-image
                :style="imgStyle"
                :src="proxy.fileHost+element[itemName]"
                :fit="fit"
                :preview-teleported="true"
                v-if="fileUrlType(element[itemName])===1"
            />
            <div v-else-if="fileUrlType(element[itemName])===2">
              <VideoView :videoStyle="imgStyle" :url="proxy.fileHost+element[itemName]"></VideoView>
            </div>
            <div v-else class="no-img">
              <div><el-icon size="20"><Document /></el-icon></div>
              <el-text type="primary">{{formatStrLength(getUrlName(element[itemName]))}}</el-text>
            </div>
            <div class="img-item-icon" :title="getUrlName(element[itemName])" :class="list.length>1?'icon-move':''">
              <el-icon v-if="fileUrlType(element[itemName])!==3" @click="showImgView(element[itemName])" color="#fff" :size="iconSize" title="放大" class="img-item-icon-view" :class="{'img-item-icon-view-mr':disabled}" style="cursor: pointer;" ><ZoomIn /></el-icon>
              <el-icon v-else @click="showImgView(element[itemName])" :size="iconSize" title="下载" color="#fff" class="img-item-icon-view" :class="{'img-item-icon-view-mr':disabled}" style="cursor: pointer;"><Download /></el-icon>

              <el-icon @click="deleteImg(index)" v-if="!disabled" color="#fff" :size="iconSize" title="删除" style="cursor: pointer;" ><Delete /></el-icon>
            </div>
          </div>
        </template>
        <template #footer>
          <div @click="addImg" v-if="selectNumEvent&&!disabled" class="add-icon"  :style="imgStyle">
            <el-icon><Plus /></el-icon>
          </div>
        </template>
      </Draggable>
    </div>
    <el-link type="danger" v-if="hint">{{hint}}</el-link>
  </div>

  <el-image-viewer :initial-index="initialIndex" :preview-teleported="true" @close="() => { showViewer = false }" v-if="showViewer" :url-list="urlList" />
  <FileIndex ref="FileIndexRef" runType="arrayObj" v-model="indexImgList" :selectNum="selectNum" :isMore="isMore" @imgAdminRes="imgAdminRes" :accept="accept" :selectAccept="selectAccept" :size="size" :limit="limit" :multiple="multiple" :disabled="disabled" :title="title" :classTitle="classTitle" :classAllName="classAllName" :fileBtnText="fileBtnText" :moreFileNum="moreFileNum" :msgName="msgName" :isCompress="isCompress" :itemName="itemName"></FileIndex>
  <el-dialog   v-model="videoVisible" size="tiny" append-to-body width="50%">
    <VideoView v-if="videoVisible" :url="videoUrl" videoStyle="width: 100%;height: 700px"></VideoView>
  </el-dialog>
</template>

<script setup>
  import {computed} from "vue";
  import {deepClone,fileUrlType,getUrlName,formatStrLength} from "@/utils";
  import FileIndex from "./index";
  import VideoView from './VideoView.vue'
  //https://www.itxst.com/vue-draggable-next/tutorial.html
  import Draggable from "vuedraggable";
  const props=defineProps({
    //接收字符串："url,url,url"    数组：[{url:""},{url:""}]或者["url","url"]
    modelValue: [String, Array],
    //modelValue返回和接收格式，string 返回"url,url,url" ；arrayStr 返回["url","url"] ； arrayObj 返回[{url:""},{url:""}]
    runType:{
      type:String,
      default:"string"
    },
    //文件的属性名称
    itemName:{
      type:String,
      default:"url"
    },
    //选择个数，为0不限制
    selectNum:{
      type:Number,
      default:0
    },
    //是否禁用
    disabled:{
      type:Boolean,
      default:false
    },
    //文件大小
    imgStyle:{
      type:String,
      default:"width: 100px; height: 100px"
    },
    //文件展示兼容 fill contain cover none scale-down
    fit:{
      type:String,
      default:""
    },
    //是否开启多账户区分(开启后数据会根据不同账号进行区分)
    isMore:{
      type:Boolean,
      default:false
    },
    //提示语，为空不提示
    hint:{
      type:String,
      default:""
    },
    //是否开始拖拽排序
    sort:{
      type:Boolean,
      default:true
    },
    //上传类型，为空不限制
    accept:{
      type:String,
      default:""
    },
    //可选择的类型，为空不限制
    selectAccept:{
      type:String,
      default:""
    },
    //上传文件大小限制，为0不限制   单位M
    size:{
      type:Number,
      default: 0
    },
    //一次性上传数量
    limit:{
      type:Number,
      default: 0
    },
    //上传是否可多选
    multiple:{
      type:Boolean,
      default: true
    },
    //文件是否需要压缩
    isCompress:{
      type:Boolean,
      default: false
    },
    //是否需要根据类型查询文件数据。1图片；2视频；3其他。为空是全部
    moreFileNum:{
      type: Number||undefined,
      default: undefined
    },
    //是否显示删除全部按钮
    isDeleteIcon:{
      type: Boolean,
      default: true
    },
    //操作图标尺寸大小
    iconSize:{
      type: Number,
      default: 18
    },
    //文件框标题，为空不显示
    title:{
      type:String,
      default:"文件库"
    },
    //文件分类，为空不显示
    classTitle:{
      type:String,
      default:"文件分类"
    },
    //文件全部分类名称
    classAllName:{
      type:String,
      default:"全部文件"
    },
    //上传按钮文本
    fileBtnText:{
      type: String,
      default: '点击上传'
    },
    //提示名称
    msgName:{
      type: String,
      default: '文件'
    }

  });
  const {proxy}=getCurrentInstance();
  const emit=defineEmits(['update:modelValue','imgAdminRes','draggableEnd']);
  const showViewer = ref(false)
  const urlList = ref([]);
  const initialIndex=ref(0);
  const list=ref([]);
  //给文件库 v-model
  const indexImgList=ref([]);
  const videoVisible=ref(false);
  const videoUrl=ref('');
  const selectNumEvent=computed(()=>{
    if(props.selectNum===0) return true;
    return list.value.length<props.selectNum;
  })
  watch(() => props.modelValue, val => {
    if (val) {
      switch (props.runType) {
        case "string":
          const arr= val.split(",");
          list.value = arr.map(item => ({ [props.itemName]: item }));
          break;
        case "arrayStr":
          list.value = val.map(item => ({ [props.itemName]: item }));
          break;
        case "arrayObj":
            list.value = val.map(item=>{ return {...item,[props.itemName]: item[props.itemName]}});
          break;
        default:
          list.value = val;
      }
      urlList.value = list.value.filter(item=>fileUrlType(item[props.itemName])===1).map(item =>  proxy.fileHost+item[props.itemName]);
      indexImgList.value=deepClone(list.value);
    } else {
      urlList.value=list.value =[];
      indexImgList.value=[];
      return [];
    }
  },{ deep: true, immediate: true });
  // 对象转成指定字符串分隔
  function listToString(list) {
    switch (props.runType) {
      case "string":
        return list.map(t=>t[props.itemName]).join(',');
      case "arrayStr":
        return list.map(t=>t[props.itemName]);
      case "arrayObj":
        return list;
      default :
        return ""
    }
  }
  //接收文件库选择后的结果，因为监听会出现冲突，使用事件接收
  function imgAdminRes(res){
    list.value=list.value.concat(res);
    urlList.value = list.value.filter(item=>fileUrlType(item[props.itemName])===1).map(item => proxy.fileHost+item[props.itemName]);
    const fileRes=listToString(list.value);
    emit("update:modelValue", fileRes);
    emit("imgAdminRes", fileRes);
  }
  function addImg(){
    proxy.$refs.FileIndexRef.showOpen();
  }
  function showImgView(url){
    const hostUrl=proxy.fileHost+url;
    const urlIndex=urlList.value.findIndex(item=>item===hostUrl);
    if(urlIndex>=0) initialIndex.value=urlIndex;
    switch (fileUrlType(hostUrl)) {
      case 1:
        showViewer.value=true;
        break;
      case 2:
        videoUrl.value=hostUrl;
        videoVisible.value=true;
        break;
      case 3:
        window.open(hostUrl, '_blank');
        break;
    }
  }
  function deleteImg(index){
    list.value.splice(index,1);
    indexImgList.value.splice(index,1);
    emit("update:modelValue", listToString(list.value));
  }
  function deleteImgAll(){
    list.value=[]
    indexImgList.value=[]
    emit("update:modelValue", listToString(list.value));
  }
  function draggableEnd(){
    const fileRes=listToString(list.value);
    emit("update:modelValue", fileRes);
    emit("draggableEnd", fileRes);
  }
</script>

<style scoped lang="scss">
  .img-list{
    position: relative;
    width: fit-content;
    .delete-all{
      margin-bottom: 5px;
      cursor: pointer;
    }
    >div{
      display: flex;
      flex-wrap: wrap;
    }
    .img-item{
      margin-right: 10px;
      margin-bottom: 10px;
      position: relative;
      box-shadow: 0 0 2px 1px #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      &:last-child{
        margin-right: 0;
      }
      .no-img{
        text-align: center;
        padding: 5px;
      }
      .img-item-icon{
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgb(0 0 0 / 50%);
        opacity: 0;
        transition: .5s;
      }
      .img-item-icon-view{
        margin-right: 20%;
        cursor: pointer;
      }
      .img-item-icon-view-mr{
        margin-right: 0;
      }
      .icon-move{
        cursor: move;
      }
      &:hover{
        .img-item-icon {
          opacity: 1;
        }
      }

    }
    .add-icon{
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #dcdfe6;
      cursor: pointer;
      margin-bottom: 10px;
    }
  }
</style>
