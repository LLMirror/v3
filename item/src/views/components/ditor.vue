<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增富文本</el-button>
    <el-table v-loading="tableLoading" :data="dataList" >
      <el-table-column label="编号" align="center" prop="id" width="100" />
      <el-table-column label="富文本" align="center" prop="dictSort" >
        <template #default="scope">
          <el-button size="small" type="success" @click="handleUpdate(scope.row)">点击查看</el-button>
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
    <el-dialog title="富文本" v-model="open" width="1000px" append-to-body>
      <template #footer>
        <div style="text-align: left">
          <WanEditor v-model="htmlVal"></WanEditor>
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
  import {addDitor,getDitor,upDitor,delDitor} from "@/api/components";
  import WanEditor from '@/components/wangeditor';
  import UsePagination from "@/hooks/UsePagination";
  const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
  const { proxy } = getCurrentInstance();
  const open = ref(false);
  const loading = ref(false);
  let htmlVal=ref("");
  let ditorId=undefined;
  const formOptions=ref([
    {label:"编号",prop:"id",type:"FormInput",placeholder:"请输入编号"}
  ])
  async function submitForm(){
    if(!htmlVal.value) return proxy.$modal.msgError("请输入内容！");
    try {
      loading.value=true;
      !ditorId&&await addDitor({val:htmlVal.value});
      ditorId&&await upDitor({id:ditorId,val:htmlVal.value});
      proxy.$modal.msgSuccess(ditorId?"修改成功":"新增成功");
      open.value=false;
      pageRefresh();
    }finally {
      loading.value=false;
    }
  }
  function handleUpdate(row){
    open.value=true;
    ditorId=row.id;
    htmlVal.value=row.val;
  }
  async function handleDelete(row){
    await proxy.$modal.confirm("确认删除当前富文本数据吗？");
    await delDitor({id:row.id});
    pageRefresh();
    proxy.$modal.msgSuccess("删除成功");
  }
  function handleAdd(){
    open.value=true;
    ditorId=undefined;
    htmlVal.value="";
  }
  onMounted(()=>{
    initData(getDitor)
  })
</script>

<style scoped lang="scss">

</style>