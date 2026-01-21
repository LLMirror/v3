import express from 'express';
import utils from '../utils/index.js';
import fileEvent from '../utils/file.js';
import xlsx from 'node-xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post('/import', async (req, res) => {
    try {
        let fileArr = await fileEvent(req, res);
        if (!fileArr || fileArr.length === 0) {
            // 如果没有文件，fileEvent 可能已经处理了响应
             return;
        }

        const { startDate, endDate } = req.body;
        const fileInfo = fileArr[0];
        
        // 构建文件完整路径
        const filePath = path.join(__dirname, '../public', fileInfo.url);
        
        console.log('收到租金代扣导入请求:', {
            period: `${startDate} - ${endDate}`,
            file: filePath
        });

        // 解析 Excel
        const workSheets = xlsx.parse(filePath);
        if (workSheets.length === 0) {
             return res.send(utils.returnData({ code: -1, msg: "Excel 文件为空" }));
        }

        const sheet = workSheets[0];
        const data = sheet.data;
        
        // 这里可以添加具体的业务逻辑，比如数据清洗、校验、入库等
        // 目前仅打印数据行数
        console.log(`解析到 ${data.length} 行数据`);

        res.send(utils.returnData({ 
            msg: "导入成功", 
            data: {
                rowCount: data.length,
                period: `${startDate} 至 ${endDate}`
            }
        }));

    } catch (err) {
        console.error('导入处理出错:', err);
        res.send(utils.returnData({ code: -1, msg: "系统错误", err: err.message }));
    }
});

export default router;
