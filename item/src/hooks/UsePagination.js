import { ref,nextTick } from 'vue'
export default function () {
  const pageConfig=ref({
    page:1,
    size:20
  })
  const dataList=ref([])
  const total=ref(0)
  const dataParams=ref({})
  const tableLoading=ref(true)
  const callFun={};
  let apiMain=()=>{};
  provide('dataParams', dataParams)
  const setDataParams=(params={})=>{
    dataParams.value={...dataParams.value,...params}
  }
  const initData=async (api)=>{
    try {
      tableLoading.value=true;
      apiMain=api;
      const res=await api({
        ...pageConfig.value,
        ...dataParams.value,
      });
      total.value=res.total;
      if(callFun.callback && typeof callFun.callback==='function'){
        callFun.callback(res);
        return res;
      }
      dataList.value=res.data;
      if(callFun.lastCallback && typeof callFun.lastCallback==='function') callFun.lastCallback(res);
      return res;
    }finally {
      tableLoading.value=false;
    }
  }
  const pageSearch=(params)=>{
    if(params&&typeof params==='object') setDataParams(params);
    pageConfig.value.page=1;
    return initData(apiMain)
  }
  const pageRefresh=()=>{
    return nextTick().then(()=>{
      return initData(apiMain)
    })
  }
  const setPageConfig=(data={})=>{
    pageConfig.value={...pageConfig.value,...data}
  }
  return {
    dataParams,
    pageConfig,//分页配置
    setPageConfig,//分页重新设置
    dataList,//数据列表
    total,//数据总数
    callFun,//前后回调函数
    tableLoading,//表格加载状态
    setDataParams,//设置额外参数
    initData,//初始加载
    pageSearch,//搜索加载
    pageRefresh,//刷新加载
  }
}