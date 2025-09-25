<template>
  <el-dialog
      :title="title"
      v-model="open"
      width="750px"
      :close-on-click-modal="false"
      draggable
      :show-close="false"
  >
    <el-row>
      <el-col :span="5" style="text-align: center">
        <div class="menu-box" v-loading="loadingMenu">
          <div class="menu-title" v-if="classTitle">{{classTitle}}</div>
          <el-scrollbar height="300px" class="class-scrollbar">
            <div v-for="(item,index) in menuList" :key="item.name" @click="menuItemEvent(item,index)" class="menu-item" :class="menuIndex==index?'menu-active':''">
              <div class="menu-name">{{item.name}}</div>
              <el-icon v-if="item.id"  @click.stop="showMenuEdit(item,index)" class="menu-icon" color="#409eff"><Edit /></el-icon>
            </div>
            <div class="menu-empty" v-if="menuList.length===0">暂无分类，请先添加</div>
          </el-scrollbar>
          <el-button @click="showAddImgMenu" type="primary" style="width: 100%;" size="small">新增分类</el-button>
        </div>
      </el-col>
      <el-col :span="19" v-loading="loading">
        <div class="img-box">
          <div class="img-search">
            <el-input size="small" v-model="imgName" @keyup.enter.native="imgNameSearch" @clear="imgNameSearch" placeholder="请输入文件名" clearable>
              <template #append>
                <el-button type="primary" @click="imgNameSearch" >搜索</el-button>
              </template>
            </el-input>
            <el-checkbox v-if="!disabled&&selectNum===0" class="file-all-check" v-model="fileAllCheck" @change="fileCheckChange" label="全选"  />
          </div>

          <div v-if="menuId&&!disabled" class="add-img-btn" :class="{'add-img-btn-top':!title}">
            <UpFile listType="text" :accept="accept" :size="size" :limit="limit" :fileBtnText="fileBtnText" :multiple="multiple" :upData="{menuId}" :isCompress="isCompress" @uploadSuccessImgAdmin="uploadSuccessImgAdmin" isClearFiles ></UpFile>
          </div>

          <div class="img-list">
            <div class="img-item" v-for="(item,index) in list" :key="index"  style="width: 100px; height: 100px">
              <el-image
                  style="width: 100px; height: 100px"
                  :src="proxy.fileHost+item[itemName]"
                  :preview-teleported="true"
                  fit="contain"
                  v-if="fileUrlType(item[itemName])===1"
              />
              <div v-else-if="fileUrlType(item[itemName])===2">
                <VideoView videoStyle="width: 100px; height: 100px" :url="proxy.fileHost+item[itemName]"></VideoView>
              </div>
              <div v-else class="no-img">
                <div><el-icon size="18"><Document /></el-icon></div>
                <el-text type="primary" size="small">{{formatStrLength(getUrlName(item[itemName]))}}</el-text>
              </div>

              <div v-if="!item.isSelect&&!disabled" @click="selectImg(item,index)" class="img-select-icon" :title="item.name">
                <div v-if="showSelect" class="select-icon"><el-icon v-if="selectArr.includes(item.id)" size="12" color="#409eff"><Select /></el-icon></div>
              </div>
              <div v-else class="img-select-icon no-img-select" :title="item.name" @click="onSelect"></div>

              <div class="img-item-icon">
                <el-icon v-if="fileUrlType(item[itemName])!==3" @click="showImgView(item[itemName],index)" color="#fff" size="14" title="放大" style="cursor: pointer;" ><ZoomIn /></el-icon>
                <el-icon v-else @click="showImgView(item[itemName])" size="14" title="下载" color="#fff" style="cursor: pointer;"><Download /></el-icon>
                <el-icon @click="showDelete(item)" color="#f65276" size="14" title="删除" style="cursor: pointer;" ><Delete /></el-icon>
              </div>
            </div>
          </div>
        </div>
        <div v-if="list.length===0" class="img-empty">当前分类{{msgName}}为空~</div>
       <div  class="img-pagination">
         <pagination
           layout="total,prev, pager, next"
           v-show="total > 0"
           :total="total"
           v-model:page="pageConfig.page"
           v-model:limit="pageConfig.size"
           @pagination="pageRefresh"
           small
           :pager-count="4"
         />
       </div>
      </el-col>
      <el-button v-if="showDeleteMore&&selectArr.length>0" class="flex-all-delete" size="small" type="danger" @click="deleteAll">删除</el-button>
    </el-row>
    <template #footer>
      <div class="dialog-footer">
        <div v-if="selectAccept&&!disabled" class="select_type">选择类型：{{selectAccept}}</div>
        <el-button @click="open = false">关 闭</el-button>
        <el-button v-if="!disabled" type="primary" @click="selectImgRes">确认选择</el-button>
      </div>
    </template>
  </el-dialog>

  <el-dialog
      title="分类管理"
      v-model="menuOpen"
      width="400px"
      append-to-body
      :close-on-click-modal="false"
  >
    <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input  v-model="form.name"  maxLength="6" placeholder="请输入分类名称" />
      </el-form-item>
      <el-form-item label="展示排序" prop="sort">
        <el-input-number  v-model="form.sort" v-number="{value:3,call:(val)=>form.sort=val}" placeholder="请输入展示排序" />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer" v-loading="loadingMenu">
        <el-button @click="menuOpen = false" size="small">关 闭</el-button>
        <el-button @click="delFileMenuApi" v-if="form.id" type="danger" size="small">删除</el-button>
        <el-button type="primary" @click="onsubmitMenu" size="small">{{ form.id?"修改":"新增" }}</el-button>
      </div>
    </template>
  </el-dialog>

  <el-image-viewer  :initial-index="initialIndex" :preview-teleported="true" @close="() => { showViewer = false }" v-if="showViewer" :url-list="urlList" />

  <el-dialog   v-model="videoVisible" size="tiny" append-to-body width="50%">
    <VideoView v-if="videoVisible" :url="videoUrl" videoStyle="width: 100%;height: 700px"></VideoView>
  </el-dialog>

  <el-dialog
    v-model="delVisible"
    title="危险提醒"
    width="520"
  >
    <div>
      <div class="del-name-hint">
        <div>确认删除文件:</div>
        <p>{{urlItem.name||''}}</p>
        <span> ？</span>
      </div>
      <div class="del-name-hint">
        <div>文件完整地址:</div>
        <span>{{proxy.fileHost+urlItem[props.itemName]||''}}</span>
      </div>
      <div class="del-text-hint">
        <div>删除后，所有引用此文件都将失效，并且无法恢复。请再次确认是否删除！</div>
      </div>

    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="delVisible = false">取消</el-button>
        <el-popconfirm title="确定永久删除？" @confirm="deleteFile">
          <template #reference>
            <el-button type="danger" >永久删除</el-button>
          </template>
        </el-popconfirm>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
  import {addFileMenu,getFileMenu,upFileMenu,delFileMenu,getFileBox,addFileBox,delFileBox} from "@/api/components";
  import {fileUrlType,getUrlName,formatStrLength} from "@/utils";
  import UpFile from '@/components/upFile/index.vue';
  import VideoView from './VideoView.vue';
  import UsePagination from "@/hooks/UsePagination.js";
  const {initData,dataList:list,pageSearch,total,setDataParams,setPageConfig,pageConfig,pageRefresh,callFun}=UsePagination();
  const props=defineProps({
    //接收字符串："url,url,url"    数组：[{url:""},{url:""}]或者["url","url"]
    modelValue: [String, Array],
    //modelValue返回和接收格式，string 返回"url,url,url" ；arrayStr 返回["url","url"] ； arrayObj 返回[{url:""},{url:""}]
    runType:{
      type:String,
      default:"arrayObj"
    },
    //是否开启多账户区分(开启后数据会根据不同账号进行区分)
    isMore:{
      type:Boolean,
      default:false
    },
    //选择文件的数量 为0不限制
    selectNum:{
      type:Number,
      default:0
    },
    //文件的属性名称
    itemName:{
      type:String,
      default:"url"
    },
    //上传类型，为空不限制 .jpg,.png
    accept:{
      type:String,
      default:""
    },
    //可选择的类型，为空不限制 .jpg,.png
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
    //是否禁用（不可选）
    disabled:{
      type:Boolean,
      default: false
    },
    //文件是否需要压缩
    isCompress:{
      type:Boolean,
      default: false
    },
    //是否显示删除多个的按钮
    showDeleteMore:{
      type:Boolean,
      default: true
    },
    //是否需要根据类型查询文件数据。1图片；2视频；3其他。为空是全部
    moreFileNum:{
      type: Number||undefined,
      default: undefined
    },
    //标题，为空不显示
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
    //上传按钮文字
    fileBtnText:{
      type: String,
      default: '点击上传'
    },
    //提示名称
    msgName:{
      type: String,
      default: '文件'
    }
  })
  const {proxy}=getCurrentInstance();
  const emit=defineEmits(['update:modelValue','imgAdminRes']);
  const open = ref(false);
  const menuOpen = ref(false);
  const menuIndex=ref(0);
  //用来判断如果编辑的是已经选中的，隐藏删除按钮
  const menuEditIndex=ref(0);
  const menuId=ref(0);
  const menuList=ref([]);
  const loading = ref(false);
  const loadingMenu = ref(false);
  const showViewer = ref(false)
  const initialIndex=ref(0);
  const urlList = ref([]);
  //外部已经存有的文件数量
  const existNum = ref(0);
  const imgName=ref('');
  const videoVisible=ref(false);
  const videoUrl=ref('');
  const delVisible=ref(false);
  const urlItem=ref({});
  const fileAllCheck=ref(false);
  const selectArr=ref([]);
  const data = reactive({
    form: {},
    rules: {
      name: [
        { required: true, message: "分类名称不能为空", trigger: "blur" }
      ]
    }
  });
  const { form, rules} = toRefs(data);
  watch(() => props.modelValue, val => {
    if (val) {
      const arr = Array.isArray(val) ? val : props.modelValue.split(",");
      existNum.value = arr.length;
    } else {
      return existNum.value=0;
    }
  },{ deep: true, immediate: true });
  watch(()=>list.value,val=>{
    urlList.value=val.filter(item=>fileUrlType(item[props.itemName])===1).map(t=>proxy.fileHost+t[props.itemName]);
  })
  // 处理可选择的文件
  callFun.lastCallback=()=>{
    //新数据回来选择只保留新数据有的
    selectArr.value=selectArr.value.filter(item=>list.value.findIndex(t=>t.id===item)>=0);
    if(props.selectAccept){
      list.value.forEach(item=>{
        const extensions = props.selectAccept.split(',').map(ext => ext.replace('.', '\\.')).join('|');
        const regex = new RegExp(`(${extensions})$`, 'i');
        item.isSelect=!regex.test(item[props.itemName]);
      })
    }
    fileAllCheckWatch()
  }
  //如果只需要选择一张
  const showSelect = computed(() => {
    return props.selectNum === 0 || props.selectNum-existNum.value>1;
  });
  const fileCheckChange=(val)=>{
    if(val) {
      selectArr.value=list.value.filter(item=>!item.isSelect).map(item=>item.id);
      if(selectArr.value.length===0) fileAllCheck.value=false;
      return 
    }
    selectArr.value=[];
  }
  const imgNameSearch=()=>{
    setApiParams()
    pageSearch();
  }
  const searchFile=()=>{
    imgName.value='';
    fileAllCheck.value=false;
    setApiParams()
    pageSearch();
  }
  async function getFileMenuApi(){
    try {
      loadingMenu.value=true;
      const {data}=await getFileMenu({isMore:props.isMore});
      menuList.value=[{name:props.classAllName,id:''},...data];
      return menuList.value;
    }finally {
      loadingMenu.value=false;
    }
  }
  const setApiParams = () => {
    setDataParams({menuId:menuId.value,name:imgName.value,moreFileNum:props.moreFileNum,isMore:props.isMore});
  }
  async function getList(){
    try {
      loading.value=true;
      setPageConfig({size:15})
      setApiParams()
      fileAllCheck.value=false;
      await initData(getFileBox);
    }finally {
      loading.value=false;
    }

  }
  function showAddImgMenu(){
    menuOpen.value=true;
    form.value={sort:0}
  }
  async function onsubmitMenu(){
    await proxy.$refs['formRef'].validate();
    try {
      loadingMenu.value=true;
      const {id}=form.value;
      id&&await upFileMenu({...form.value});
      if(!id){
        const {data}=await addFileMenu({...form.value,isMore:props.isMore});
        menuId.value=data.insertId;
        imgName.value='';
        getList();
      }
      proxy.$modal.msgSuccess(id?"修改成功":"新增成功！")
      menuOpen.value=false;
      await getFileMenuApi();
      filterMenuIndex()
    }finally {
      loadingMenu.value=false;
    }
  }
  function menuItemEvent(row,index){
    menuIndex.value=index;
    menuId.value=row.id;
    searchFile()
  }
  function showMenuEdit(row,index){
    form.value={...row};
    menuEditIndex.value=index;
    menuOpen.value=true;
  }
  async function delFileMenuApi(){
    await proxy.$modal.confirm(`确认删除分类：${form.value.name||''} ？`)
    try {
      loadingMenu.value=true;
      await delFileMenu(form.value);
      proxy.$modal.msgSuccess("删除成功！");
      menuOpen.value=false;
      await getFileMenuApi();
      imgName.value='';
      //如果删除的是选中的,默认选中第一个
      if(menuEditIndex.value==menuIndex.value){
        menuEditIndex.value=menuIndex.value=0;
        menuId.value=menuList.value[0].id;
        searchFile()
      }else filterMenuIndex()
    }finally {
      loadingMenu.value=false;
    }
  }
  //选择跟随
  function filterMenuIndex(){
    const res=menuList.value.findIndex(item=>item.id==menuId.value);
    if(res!==-1){
      menuEditIndex.value=menuIndex.value=res
    }else {
      menuEditIndex.value=menuId.value=0;
      menuId.value=menuList.value[0].id;
      searchFile();
    }
  }
  async function uploadSuccessImgAdmin(fileList){
    try {
      loading.value=true;
      await addFileBox({imgArr:fileList.map(t=>({...t,menuId:menuId.value,type:fileUrlType(t.url)})),isMore:props.isMore});
      fileAllCheck.value=false;
      pageRefresh();
    }finally {
      loading.value=false;
    }
  }
  function showImgView(url){
    const hostUlr=proxy.fileHost+url;
    const urlIndex=urlList.value.findIndex(item=>item===hostUlr);
    if(urlIndex>=0) initialIndex.value=urlIndex;
    switch (fileUrlType(hostUlr)) {
      case 1:
        showViewer.value=true;
        break;
      case 2:
        videoUrl.value=hostUlr;
        videoVisible.value=true;
        break;
      case 3:
        window.open(hostUlr, '_blank');
        break;
    }
  }
  function showDelete(item){
    urlItem.value=item;
    delVisible.value=true;
  }
  async function deleteFile(){
    // await proxy.$modal.confirm(`如果此文件已经被引用，删除后将会全部失效。请确认是否删除？`,"删除提示");
    try {
      loading.value=true;
      await delFileBox({id:[urlItem.value.id]});
      delVisible.value=false;
      pageRefresh();
      proxy.$modal.msgSuccess("删除成功！");
    }finally {
      loading.value=false;
    }
  }
  function selectImg(item){
    const selectIndex=selectArr.value.findIndex(t=>t===item.id);
    if(selectIndex>=0){
      selectArr.value.splice(selectIndex,1);
    }else {
      if(props.selectNum!==0)if(selectArr.value.length>=(props.selectNum-existNum.value)) return proxy.$modal.msgError(`一次性最多选择${props.selectNum-existNum.value}个${props.msgName}`);
      selectArr.value.push(item.id);
    }
    fileAllCheckWatch()
    //只需要一张直接默认确认选择
    if(!showSelect.value) selectImgRes();
  }
  function selectImgRes(){
    if(selectArr.value.length===0) return proxy.$modal.msgError(`请先选择${props.msgName}`);
    const res=selectArr.value.reduce((item,cur)=>[...item,...list.value.filter(t=>t.id===cur)],[]);
    selectArr.value=[];
    emit("update:modelValue", listToString(res));
    emit("imgAdminRes", listToString(res));
    open.value=false;
  }
  const deleteAll=async ()=>{
    await proxy.$modal.confirm(`是否确定删除 已选 ${props.msgName} ！！！`);
    try {
      loading.value=true;
      await delFileBox({id:selectArr.value});
      delVisible.value=false;
      pageRefresh();
      proxy.$modal.msgSuccess("删除成功！");
    }finally {
      loading.value=false;
    }
  }
  const fileAllCheckWatch=()=>{
    const selectFilter=list.value.filter(item=>!item.isSelect);
    if(selectFilter.length>0) fileAllCheck.value=selectFilter.length===selectArr.value.length;
  }
  // 对象转成指定字符串分隔
  function listToString(list) {
    switch (props.runType) {
      case "string":
        return list.map(t=>t[props.itemName]).join(',');
        break;
      case "arrayStr":
        return list.map(t=>t[props.itemName]);
        break;
      case "arrayObj":
        return list;
        break;
      default :
        return ""
    }
  }
  function onSelect(){
    proxy.$modal.msgError(`当前配置禁止选择此文件`);
  }
  async function showOpen(){
    await getFileMenuApi()
    if(menuList.value.length>0) menuId.value=menuList.value[menuIndex.value].id;
    getList();
    open.value=true;
  }
  defineExpose({showOpen})

</script>

<style lang="scss" scoped>
  .menu-box{
    text-align: center;
    padding: 0 10px;
    border-right: 2px dashed #dedede;
    .menu-title{
      font-weight: 700;
      font-size: 16px;
      margin-left: -10px;
      margin-bottom: 15px;
    }
    .class-scrollbar{
      margin-bottom: 20px;
    }
    .menu-empty{
      font-size: 12px;
      margin-top: 100px;
      text-align: center;
    }
    .menu-item{
      position: relative;
      padding: 10px;
      border-top: 1px solid #e5e5e5;
      cursor: pointer;
      .menu-name{
        font-size: 12px;
        line-height: 20px;
        margin-top: 2px;
      }
      .menu-icon{
        position: absolute;
        top: 2px;
        right: 0;
      }
    }
    .menu-active{
      font-weight: 700;
      color: #409eff;
      background: #ecf5ff;
    }
  }
  .img-empty{
    color: #999;
    text-align: center;
    margin-top: 100px;
  }
  .img-box{
    position: relative;
    .img-search{
      position: absolute;
      top: -45px;
      left: 0px;
      z-index: 19;
      width: 230px;
      transform: scale(.9);
    }
    .file-all-check{
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      right: -60px;
    }
    .add-img-btn{
      text-align: right;
      position: absolute;
      top: -58px;
      right: -13px;
      z-index: 9;
    }
    .add-img-btn-top{
      top: -35px;
    }
    :deep(.el-upload-list){
      background: #f1f1f1;
      border-radius: 3px;
    }
    .img-list{
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      .img-item{
        margin-left: 10px;
        margin-bottom: 10px;
        position: relative;
        box-shadow: 0 0 2px 1px #e0e0e0;
        overflow: hidden;
        border-radius: 2px;
        &:last-child{
          margin-right: 0;
        }
        .no-img{
          text-align: center;
          padding: 5px;
        }
        .img-item-icon{
          position: absolute;
          width: 100%;
          height: 25px;
          left: 0;
          bottom: 0;
          z-index: 9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 10px;
          background: rgb(0 0 0 / 50%);
        }
        .img-select-icon{
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          cursor: pointer;
          .select-icon{
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 15px;
            height: 15px;
            border: 1.5px solid #409eff;
            border-radius: 2px;
          }
        }
        .no-img-select{
          background: rgb(0 0 0 / 65%);
        }
      }
    }
  }
  .img-pagination{
    position: absolute;
    bottom: 10px;
    right: 10px;
    transform: scale(0.8);
  }
  .flex-all-delete{
    position: absolute;
    bottom: 0;
    left: 160px;
  }
  .del-name-hint{
    display: flex;
    align-items: center;
    font-size: 14px;
    margin-top: 20px;
    font-weight: 700;
    div{
      color: #333;
      min-width: 110px;
    }
    p{
      color: #d00202;
      margin: 0 10px 0 0;
    }
    span{
      display: inline-block;
      max-width: 350px;
      white-space: pre-wrap;
    }
  }
  .del-text-hint{
    color: #d00202;
    font-size: 12px;
    text-align: center;
    margin-top: 20px;

  }
  .select_type{
    font-size: 12px;
    color: #d00202;
    position: absolute;
    bottom: 20px;
    left: 20px;
  }
</style>
