<template>
  <div class="app-container table-height-auto">
    <el-button
      type="primary"
      plain
      icon="Plus"
      @click="handleAdd"
      class="mb10"
    >新增</el-button>

    <el-table
        v-loading="loading"
        :data="menuList"
        row-key="id"
        :tree-props="{ children: 'children' }"
    >
      <el-table-column prop="icon" label="菜单名称"  width="200">
        <template #default="scope">
          <svg-icon :icon-class="scope.row.icon" />
          <span style="margin-left: 5px">{{scope.row.title}}</span>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="60" />
      <el-table-column prop="component" label="页面路径" :show-overflow-tooltip="true" />
      <el-table-column prop="pathView" label="路由地址" width="150" />
      <el-table-column prop="roleKey" label="权限字符" />

      <el-table-column label="当前状态" align="center" prop="createTime">
        <template #default="scope">
          <el-tag v-if="scope.row.hidden == 0">正常</el-tag>
          <el-tag v-else type="danger">隐藏</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="类型" align="center" prop="menuType">
        <template #default="scope">
          <el-tag type="warning" v-if="scope.row.menuType == 'M'">目录</el-tag>
          <el-tag type="success" v-if="scope.row.menuType == 'C'">菜单</el-tag>
          <el-tag type="info" v-if="scope.row.menuType == 'F'" >按钮</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="更新时间" align="center" prop="createTime" :formatter="formatTimeStr" />

      <el-table-column label="操作" align="center" class-name="small-padding fixed-width" width="250">
        <template #default="scope">
          <el-button size="small" type="text" icon="EditPen" @click="handleUpdate(scope.row)">修改</el-button>
          <el-button size="small" type="text" icon="Plus" @click="handleAdd(scope.row)">新增</el-button>
          <el-button link size="small" type="danger" icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加或修改菜单对话框 -->
    <el-dialog :title="title" v-model="open" width="780px" append-to-body>
      <el-form ref="ruleForm" :model="form" :rules="rules" label-width="100px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="上级菜单">
              <el-tree-select
                  v-model="form.parentId"
                  :data="menuOptions"
                  :props="{ value: 'id', label: 'title', children: 'children' }"
                  value-key="id"
                  placeholder="选择上级菜单"
                  check-strictly
              />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="菜单类型" prop="menuType">
              <el-radio-group v-model="form.menuType">
                <el-radio label="M">目录</el-radio>
                <el-radio label="C">菜单</el-radio>
                <el-radio label="F">按钮</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="菜单名称" prop="title">
              <el-input v-model="form.title" placeholder="请输入菜单名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType != 'M'">
            <el-form-item>
              <el-input v-model="form.roleKey" placeholder="请输入权限标识" maxlength="100" />
              <template #label>
                        <span>
                           <el-tooltip content="可用于各种权限判断处理，比如自定义指令：v-hasPermi=['权限值']" placement="top">
                              <el-icon><question-filled /></el-icon>
                           </el-tooltip>
                           权限字符
                        </span>
              </template>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType==='C'">
            <el-form-item label="页面名称" prop="name">
              <el-input  placeholder="请输入页面名称（Name）英文" v-model="form.name" >
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType==='C'||form.menuType==='M'">
            <el-form-item label="路由地址" prop="path">
              <template #label>
                        <span>
                           <el-tooltip content="如果是外链则路由地址需要以`http(s)://`开头。正常路由以/开头" placement="top">
                              <el-icon><question-filled /></el-icon>
                           </el-tooltip>路由地址
                        </span>
              </template>
              <el-input placeholder="请输入路由地址（/path）" v-model="form.path" >
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType==='C'">
            <el-form-item label="页面地址" prop="component">
              <el-input  placeholder="请输入页面地址（index/index）" v-model="form.component" clearable>
              </el-input>
              <template #label>
                        <span>
                           <el-tooltip content="填写view目录下的路径，首位不需要带/" placement="top">
                              <el-icon><question-filled /></el-icon>
                           </el-tooltip>页面地址
                        </span>
              </template>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="显示排序">
              <el-input-number v-model="form.sort" controls-position="right" :min="0" :max="100"></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="24" >
            <el-form-item label="菜单图标" prop="icon">
              <el-popover
                  placement="bottom-start"
                  :width="540"
                  trigger="click"
              >
                <template #reference>
                  <el-input v-model="form.icon" placeholder="点击选择图标" @blur="showSelectIcon" readonly>
                    <template #prefix>
                      <svg-icon
                          v-if="form.icon"
                          :icon-class="form.icon"
                          class="el-input__icon"
                          style="height: 32px;width: 16px;"
                      />
                      <el-icon v-else style="height: 32px;width: 16px;"><search /></el-icon>
                    </template>
                  </el-input>
                </template>
                <icon-select ref="iconSelectRef" @selected="selected" :active-icon="form.icon" />
              </el-popover>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType==='C'">
            <el-form-item label="缓存状态">
              <el-radio-group v-model="form.noCache">
                <el-radio :label="1">否</el-radio>
                <el-radio :label="0">是</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="form.menuType!=='F'">
            <el-form-item label="显示状态">
              <el-radio-group v-model="form.hidden">
                <el-radio :label="0">显示</el-radio>
                <el-radio :label="1">隐藏</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer" v-loading="loading">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="Menu">
import { addMenu, delMenu, getRouterSystem, changeMenu } from '@/api/system';
import SvgIcon from "@/components/SvgIcon";
import IconSelect from "@/components/IconSelect";
import {formatTime} from "@/utils/index.js";

const { proxy } = getCurrentInstance();
const menuList = ref([]);
const open = ref(false);
const loading = ref(false);
const title = ref("");
const menuOptions = ref([]);
const iconSelectRef = ref(null);

const data = reactive({
  form: {},
  queryParams: {
    menuName: undefined,
    visible: undefined
  },
  rules: {
    parentId: [
      { required: true, message: '请选择父级菜单', trigger: 'change' }
    ],
    title: [
      { required: true, message: '请输入菜单名称', trigger: 'blur' },
    ],
    name: [
      { required: true, message: '请输入页面名称', trigger: 'blur' },
    ],
    path: [
      { required: true, message: '请输入路由地址', trigger: 'blur' },
      // { validator:pathValidate, message: '首个字符必须为 /', trigger: 'blur' },
    ],
    component: [
      { required: true, message: '请输入页面地址', trigger: 'blur' },
    ]
  },
});

const { queryParams, form, rules } = toRefs(data);

/** 查询菜单列表 */
async function getList() {
  loading.value = true;
  const {data:{routerMenu}}=await getRouterSystem();
  menuList.value = routerMenu
  loading.value = false;
}
/** 查询菜单下拉树结构 */
async function getTreeselect() {
  menuOptions.value = [];
  const {data:{routerMenu}}=await getRouterSystem();
  routerMenu.unshift({
    title: "一级菜单",
    id: 0
  });
  menuOptions.value=routerMenu;
}
/** 取消按钮 */
function cancel() {
  open.value = false;
  reset();
}
/** 表单重置 */
function reset() {
  form.value = {
    id:undefined,
    icon: '',
    sort: 0,
    noCache: 1,
    hidden: 0,
    parentView: 0,
    parentId:0,
    alone: 0,
    menuType:"C",
    path:"/",
    component:"",
    name:""
  };
  // proxy.resetForm("ruleForm");
}
/** 展示下拉图标 */
function showSelectIcon() {
  iconSelectRef.value.reset();
}
/** 选择图标 */
function selected(name) {
  form.value.icon = name;
}
/** 搜索按钮操作 */
function handleQuery() {
  getList();
}
/** 重置按钮操作 */
function resetQuery() {
  proxy.resetForm("queryRef");
  handleQuery();
}
/** 新增按钮操作 */
function handleAdd(row) {
  reset();
  getTreeselect();
  if (row != null && row.id) {
    form.value.parentId = row.id;
  } else {
    form.value.parentId = 0;
  }
  open.value = true;
  title.value = "添加菜单";
}
/** 修改按钮操作 */
async function handleUpdate(row) {
  reset();
  await getTreeselect();
  row.path=row.pathView;
  form.value=row;
  open.value = true;
  title.value = "修改菜单";
}
/** 提交按钮 */
async function submitForm() {
  await proxy.$refs["ruleForm"].validate();
    loading.value=true;
  try {
    if(form.value.menuType==='M'||form.value.menuType==='F') form.value.component='/';
    form.value.id&&await changeMenu(form.value);
    !form.value.id&&await addMenu(form.value);
    getList();
    proxy.$modal.msgSuccess(form.value.id? "修改成功" : "新增成功");
    open.value = false;
  }finally {
    loading.value=false;
  }
}
/** 删除按钮操作 */
async function handleDelete(row) {
  await  proxy.$modal.confirm('是否确认删除名称为 "' + row.meta.title + '" 的数据项?');
  await delMenu({id:row.id});
  getList();
  proxy.$modal.msgSuccess("删除成功");
}

function formatTimeStr (date) {
  return formatTime(new Date(date.updateTime||date.createTime))
};

getList();
</script>
