<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增图片</el-button>
    <el-table v-loading="tableLoading" :data="dataList" >

      <el-table-column label="编号" align="center" prop="id" width="100" />
      <el-table-column label="图片" align="center" prop="dictSort" >
        <template #default="scope">
          <div class="img-box">
            <div v-for="t in imgEvent(scope.row)" :key="t.id">
              <el-image
                  style="width: 100px; height: 100px"
                  :src="proxy.fileHost+t.url"
                  :preview-src-list="[proxy.fileHost+t.url]"
                  fit="cover"
                  :preview-teleported="true"
              >
              </el-image>
            </div>
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
    <el-dialog title="图片上传" v-model="open" width="665px" append-to-body>
      <template #footer>
        <div class="flex-box">
          <UpFile ref="upFileRef" v-model="fileList" runType="arrayObj"  multiple :limit="3" :size="1" accept=".jpg,.png,.gif,.jpeg,.webp"></UpFile>
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
import {addFile,upFileReq,getImg,delFile} from "@/api/components/index.js";
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const { proxy } = getCurrentInstance();
const formOptions=ref([
  {label:"编号",prop:"id",type:"FormInput",placeholder:"请输入编号"},
])
const open = ref(false);
const loading = ref(false);
const fileList=ref([]);
const upFileRef=ref(null);
let fileId;
function handleAdd(){
  open.value=true;
  fileId=undefined;
  fileList.value=[];
}
function handleUpdate(row){
  open.value=true;
  fileId=row.id;
  fileList.value=getImgUrl(row);
}
async function submitForm(){
  //由于绑了model那fileList.value就会自动同步（为了演示，这里使用调用父组件也可以拿到数据）
  const fileRes=upFileRef.value.getFileRes();//更方便一点可将此处更换成fileList.value会更好
  if(fileRes.length===0) return proxy.$modal.msgError("请上传图片！！！");
  try {
    loading.value=true;
    !fileId&&await addFile({type:1,val:JSON.stringify(fileRes)});
    fileId&&await upFileReq({id:fileId,val:JSON.stringify(fileRes)});
    pageRefresh();
    proxy.$modal.msgSuccess(fileId?"修改成功":"新增成功");
    open.value=false;
  }finally {
    loading.value=false;
  }
}
async function handleDelete(row) {
  await proxy.$modal.confirm("确认删除当前图片数据吗？");
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
function getImgUrl(row){
  try {
    const arr= JSON.parse(row.val).map(t=>t.url);
    return arr.join(",");
  }catch (e) {
    return ""
  }
}
onMounted(()=>{
  initData(getImg)
})
</script>

<style scoped lang="scss">
.flex-box{
  text-align: center;
}
.img-box{
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: auto;
  >div{
    margin: 0 5px;
  }
}
</style>