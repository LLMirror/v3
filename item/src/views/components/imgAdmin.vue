<template>
  <div class="app-container">
    <div class="page-title">文件管理模式可以追溯文件来源，建议使用这种方式</div>
    <div>
      <div class="title">默认状态（长按可拖拽排序）</div>
      <FileList v-model="form.imgUrl1" accept=".jpg,.png,.jpeg,.webp,.gif,.svg,.bmp,.apng" @draggableEnd="draggableEnd"></FileList>
    </div>
    <hr>
    <div>
      <div class="title">不同尺寸展示</div>
      <FileList v-model="form.imgUrl2" accept=".jpg,.png,.jpeg,.webp,.gif,.svg,.bmp,.apng" runType="arrayStr" imgStyle="width: 200px; height: 100px" hint="建议尺寸：宽:200px；高:100px" ></FileList>
    </div>
    <hr>
    <div>
      <div class="title">v-model 不同数据格式（限制选择图片数量3张）图片自适应展示</div>
      <FileList v-model="form.imgUrl3" accept=".jpg,.png,.jpeg,.webp,.gif,.svg,.bmp,.apng" runType="arrayObj" :selectNum="3" fit="scale-down" imgStyle="width: 200px; height: 100px" hint="建议尺寸：宽:200px；高:100px" msgName="图片"></FileList>
    </div>
    <div>
      <div class="title">上传不限制类型，限制文件大小最大上传 1m</div>
      <FileList v-model="form.imgUrl4" :size="1" runType="arrayObj" title="可上传任何文件" classTitle="文件分类" fileBtnText="文件上传"></FileList>
    </div>
    <div>
      <div class="title">限制选择类型（.jpg）</div>
      <FileList v-model="form.imgUrl6" :size="1" selectAccept=".jpg" runType="arrayObj" title="限制选择类型" classTitle="文件分类"></FileList>
    </div>
    <div>
      <div class="title">有数据触发禁用状态</div>
      <FileList v-model="form.imgUrl7" :disabled="form.imgUrl7.length!==0" :size="1" runType="arrayObj" ></FileList>
    </div>
    <div>
      <div class="title">文件列表只查询图片类型</div>
      <FileList v-model="form.imgUrl8" :size="1" :moreFileNum="1" runType="arrayObj" title="只有图片" classTitle="图片分类"></FileList>
    </div>
    <hr>
    <div>
      <div class="title">直接通过按钮调起弹窗</div>
      <el-button type="primary" @click="showImgDialog">打开图片管理弹窗</el-button>
    </div>
    <FileIndex v-model="form.imgUrl5" :size="1" ref="FileIndexRef" @imgAdminRes="imgAdminRes"></FileIndex>
  </div>
</template>

<script setup>
  import FileList from "@/components/FileBox/FileList.vue";
  import FileIndex from "@/components/FileBox/index.vue";
  const {proxy}=getCurrentInstance();
  const form=reactive({
    imgUrl1:"",
    imgUrl2:"",
    imgUrl3:[],
    imgUrl4:[],
    imgUrl5:[],
    imgUrl6:[],
    imgUrl7:[],
    imgUrl8:[]
  });
  function showImgDialog(){
    proxy.$refs.FileIndexRef.showOpen();
    //会自动更新form.imgUrl4参数，(可通过打印查看数据变化)
  }
  function imgAdminRes(res){
    console.log(res);
    console.log(form.imgUrl5);
    proxy.$modal.msgSuccess("打开F12查看选择的图片数据");
  }
  function draggableEnd(res){
    proxy.$modal.msgSuccess("排序结束了，打开F12查看排序后图片数据");
    console.log('排序结束了',res)
  }
</script>

<style scoped lang="scss">
  .page-title{
    font-size: 24px;
    font-weight: bold;
    text-align: center;
  }
  .title{
    font-size: 18px;
    margin: 20px 0;
  }
</style>
