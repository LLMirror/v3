<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="search" initGetFormData :showRefresh="false"></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增</el-button>

    <el-table v-loading="loading" :data="typeList" >
      <el-table-column label="字典项目标签" align="center" prop="label">
        <template #default="scope">
          <span v-if="scope.row.dictClass == '' || scope.row.dictClass == 'default'">{{scope.row.label}}</span>
          <el-tag v-else :type="scope.row.dictClass == 'primary' ? '' : scope.row.dictClass">{{scope.row.label}}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="字典项目键值" align="center" prop="value" />
      <el-table-column label="字典项目排序" align="center" prop="dictSort" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <el-tag v-if="scope.row.status==1">显示</el-tag>
          <el-tag v-else type="danger">隐藏</el-tag>
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

    <!-- 添加或修改参数配置对话框 -->
    <el-dialog :title="title" v-model="open" width="600px" append-to-body>
      <el-form ref="ruleForm" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="归属字典" prop="dictName">
          <el-input v-model="form.dictName" :disabled="true" />
        </el-form-item>
        <el-form-item label="数据标签" prop="label">
          <el-input v-model="form.label" placeholder="请输入数据标签" />
        </el-form-item>
        <el-form-item label="数据键值" prop="value">
          <el-input v-model="form.value" placeholder="请输入数据键值" />
        </el-form-item>
        <el-form-item label="显示排序" prop="dictSort">
          <el-input-number v-model="form.dictSort" controls-position="right" :min="0" />
        </el-form-item>
        <el-form-item label="回显样式" prop="listClass">
          <el-select v-model="form.dictClass">
            <el-option
                v-for="item in listClassOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio
                v-for="dict in statusOptions"
                :key="dict.dictValue"
                :label="dict.dictValue"
            >{{dict.dictLabel}}</el-radio>
          </el-radio-group>
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

<script setup name="DictData">
import {getDictItem,getDictAll,addDictItem,upDictItem,delDictItem} from "@/api/system/index.js";
import {useRouter,useRoute} from "vue-router";
const router=useRouter();
const route=useRoute();
const { proxy } = getCurrentInstance();
const typeList = ref([]);
const dictList = ref([]);
const open = ref(false);
const loading = ref(false);
const title = ref("");
const dictId=Number(route.query.id);
const dictName=ref("");
const listClassOptions= [
  {
    value: "default",
    label: "默认"
  },
  {
    value: "primary",
    label: "主要"
  },
  {
    value: "success",
    label: "成功"
  },
  {
    value: "info",
    label: "信息"
  },
  {
    value: "warning",
    label: "警告"
  },
  {
    value: "danger",
    label: "危险"
  }
];
const statusOptions=[
  {dictLabel:"显示",dictValue:1},
  {dictLabel:"隐藏",dictValue:0},
]
const formOptions=computed(()=>{
  return [
    {label:"归属字典",prop:"dictId",type:"FormSelect",options:dictList.value,keyLabel:'name',keyValue:'id',modelValue:dictId,clearable:false,placeholder:"请选择归属字典"},
    {label:"字典项目标签",prop:"label",type:"FormInput",placeholder:"请输入字典项目标签"},
    {label:"字典项目键值",prop:"value",type:"FormInput",placeholder:"请输入字典项目键值"}
  ]
})
const data = reactive({
  form: {},
  queryParams: {},
  rules: {
    label: [
      { required: true, message: "数据标签不能为空", trigger: "blur" }
    ],
    value: [
      { required: true, message: "数据键值不能为空", trigger: "blur" }
    ],
    dictSort: [
      { required: true, message: "数据顺序不能为空", trigger: "blur" }
    ]
  },
});

const { queryParams, form, rules } = toRefs(data);

/** 查询字典项目列表 */
async function getDictItemApi() {
  loading.value = true;
  try {
    let {data}=await getDictItem(queryParams.value);
    typeList.value = data;
  }finally {
    loading.value = false;
  }
}
/** 查询字典列表 */
async function getDictAllApi() {
  let {data}=await getDictAll();
  dictList.value = data;
  setDictName();
}
/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}
/** 表单重置 */
function reset() {
  form.value = {
    dictId:queryParams.value.dictId,
    dictName:dictName.value,
    label:undefined,
    value:undefined,
    dictSort:0,
    dictClass:undefined,
    status:1,
    remark:undefined
  };
  proxy.resetForm("ruleForm");
}
/** 搜索按钮操作 */
function search(data){
  queryParams.value={...queryParams.value,...data};
  getDictItemApi();
  setDictName();
}

const setDictName=()=>{
  let arr=dictList.value.filter(t=>t.id==queryParams.value.dictId);
  dictName.value=arr.length==0?"":arr[0].name;
}

/** 新增按钮操作 */
function handleAdd() {
  reset();
  open.value = true;
  title.value = "添加字典项目";
}
/** 修改按钮操作 */
function handleUpdate(row) {
  reset();
  form.value={...row};
  form.value.dictName=dictName.value
  open.value=true;
  title.value = "修改字典项目";
}
/** 提交按钮 */
async function submitForm() {
  await proxy.$refs["ruleForm"].validate();
  loading.value=true;
  try {
    !form.value.id&&await addDictItem(form.value);
    form.value.id&&await upDictItem(form.value);
    proxy.$modal.msgSuccess(form.value.id? "修改成功" : "新增成功");
    open.value = false;
    getDictItemApi();
  }finally {
    loading.value=false;
  }
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await proxy.$modal.confirm(`是否删除字典项目：${row.label}？`)
  await delDictItem({id:row.id})
  getDictItemApi();
  proxy.$modal.msgSuccess("删除成功");
}


onMounted(async () => {
  await getDictAllApi();
})
</script>
