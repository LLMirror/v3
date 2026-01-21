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

const adjustmentMapping = {
    '城市': 'cs',
    '运力公司': 'ylgs',
    '申请时间': 'sqsj',
    '司机账号ID': 'sjzhID',
    '司机姓名': 'sjxm',
    '司机手机号': 'sjsjh',
    '交易类目': 'jylm',
    '关联订单': 'gldd',
    '交易说明': 'jysm',
    '修改金额': 'xgje',
    '申请人': 'sqr',
    '申请原因': 'sqyy',
    '撤销人': 'cxr',
    '撤销原因': 'cxyy',
    '申请状态': 'sqzt',
    '调款状态': 'tkzt',
    '车队': 'cd'
};

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

        let list = [];
        let tableColumns = [];
        
        if (data.length > 1) {
            const rawHeaders = data[0];
            const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
            const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            const isAdjustment = type === 'rent_adjustment';

            // 构建表头定义
            if (isAdjustment) {
                // 租金调账：使用映射，排除 ID
                rawHeaders.forEach(header => {
                    if (header === 'ID') return; // 忽略 ID
                    const prop = adjustmentMapping[header];
                    if (prop) {
                        tableColumns.push({ prop, label: header });
                    }
                });
            } else {
                // 租金代扣：保持原样 (假设都是有效列)
                rawHeaders.forEach(header => {
                    tableColumns.push({ prop: header, label: header });
                });
            }

            // 添加系统生成字段的表头
            tableColumns.push(
                { prop: 'id', label: 'ID (系统)' },
                { prop: 'uploadDate', label: '上传时间' },
                { prop: 'previousDate', label: '上一周期' },
                { prop: 'importType', label: '导入类型' },
                { prop: 'timePeriod', label: '时间周期' },
                { prop: 'zt', label: '状态' }
            );

            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;
                
                let obj = {};
                
                rawHeaders.forEach((header, index) => {
                    if (index >= row.length) return;
                    
                    if (isAdjustment) {
                        if (header === 'ID') return; // 忽略 ID
                        const prop = adjustmentMapping[header];
                        if (prop) {
                            obj[prop] = row[index];
                        }
                    } else {
                        obj[header] = row[index];
                    }
                });
                
                // 补充生成字段
                obj.id = uuidv4();
                obj.uploadDate = now;
                obj.previousDate = yesterday;
                obj.importType = isAdjustment ? '租金调账' : '租金代扣';
                obj.timePeriod = `${startDate} 至 ${endDate}`;
                obj.zt = isAdjustment ? '调账' : '是';

                list.push(obj);
            }
        }

        res.send(utils.returnData({ 
            msg: "导入成功", 
            data: {
                list,
                tableColumns,
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
