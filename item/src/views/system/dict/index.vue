<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增</el-button>
    <el-table v-loading="tableLoading" :data="dataList" >
      <el-table-column label="字典编号" align="center" prop="id" />
      <el-table-column label="字典名称" align="center" prop="name" :show-overflow-tooltip="true"/>
      <el-table-column label="字典类型" align="center" >
        <template #default="scope">
          <el-link type="primary" @click="goDictData(scope.row)"> {{scope.row.type}}
            <el-icon style="margin-left: 10px"><View /></el-icon>
          </el-link>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
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
    <el-dialog :title="title" v-model="open" width="500px" append-to-body>
      <el-form ref="ruleForm" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="字典名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入字典名称" />
        </el-form-item>
        <el-form-item label="字典类型" prop="type">
          <el-input v-model="form.type" placeholder="请输入字典类型" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="cancel">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Dict">
import {getDict,addDict,upDict,delDict} from "@/api/system/index.js";
import {useRouter} from "vue-router";
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const router=useRouter();
const { proxy } = getCurrentInstance();
const formOptions=ref([
  {label:"字典名称",prop:"name",type:"FormInput",placeholder:"请输入字典名称"},
  {label:"字典类型",prop:"type",type:"FormInput",placeholder:"请输入字典类型"}
])
const open = ref(false);
const loading = ref(false);
const title = ref("");
const data = reactive({
  form: {},
  rules: {
    name: [{ required: true, message: "字典名称不能为空", trigger: "blur" }],
    type: [{ required: true, message: "字典类型不能为空", trigger: "blur" }]
  },
});
const { form, rules } = toRefs(data);
/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}
/** 表单重置 */
function reset() {
  form.value = {
    id: undefined,
    name: undefined,
    type: undefined,
    remark: undefined
  };
  proxy.resetForm("ruleForm");
}
/** 新增按钮操作 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = "添加字典";
}

/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  form.value={...row};
  open.value=true;
  title.value = "修改字典";
}
/** 提交按钮 */
async function submitForm() {
  await proxy.$refs["ruleForm"].validate();
  loading.value=true;
  try {
    !form.value.id&&await addDict(form.value);
    form.value.id&&await upDict(form.value);
    proxy.$modal.msgSuccess(form.value.id? "修改成功" : "新增成功");
    open.value = false;
    pageRefresh();
  }finally {
    loading.value=false;
  }
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await proxy.$modal.confirm(`是否删除字典：${row.name}？`)
  await delDict({id:row.id})
  pageRefresh()
  proxy.$modal.msgSuccess("删除成功");
}
function goDictData(row){
  router.push({path:'/system/dict/dictData',query:{id:row.id}})
}
onMounted(()=>{
  initData(getDict)
})
</script>
