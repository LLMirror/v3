/**
 *  v-number="{value:0,call:(val)=>form.name=val}"
 * @param {number} value 控制的字数  不传或者为0不限制
 * @param {Function} call 回调，返回处理完成的值
 * */
export default {
    beforeUpdate(el,query) {
        try {
            el.oninput=()=>{
                let theInput = el.querySelector('input');//el.children[0].value
                //指令传回来的参数
                let queryValue=query.value.value;
                //输入的值
                let value=theInput.value;
                //判断长度
                if(queryValue!==undefined&&queryValue!==""&&queryValue!==0)if(value.length>queryValue)value=value.slice(0,queryValue);
                if(isNaN(Number(value))) return setEvent();
                function setEvent(setvalue=""){
                    if(typeof query.value.call==='function') setTimeout(()=>{
                        query.value.call(setvalue.replace(/[^0-9]/g,''))
                    });
                }
                setEvent(value)
            }
        }catch (e) {
            console.error("number自定义指令失效")
        }

    }
}