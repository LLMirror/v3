export default function (){
  const callBack={
    res: null,
    err: null,
    done: null
  }
  const fetchSend = async ({url,method='POST',data={},headers={}}) => {
    const  api=process.env.VUE_APP_BASE_SCRIPT_API+url;
    const isGet = method === 'GET' || method === 'get';
    function buildUrlWithParams(url, params) {
      if (!params) return url;
      const queryParams = new URLSearchParams(params).toString();
      return `${url}?${queryParams}`;
    }
    const path = buildUrlWithParams(api, isGet ? data : null);
    const res = await fetch(path, {
      method,
      headers: {'Content-Type': 'application/json',...headers},
      body: isGet?null:JSON.stringify(data)
    });
    const reader = res.body.getReader();
    const textDecoder = new TextDecoder('utf-8');
    let buffer = ''; // 创建一个字符串缓冲区
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if(callBack.done&&typeof callBack.done==='function') callBack.done(value);
        break;
      }
      // 将新的数据片段追加到缓冲区
      buffer += textDecoder.decode(value, { stream: true });
      // 尝试解析缓冲区中的JSON对象
      while (buffer) {
        try {
          // 假设每个JSON对象以换行符分隔（根据实际情况调整）
          const index = buffer.indexOf('\n\n');
          if (index === -1) break; // 如果没有找到完整的JSON对象，退出循环
          // 截取并解析一个完整的JSON对象
          const jsonString = buffer.slice(0, index);
          const resData = JSON.parse(jsonString);
          if(callBack.res&&typeof callBack.res==='function') callBack.res(resData);
          // console.log(resData)
          // 移除已处理的JSON对象
          buffer = buffer.slice(index + 1);
        } catch (e) {
          if(callBack.err&&typeof callBack.err==='function') callBack.err(e);
          console.error("Error parsing JSON:", e);
          // 如果解析失败，可能是数据还不完整，继续等待更多数据
          break;
        }
      }
    }
  }
  return {
    fetchSend,
    callBack
  }

}