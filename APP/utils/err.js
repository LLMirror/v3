import log4js from 'log4js';
import config from './config.js'
/**
 * 记录错误信息日志
 * @param object err  错误信息
 * @param number code  状态值
 * @param string msg  提示语
 * @param string funName  等级函数名：trace debug info warn error fatal
 * @param object req  req主体
 * **/
export const errLog=({err,code,msg,funName="error",req={}})=>{
    log4js.configure({
        appenders:{
            console:{
                type:'dateFile',
                filename:`./${config.logSite}/${funName}.log`,
                pattern:'yyyy-MM-dd',
                // pattern:'yyyy-MM-dd-hh-mm-ss',
                keepFileExt: true,
                alwaysIncludePattern: true,
                numBackups: 14,//保留时间（天）
                layout:{
                    type: "pattern",
                    pattern:'{"date":"%d{yyyy-MM-dd hh:mm:ss}","type":"%p","data":"%m"} %n'
                }
            },
        },
        categories:{
            default: { appenders: ["console"], level: "all" },
        }
    });
    let init=log4js.getLogger();
    try {
        const safeReq = req || {};
        let data={
            err,
            code,
            msg,
            portName: safeReq?.originalUrl ?? "",
            body: safeReq?.body,
            query: safeReq?.query,
            method: safeReq?.method
        };
        init[funName](data);
        console.log("记录了错误信息logs---"+funName);
    }catch (e) {
        init[funName]("错误日志--记录错误："+e);
    }

}
