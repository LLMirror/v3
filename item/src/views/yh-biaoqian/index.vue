<template>
  <div class="biaoqian-page">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="角色ID">
          <el-input v-model="query.roles_id" placeholder="输入 roles_id" clearable />
        </el-form-item>
        <el-form-item label="大类">
          <el-input v-model="query.parent" placeholder="输入大类" clearable />
        </el-form-item>
        <el-form-item label="子类">
          <el-input v-model="query.child" placeholder="输入子类" clearable />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="query.remark" placeholder="输入备注" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
        <el-form-item>
          <el-button type="success" @click="openAdd">新增标签</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="list" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="90" />
        <el-table-column prop="rolesId" label="角色ID" width="120" />
        <el-table-column prop="parent" label="大类" />
        <el-table-column prop="child" label="子类" />
        <el-table-column prop="remark" label="备注" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          background
          layout="prev, pager, next, jumper, ->, total"
          :total="total"
          :page-size="query.size"
          :current-page="query.page"
          @current-change="(p)=>{ query.page = p; loadData(); }"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.isEdit ? '编辑标签' : '新增标签'" width="520px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="角色ID">
          <el-input v-model="form.roles_id" placeholder="可选" />
        </el-form-item>
        <el-form-item label="大类" required>
          <el-input v-model="form.parent" placeholder="必填" />
        </el-form-item>
        <el-form-item label="子类" required>
          <el-input v-model="form.child" placeholder="必填" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible=false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">{{ dialog.isEdit ? '保存' : '提交' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { getBiaoqian, addBiaoqian, upBiaoqian, delBiaoqian } from '@/api/biaoqian'

const list = ref([])
const total = ref(0)

const query = reactive({
  roles_id: '',
  parent: '',
  child: '',
  remark: '',
  page: 1,
  size: 10,
})

const dialog = reactive({ visible: false, isEdit: false })
const form = reactive({ id: null, roles_id: '', parent: '', child: '', remark: '' })

function resetQuery() {
  query.roles_id = ''
  query.parent = ''
  query.child = ''
  query.remark = ''
  query.page = 1
  loadData()
}

async function loadData() {
  const { data, total: t } = await getBiaoqian({
    roles_id: query.roles_id || undefined,
    大类: query.parent || undefined,
    子类: query.child || undefined,
    备注: query.remark || undefined,
    page: query.page,
    size: query.size,
  })
  list.value = data || []
  total.value = t || 0
}

function openAdd() {
  dialog.visible = true
  dialog.isEdit = false
  Object.assign(form, { id: null, roles_id: '', parent: '', child: '', remark: '' })
}

function openEdit(row) {
  dialog.visible = true
  dialog.isEdit = true
  Object.assign(form, {
    id: row.id,
    roles_id: row.rolesId || '',
    parent: row.parent || '',
    child: row.child || '',
    remark: row.remark || '',
  })
}

async function handleSubmit() {
  if (!form.parent || !form.child) {
    ElMessage.error('请填写必填项：大类、子类')
    return
  }
  const payload = {
    roles_id: form.roles_id || undefined,
    大类: form.parent,
    子类: form.child,
    备注: form.remark || undefined,
  }
  if (dialog.isEdit) {
    await upBiaoqian({ id: form.id, ...payload })
    ElMessage.success('修改成功')
  } else {
    await addBiaoqian(payload)
    ElMessage.success('新增成功')
  }
  dialog.visible = false
  loadData()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除【${row.parent}/${row.child}】？`, '提示', { type: 'warning' })
  await delBiaoqian({ id: row.id })
  ElMessage.success('删除成功')
  loadData()
}

onMounted(loadData)
</script>

<style scoped>
.biaoqian-page {
  padding: 10px;
}
.filter-card {
  margin-bottom: 10px;
}
.pager {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}
</style>

