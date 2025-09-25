<template>
  <div class="app-container table-height-auto">
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增
    </el-button>

    <!-- 表格数据 -->
    <el-table v-loading="tableLoading" :data="dataList">
      <el-table-column label="角色编号" prop="id" width="120" align="center"/>
      <el-table-column label="角色名称" prop="name" align="center">
        <template #default="scope">
          {{ scope.row.name }}
          <el-tag v-if="scope.row.roleKey === 'admin'" size="mini" effect="dark"
          >超级管理员
          </el-tag
          >
        </template>
      </el-table-column>
      <el-table-column label="权限字符" prop="roleKey"/>
      <el-table-column label="创建时间" align="center" prop="createTime">
        <template #default="scope">
          <span>{{ parseTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" class-name="small-padding fixed-width">
        <template #default="scope">
          <div v-if="scope.row.roleKey !== 'admin'">
            <el-tooltip content="修改" placement="top">
              <el-button link type="primary" icon="Edit" size="small" @click="handleUpdate(scope.row)">修改</el-button>
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button link type="danger" icon="Delete" size="small" @click="handleDelete(scope.row)">删除</el-button>
            </el-tooltip>
          </div>
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

    <!-- 添加或修改角色配置对话框 -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form ref="ruleForm" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称"/>
        </el-form-item>
        <el-form-item prop="roleKey">
          <template #label>
                  <span>
                     <el-tooltip content="可用于各种权限判断处理，比如自定义指令：v-hasRole=['权限值']"
                                 placement="top">
                        <el-icon><question-filled/></el-icon>
                     </el-tooltip>
                     权限字符
                  </span>
          </template>
          <el-input v-model="form.roleKey" placeholder="请输入权限字符"/>
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-checkbox v-model="menuExpand" @change="handleCheckedTreeExpand($event, 'menu')">展开/折叠</el-checkbox>
          <el-checkbox v-model="menuNodeAll" @change="handleCheckedTreeNodeAll($event, 'menu')">全选/全不选
          </el-checkbox>
          <el-tree
              class="tree-border"
              :data="menuOptions"
              show-checkbox
              ref="menuRef"
              node-key="id"
              :check-strictly="false"
              empty-text="加载中，请稍候"
              :props="{ label: 'title', children: 'children' }"
          ></el-tree>
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

<script setup name="Role">
import {getRoles, getRouterSystem, addRoles, upRoles, delRoles} from "@/api/system/index.js";
const router = useRouter();
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const {proxy} = getCurrentInstance();
const formOptions=ref([
  {label:"角色名称",prop:"name",type:"FormInput",placeholder:"请输入角色名称"},
  {label:"权限字符",prop:"roleKey",type:"FormInput",placeholder:"请输入权限字符"}
])
const open = ref(false);
const loading = ref(false);
const title = ref("");
const menuOptions = ref([]);
const menuExpand = ref(false);
const menuNodeAll = ref(false);
const menuRef = ref(null);
const data = reactive({
  form: {},
  rules: {
    name: [{required: true, message: "角色名称不能为空", trigger: "blur"}]
  },
});

const { form, rules} = toRefs(data);

async function getRouterSystemApi() {
  const {data} = await getRouterSystem();
  const {routerMenu} = data;
  menuOptions.value = routerMenu;
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await proxy.$modal.confirm(`是否确认删除角色：${row.name}?`);
  await delRoles({id: row.id});
  pageRefresh();
  proxy.$modal.msgSuccess("删除成功");
}

/** 重置新增的表单以及其他数据  */
function reset() {
  if (menuRef.value != undefined) menuRef.value.setCheckedKeys([]);
  menuExpand.value = false;
  menuNodeAll.value = false;
  form.value = {
    id: undefined,
    name: undefined,
    roleKey: undefined
  };
  proxy.resetForm("ruleForm");
}

/** 添加角色 */
function handleAdd() {
  reset();
  getRouterSystemApi();
  open.value = true;
  title.value = "添加角色";
}

/** 修改角色 */
async function handleUpdate(row) {
  reset();
  await getRouterSystemApi();
  const {roles} = row;
  const rolesRes = roles.split(",");
  form.value = {...row};
  open.value = true;
  title.value = "修改角色";
  rolesRes.forEach((v) => {
    nextTick(() => {
      menuRef.value.setChecked(v, true, false);
    });
  });
}

/** 提交按钮 */
async function submitForm() {
  await proxy.$refs["ruleForm"].validate();
  loading.value= true;
  try {
    const roles = menuRef.value.getCheckedNodes(false, true).map(t => t.id);
    if (roles.length === 0) return proxy.$modal.msgError("请选择角色权限！");
    !form.value.id && await addRoles({...form.value, roles: roles.toString()});
    form.value.id && await upRoles({...form.value, roles: roles.toString()});
    proxy.$modal.msgSuccess(form.value.id ? "修改成功" : "新增成功");
    pageRefresh();
    open.value = false;
    reset();
  }finally {
    loading.value= false;
  }
}

/** 树权限（展开/折叠）*/
function handleCheckedTreeExpand(value, type) {
  if (type == "menu") {
    let treeList = menuOptions.value;
    for (let i = 0; i < treeList.length; i++) {
      menuRef.value.store.nodesMap[treeList[i].id].expanded = value;
    }
  }
}

/** 树权限（全选/全不选） */
function handleCheckedTreeNodeAll(value, type) {
  if (type == "menu") {
    menuRef.value.setCheckedNodes(value ? menuOptions.value : []);
  }
}
onMounted(()=>{
  initData(getRoles)
})
</script>
