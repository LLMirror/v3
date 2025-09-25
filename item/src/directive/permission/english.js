/**
 *  v-english="{value:{size:'min',sum:2},call:(val)=>form.name=val}"
 * @param {number} value.size 限制大小写max/min；value.sum 限制输入字数；value.symbol 如果需要特定字符，填入兼容的特定字符 比如：value.symbol='/_-'
 * @param {Function} call 回调，返回处理完成的值
 * */
export default {
    beforeUpdate(el,query) {
        el.oninput=()=>{
            try {
                let theInput = el.querySelector('input');//el.children[0].value
                //输入的值
                let value=theInput.value;
                //指令传回来的参数
                let {size,sum,symbol}=query.value.value||{};
                //大写
                if(size==="max")value=value.toUpperCase();
                //小写
                if(size==="min")value=value.toLowerCase();
                //字数
                if(sum) value=value.slice(0,sum);
                let reg=/[^a-zA-Z]/g;
                //如果兼容字符
                if(symbol) reg=new RegExp(`[^a-zA-Z${symbol}]`,"g")//g;
                function setEvent(setValue=""){
                    if(typeof query.value.call==='function') setTimeout(()=>{
                        query.value.call(setValue.replace(reg,''))
                    });
                }
                setEvent(value)
            }catch (e) {
                console.error("english自定义指令失效")
            }

        }
    }
}