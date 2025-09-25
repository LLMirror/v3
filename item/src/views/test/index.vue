<template>
  <div class="app-container table-height-auto">
    <el-text style="margin-bottom: 10px;display: inline-block" size="large" type="primary">当前展示全局组件FormScreen，测试账号名的输入框搜索可联动下方数据，其他为展示案例。常用的筛选可直接使用此组件，通过options配置即可<el-text type="danger" size="large">（组件默认配合分页的”UsePagination“使用，会自动传入参数。若不是配合”UsePagination“使用，也可通过@search获取对应的筛选参数）</el-text> </el-text>
    <FormScreen :options="formOptions" @search="pageSearch" @reset="pageReset" @change="onChange" @input="onInput">
      <template #slot1>
        <el-form-item label="插槽自定义">
          <el-input v-model="dataParams.slot1" placeholder="插槽自定义的组件" />
        </el-form-item>
      </template>
    </FormScreen>
    <el-text style="margin: 20px 0 10px;display: inline-block" size="large" type="primary">多账号理解：通过每个用户可分配不同账号归属来区分，如果你现在属于”账号1“的用户，那你新增的数据只能给属于”账号1“的用户们管理。不属于同个账号归属是看不见对方数据的。<el-text type="danger" size="large">（admin总管理没有账号归属说法。演示需要 默认《第一家店铺》）</el-text></el-text>
    <el-row class="mb10" :gutter="10" >
      <el-col :span="1.5">
        <el-button
            type="primary"
            plain
            icon="Plus"
            @click="handleAdd"
        >新增</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button
            type="info"
            plain
            icon="Download"
            @click="importEvent"
        >导入</el-button>
      </el-col>
      <el-col :span="1.5" v-loading="loading">
        <el-button
            type="success"
            plain
            icon="Upload"
            @click="exportEvent"
        >导出</el-button>
      </el-col>
    </el-row>
    <el-table v-loading="tableLoading" :data="dataList" >
      <el-table-column label="编号" align="center" prop="id" />
      <el-table-column label="测试账号名称" align="center" prop="name" :show-overflow-tooltip="true"/>
      <el-table-column label="归属的多账号" align="center" prop="moreId" >
        <template #default="scope">
          <TagView :value="scope.row.moreId" :options="moreList" keyValue="id" keyLabel="name"></TagView>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" :show-overflow-tooltip="true" />
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
    <el-dialog title="测试数据" v-model="open" width="500px" append-to-body>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="测试账号名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入测试账号名称" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button @click="open=false">取 消</el-button>
          <el-button type="primary" @click="submitForm">确 定</el-button>
        </div>
      </template>
    </el-dialog>
    <HandleImport ref="handleImportRef" url="/tests/importTests" @importRes="importRes" :downloadApi="downloadTemplate"></HandleImport>
  </div>
</template>

<script setup>
  import { addTests, getTests, upTests, delTests ,downloadTemplate,exportTest} from "@/api/tests";
  import { getMoreAll } from '@/api/system';
  import HandleImport from "@/components/handleImport";
  import UsePagination from "@/hooks/UsePagination";
  const { proxy } = getCurrentInstance();
  const {initData,dataList,dataParams,total,pageConfig,tableLoading,pageRefresh,pageSearch}=UsePagination();
  const open = ref(false);
  const loading = ref(false);
  const handleImportRef=ref(null);
  const data = reactive({
    form: {},
    queryParams:{},
    rules: {
      name: [{ required: true, message: "名称不能为空", trigger: "blur" }]
    },
  });
  const { form, rules,queryParams } = toRefs(data);
  const moreList=ref([]);
  const selectOptions=ref([{label:"单选测试1",value:1},{label:"单选测试2",value:2}]);
  const multipleOptions=ref([{name:"多选测试1",ids:1},{name:"多选测试2",ids:2}]);
  const formOptions=ref([
    {label:"测试账号名称",type:'FormInput',prop:'name',placeholder:'请输入测试名称'},
    {
      label:"单选选择器",
      type:'FormSelect',
      prop:'select',
      options: selectOptions.value,
      placeholder:'请选择 单选选择器'
    },
    {
      label:"多选选择器",
      type:'FormSelect',//区分不同组件
      prop:'multiples',//为筛选的属性名
      options: multipleOptions.value,
      placeholder:'请选择 多选选择器',
      keyValue:"ids",//为选择器的参数key，默认为value
      keyLabel:"name",//为选择器的显示key，默认为label
      formItemWidth:"400px",//表单项宽度
      modelValue:[],//多选的默认值为[]，单选为string/number
      multiple:true,//为true 多选
      clearable:false,//是否显示清除x图标功能
    },
    {
      label:"单个日期",
      type:'FormDate',
      prop:'date1',
      placeholder:'请选择 单个日期',
      modelValue:"2025-01-23",
      valTime:true//为true时，返回的值带时分秒00:00:00
    },
    {
      label:"范围日期",
      type:'FormDate',
      dateType:"daterange",
      prop:'date2',
      startPlaceholder:'开始日期',
      endPlaceholder:'结束日期',
      modelValue:['2025-01-23','2025-01-25'],//范围的默认值为[]，单个为string
      startProp: 'startTime',//返回的开始时间参数
      endProp: 'endTime'//返回的结束时间参数
    },
    {
      label:"单个日期时间",
      type:'FormDate',
      dateType:"datetime",
      prop:'date3',
      placeholder:'请选择 单个日期时间',
    },
    {
      label:"范围日期时间",
      type:'FormDate',
      dateType:"datetimerange",
      prop:'date4',
      placeholder:'请选择日期时间',
      startPlaceholder:'开始日期时间',
      endPlaceholder:'结束日期时间',
      startProp: 'startTime2',
      endProp: 'endTime2'
    },
    {label:"我是禁用的",type:'FormInput',prop:'disabled',placeholder:'我是禁用的',disabled:true},
    {
      label:"我是插槽自定义",
      prop:'slot1',//可通过插槽自定义prop为插槽名称
    },
  ])
  function handleAdd(){
    open.value=true;
    form.value={};
  }
  async function submitForm(){
    try {
      await proxy.$refs["formRef"].validate();
      loading.value=true;
      form.value.id&&await upTests(form.value);
      !form.value.id&&await addTests(form.value);
      open.value=false;
      proxy.$modal.msgSuccess(form.value.id?"修改成功":"新增成功");
      pageRefresh();
    }finally {
      loading.value=false;
    }
  }
  function handleUpdate(row){
    open.value=true;
    form.value={...row};
  }
  async function handleDelete(row){
    await proxy.$modal.confirm(`是否确定删除数据：${row.name||""}？`);
    await delTests({id:row.id});
    proxy.$modal.msgSuccess("删除成功");
    pageRefresh();
  }
  function importEvent(){
    handleImportRef.value.show();
  }
  function importRes(){
    proxy.$modal.msgSuccess("导入成功！");
    pageRefresh();
  }
  async function exportEvent(){
    await proxy.$modal.confirm(`确认导出数据项吗？`);
    try {
      loading.value=true;
      const res=await exportTest(queryParams.value);
      proxy.downFile(res);
    }finally {
      loading.value=false;
    }
  }
  async function getMoreAllApi(){
    const {data} =await getMoreAll();
    moreList.value=data;
  }
  const pageReset=()=>{
    console.log('点击了重置按钮');
  }
  const onChange=(e)=>{
    console.log('选择器change事件监听',e);
  }
  const onInput=(e)=>{
    console.log('输入框input事件监听',e);
  }
  onMounted(()=>{
    initData(getTests);
    getMoreAllApi();
  })
</script>

<style scoped lang="scss">
/**
 最外层元素拥有class：table-height-auto
 table作为子级默认会自动撑开父级高度溢出滚动
 */
</style>