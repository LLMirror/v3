//npm install @microsoft/fetch-event-source
import { fetchEventSource } from '@microsoft/fetch-event-source';
const token = 'app-A13A1GKNg1YxwX1EQyG6ZPD6';
export default function (){
  const callBack={
    res: null,//数据回调
    end: null,//数据结束回调
    err: null,//错误回调
  }
  const controller = new AbortController();
  const fetchSend = async ({url,method='POST',data={},header={}}) => {
    // const  api=process.env.VUE_APP_BASE_SCRIPT_API+url;
    const  api=url;
    const isGet = method === 'GET' || method === 'get';
    const buildUrlWithParams=(url, params)=> {
      if (!params) return url;
      const queryParams = new URLSearchParams(params).toString();
      return `${url}?${queryParams}`;
    }
    const path = buildUrlWithParams(api, isGet ? data : null);
    await fetchEventSource(path,{
      method,
      headers: {'Content-Type': 'application/json','Authorization': `Bearer ${token}`,...header},
      body: isGet ? null : JSON.stringify(data),
      signal: controller.signal, // 绑定 AbortController
      //credentials:'same-origin', //说明: 指定是否发送跨域请求的凭据。可选值包括 'omit'、'same-origin' 和 'include'。
      onopen: async (response) => {
        if (response.ok) return;
        if(callBack.err&&typeof callBack.err==='function') callBack.err(response);
        controller.abort()
      },
      onmessage: (event) => {
        try {
          const data = JSON.parse(event.data);
          if(callBack.res&&typeof callBack.res==='function') callBack.res(data);
        }catch (e) {
          if(callBack.err&&typeof callBack.err==='function') callBack.err(event.data);
        }
      },
      onclose: () => {
        //console.log('单次推流结束');
        if(callBack.end&&typeof callBack.end==='function') callBack.end();
      },
      onerror: (err) => {
        //console.error('SSE error:', err);
        if(callBack.err&&typeof callBack.err==='function') callBack.err(err);
        controller.abort(); // 中止请求
      },
    });
  }
  //暂停
  const abort=()=>{
    controller.abort&&controller.abort()
  }
  return {
    fetchSend,
    callBack,
    abort
  }

}