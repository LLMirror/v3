<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增文件</el-button>
    <el-table v-loading="tableLoading" :data="dataList" >

      <el-table-column label="编号" align="center" prop="id" width="100" />
      <el-table-column label="文件" align="center" prop="dictSort" >
        <template #default="scope">
          <div v-for="t in imgEvent(scope.row)" :key="t.id">
            <el-link type="primary"  target="_blank" :href="proxy.fileHost+t.url">{{t.name}}</el-link>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
      <el-table-column label="操作" align="center" width="160" class-name="small-padding fixed-width">
        <template #default="scope">
          <el-button link size="small" type="primary" icon="Edit" @click="handleUpdate(scope.row)" >修改</el-button>
          <el-button link size="small" type="danger" icon="Delete" @click="handleDelete(scope.row)" >删除</el-button>
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

    <!-- 添加或修改参数配置对话框 -->
    <el-dialog title="文件上传" v-model="open" width="600px" append-to-body>
      <template #footer>
        <div class="flex-box">
          <UpFile v-model="fileList" runType="arrayObj" list-type="text"  multiple :limit="3" :size="1"></UpFile>
        </div>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="open=false">取 消</el-button>
          <el-button type="primary" @click="submitForm">保 存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
  import UpFile from "@/components/upFile/index.vue";
  import {addFile,upFileReq,getFile,delFile} from "@/api/components/index.js";
  import UsePagination from "@/hooks/UsePagination";
  const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
  const { proxy } = getCurrentInstance();
  const formOptions=ref([
    {label:"编号",prop:"id",type:"FormInput",placeholder:"请输入编号"}
  ])
  const open = ref(false);
  const loading = ref(false);
  const fileList=ref([]);
  let fileId;
  function handleAdd(){
    open.value=true;
    fileId=undefined;
    fileList.value="";
  }
  function handleUpdate(row){
    open.value=true;
    fileId=row.id;
    fileList.value=imgEvent(row);
  }
  async function submitForm(){
    //因为runType="arrayObj"，所以fileList.value自动更新的是对象数组[{},{}]
    //console.log(fileList.value)
    const fileRes=fileList.value;
    if(fileRes.length===0) return proxy.$modal.msgError("请上传文件！！！");
    try {
      loading.value=true;
      !fileId&&await addFile({type:2,val:JSON.stringify(fileRes)});
      fileId&&await upFileReq({id:fileId,val:JSON.stringify(fileRes)});
      pageRefresh();
      proxy.$modal.msgSuccess(fileId?"修改成功":"新增成功");
      open.value=false;
    }finally {
      loading.value=false;
    }
  }
  async function handleDelete(row) {
    await proxy.$modal.confirm("确认删除当前文件数据吗？");
    await delFile({id:row.id});
    pageRefresh();
    proxy.$modal.msgSuccess("删除成功");
  }
  function imgEvent(row){
    try {
      return JSON.parse(row.val)
    }catch (e) {
      return []
    }
  }
  onMounted(()=>{
    initData(getFile)
  })
</script>

<style scoped lang="scss">
  .flex-box{
    text-align: center;
  }
</style>
