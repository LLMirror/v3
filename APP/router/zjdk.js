import express from 'express';
import utils from '../utils/index.js';
import xlsx from 'node-xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 使用内存存储，不保存到磁盘
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
             return res.send(utils.returnData({ code: -1, msg: "未上传文件" }));
        }

        const { startDate, endDate, type } = req.body;
        
        console.log('收到导入请求:', {
            type,
            period: `${startDate} - ${endDate}`,
            fileSize: req.file.size
        });

        // 直接解析内存 buffer
        const workSheets = xlsx.parse(req.file.buffer);
        if (workSheets.length === 0) {
             return res.send(utils.returnData({ code: -1, msg: "Excel 文件为空" }));
        }

        const sheet = workSheets[0];
        const data = sheet.data;
        
        console.log(`解析到 ${data.length} 行数据`);

        // 简单的将二维数组转换为对象数组（假设第一行为表头）
        let list = [];
        let headers = [];
        if (data.length > 1) {
            headers = data[0];
            // 添加生成的字段表头
            headers.push('id', 'uploadDate', 'previousDate', 'importType', 'timePeriod', 'zt');

            const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
            const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                // 跳过空行
                if (!row || row.length === 0) continue;
                
                let obj = {};
                // 原始数据映射
                headers.forEach((header, index) => {
                    // 只映射原始表头对应的数据
                    if (index < row.length) {
                         obj[header] = row[index];
                    }
                });
                
                // 补充生成字段
                obj.id = uuidv4();
                obj.uploadDate = now;
                obj.previousDate = yesterday;
                obj.importType = type === 'rent_adjustment' ? '租金调账' : '租金代扣';
                obj.timePeriod = `${startDate} 至 ${endDate}`;
                obj.zt = type === 'rent_adjustment' ? '调账' : '是';

                list.push(obj);
            }
        }

        res.send(utils.returnData({ 
            msg: "导入成功", 
            data: {
                list,
                headers,
                period: `${startDate} 至 ${endDate}`,
                type: type === 'rent_adjustment' ? '租金调账' : '租金代扣'
            }
        }));

    } catch (err) {
        console.error('导入处理出错:', err);
        res.send(utils.returnData({ code: -1, msg: "系统错误", err: err.message }));
    }
});

export default router;
