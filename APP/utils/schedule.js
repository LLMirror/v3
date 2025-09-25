import schedule from 'node-schedule';
import utils from './index.js';
import cleanOldFiles from './cleanOldFiles.js';
import config from './config.js';
//每天凌晨3点删除日志 //0 3 * * *   */10 * * * * *
schedule.scheduleJob('0 3 * * *',()=>{
  try {
    //删除数据库logs表
    utils.deleteLogs();
    //删除本地日志文件
    cleanOldFiles({
      directoryPath:`./${config.logSite}`,
      isLog: true
    })
  }catch (e) {
    
  }
 
});
