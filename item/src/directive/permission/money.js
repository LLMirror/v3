/**
 * v-money="{value:{int:2,point:3,minus:false},call:(val)=>form.name=val}"
 * @param {number} value.int 限制整数字数；value.point 限制小数字数；value.minus 是否可以输入-号
 * @param {Function} call 回调，返回处理完成的值
 * */
export default {
    beforeUpdate(el,query) {
        el.oninput=()=>{
            try {
                let theInput = el.querySelector('input');//el.children[0].value
                //指令传回来的参数
                let {int,point,minus}=query.value.value||{};
                //输入的值
                let value=theInput.value;
                let reg=/[^0-9.]/g;
                let matchArr=value.match(/\./ig);
                let minusArr=value.match(/-/ig);
                //如果出现多个小数点
                if(matchArr)if(matchArr.length>1)  return setEvent();
                //如果小数点在第一位
                if(value.search(/\./ig)===0) return setEvent();
                //如果出现多个-号
                if(minusArr)if(minusArr.length>1)  return setEvent();
                //如果-号不在第一位
                if(value.search(/-/ig)>0) return setEvent();
                let valueArr=value.split(".");
                //需要输入-号
                if(minus) {
                    int=int+1;
                    reg=/[^0-9.-]/g;
                }
                //限制整数字数
                if(int)if(valueArr[0].length>int) valueArr[0]=valueArr[0].slice(0,int);
                //限制小数字数
                if(point)if(valueArr.length>1) if(valueArr[1].length>point) valueArr[1]=valueArr[1].slice(0,point);
                value=valueArr.length>1?`${valueArr[0]}.${valueArr[1]}`:valueArr[0];
                function setEvent(setValue=""){
                    if(typeof query.value.call==='function') setTimeout(()=>{
                        query.value.call(setValue.replace(reg,''))
                    });
                }
                setEvent(value)
            }catch (e) {
                console.error("money自定义指令失效")
            }

        }
    }
}