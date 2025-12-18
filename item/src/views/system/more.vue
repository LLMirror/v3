<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button  class="mb10" icon="Plus" type="primary" plain  @click="openDialog">添加账号</el-button>
    <el-table :data="dataList" v-loading="tableLoading">
      <el-table-column label="编号" align="center" prop="id" />
      <el-table-column label="账号名称" align="center" prop="name">
        <template #default="scope">
          {{scope.row.name}}
        </template>
      </el-table-column>
      <el-table-column label="AppKey" align="center" prop="app_key" />
      <el-table-column label="AppSecret" align="center" prop="app_secret" />
      <el-table-column label="系列" align="center" prop="series" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="创建时间" align="center" prop="createTime"  />
      <el-table-column align="center" label="操作">
        <template #default="scope">
          <el-button link size="small" type="primary" icon="Edit" @click="handleEdit(scope.row)">修改</el-button>
          <el-button link size="small" type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
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

    <el-dialog title="多账号管理" v-model="open" width="40%">
      <el-form class="demo-form-inline" label-width="80px" :model="form" :rules="rules" ref="ruleForm">
        <el-form-item label="账号名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入账号名称" />
        </el-form-item>
        <el-form-item label="AppKey">
          <el-input v-model="form.app_key" placeholder="请输入 AppKey" />
        </el-form-item>
        <el-form-item label="AppSecret">
          <el-input v-model="form.app_secret" placeholder="请输入 AppSecret" />
        </el-form-item>
        <el-form-item label="系列">
          <el-input v-model="form.series" placeholder="请输入系列" />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入备注" />
        </el-form-item>
        
      </el-form>

      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="open=false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="More">
import {addMore, delMore, getMore, upMore} from "@/api/system/index.js";
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const {proxy}=getCurrentInstance();
const formOptions=ref([
  {label:"账户名称",prop:"name",type:"FormInput",placeholder:"请输入账户名称"},
])
const open = ref(false);
const loading = ref(false);
const title = ref("");
const data = reactive({
  form: {},
  rules: {
    name: [
      { required: true, message: '请输入账号名称', trigger: 'blur' },
      { min: 2, max: 30, message: '长度在 2 到 30 个字符', trigger: 'blur' }
    ]
  }
});
const { form, rules } = toRefs(data);
async function submitForm(){
  await proxy.$refs["ruleForm"].validate();
  try {
    loading.value=true;
    !form.value.id&&await addMore(form.value);
    form.value.id&&await upMore(form.value);
    proxy.$modal.msgSuccess(form.value.id? "修改成功" : "新增成功");
    open.value = false;
    pageRefresh();
  }finally {
    loading.value=false;
  }
}

function openDialog(){
  form.value={};
  open.value=true;
}

function handleEdit(row){
  form.value={...row};
  open.value=true;
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await proxy.$modal.confirm(`是否删除多账号：${row.name}？`)
  await delMore({id:row.id})
  pageRefresh();
  proxy.$modal.msgSuccess("删除成功");
}
onMounted(()=>{
  initData(getMore)
})
</script>

<style scoped lang="scss">

</style>