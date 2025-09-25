<template>
  <div class="app-container table-height-auto">
    <el-text size="large" type="primary" style="display: block;width: 100%;text-align: center;margin: 10px 0 30px">操作"系统设置"里面的新增/修改/删除将会触发日志记录并在右上角弹出提醒 <el-text size="large" type="danger">日志运用了webSocket实时推送记录提醒</el-text></el-text>
    <FormScreen :options="formOptions" @search="pageSearch" ></FormScreen>
    <el-table v-loading="tableLoading" :data="dataList" >
      <el-table-column label="编号" align="center" prop="id" width="100" />
      <el-table-column label="操作者" align="center" prop="name" :show-overflow-tooltip="true"/>
      <el-table-column label="系统" align="center" prop="systemName" :show-overflow-tooltip="true"/>
      <el-table-column label="浏览器" align="center" prop="browser" :show-overflow-tooltip="true"/>
      <el-table-column label="主机地址" align="center" prop="host" :show-overflow-tooltip="true"/>
      <el-table-column label="接口地址" align="center" prop="port" :show-overflow-tooltip="true"/>
      <el-table-column label="创建时间" align="center" prop="createTime" width="180" />
    </el-table>

    <pagination
      v-show="total > 0"
      :total="total"
      v-model:page="pageConfig.page"
      v-model:limit="pageConfig.size"
      @pagination="pageRefresh"
    />
  </div>
</template>

<script setup>
import { getLogs} from "@/api/system";
import UsePagination from "@/hooks/UsePagination";
const {initData,dataList,pageSearch,total,pageConfig,tableLoading,pageRefresh}=UsePagination();
const formOptions=ref([
  {label:"操作者",prop:"name",type:"FormInput",placeholder:"请输入操作者"},
  {label:"主机地址",prop:"host",type:"FormInput",placeholder:"请输主机地址"},
  {label:"接口地址",prop:"port",type:"FormInput",placeholder:"请输入接口地址"}

])
onMounted(()=>{
  initData(getLogs)
})
</script>

<style scoped lang="scss">

</style>