import express from 'express';
import utils from '../utils/index.js';
import pools from '../utils/pools.js';
import xlsx from 'node-xlsx';
import ExcelJS from 'exceljs';
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

const withholdingMapping = {
    '司机姓名': 'sjxm',
    '司机编号': 'sjbh',
    '城市': 'cs',
    '运力公司': 'ylgsmc',
    '规则名称': 'gzmc',
    '规则ID': 'gzID',
    '扣款时间': 'kksj',
    '扣款金额': 'kkje',
    '账单编号': 'zdbh',
    '账单周期': 'zdzq',
    '租金类型': 'zjlx',
    '账单开始时间': 'zdkssj',
    '账单结束时间': 'zdjssj',
    '车队': 'cd'
};

const createAdjustmentTable = `
CREATE TABLE IF NOT EXISTS \`pt-dz-zjdktz_copy1\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`uploadDate\` DATETIME,
  \`previousDate\` VARCHAR(50),
  \`importType\` VARCHAR(50),
  \`timePeriod\` VARCHAR(100),
  \`zt\` VARCHAR(50),
  \`cs\` VARCHAR(100),
  \`ylgs\` VARCHAR(255),
  \`sqsj\` VARCHAR(100),
  \`sjzhID\` VARCHAR(100),
  \`sjxm\` VARCHAR(100),
  \`sjsjh\` VARCHAR(100),
  \`jylm\` VARCHAR(100),
  \`gldd\` VARCHAR(255),
  \`jysm\` TEXT,
  \`xgje\` VARCHAR(50),
  \`sqr\` VARCHAR(100),
  \`sqyy\` TEXT,
  \`cxr\` VARCHAR(100),
  \`cxyy\` TEXT,
  \`sqzt\` VARCHAR(50),
  \`tkzt\` VARCHAR(50),
  \`cd\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const createWithholdingTable = `
CREATE TABLE IF NOT EXISTS \`pt-dz-zjdkdk_copy1\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`uploadDate\` DATETIME,
  \`previousDate\` VARCHAR(50),
  \`importType\` VARCHAR(50),
  \`timePeriod\` VARCHAR(100),
  \`zt\` VARCHAR(50),
  \`sjxm\` VARCHAR(100),
  \`sjbh\` VARCHAR(100),
  \`cs\` VARCHAR(100),
  \`ylgsmc\` VARCHAR(255),
  \`gzmc\` VARCHAR(255),
  \`gzID\` VARCHAR(100),
  \`kksj\` VARCHAR(100),
  \`kkje\` VARCHAR(50),
  \`zdbh\` VARCHAR(100),
  \`zdzq\` VARCHAR(100),
  \`zjlx\` VARCHAR(100),
  \`zdkssj\` VARCHAR(100),
  \`zdjssj\` VARCHAR(100),
  \`cd\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function ensureTables() {
    try {
        await pools({ sql: createAdjustmentTable, res: { send() {} }, req: {} });
        await pools({ sql: createWithholdingTable, res: { send() {} }, req: {} });
        console.log('租金代扣相关表检查完成');
    } catch (err) {
        console.error('初始化表失败:', err);
    }
}

await ensureTables();

router.post('/save', async (req, res) => {
    try {
        const { list, type } = req.body;
        if (!list || list.length === 0) {
            return res.send(utils.returnData({ code: -1, msg: "没有数据需要保存" }));
        }

        const isAdjustment = type === 'rent_adjustment';
        const tableName = isAdjustment ? 'pt-dz-zjdktz_copy1' : 'pt-dz-zjdkdk_copy1';
        
        let columns = [];
        if (isAdjustment) {
            columns = ['id', 'uploadDate', 'previousDate', 'timePeriod', 'zt', ...Object.values(adjustmentMapping)];
        } else {
            columns = ['id', 'uploadDate', 'previousDate', 'timePeriod', 'zt', ...Object.values(withholdingMapping)];
        }
        
        // 过滤空值
        columns = columns.filter(c => c);

        const values = list.map(item => {
            return columns.map(col => item[col] || null);
        });

        const sql = `INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(',')}) VALUES ?`;
        
        await pools({ sql, val: [values], res, req });
        
        res.send(utils.returnData({ msg: "保存成功" }));

    } catch (err) {
        console.error('保存出错:', err);
        res.send(utils.returnData({ code: -1, msg: "保存失败", err: err.message }));
    }
});

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
                // 租金代扣：使用映射
                rawHeaders.forEach(header => {
                    const prop = withholdingMapping[header];
                    if (prop) {
                        tableColumns.push({ prop, label: header });
                    }
                });
            }

            // 添加系统生成字段的表头
            tableColumns.push(
                { prop: 'id', label: 'ID (系统)' },
                { prop: 'uploadDate', label: '上传时间' },
                { prop: 'previousDate', label: '上一周期' },
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
                        // 租金代扣
                        const prop = withholdingMapping[header];
                        if (prop) {
                            obj[prop] = row[index];
                        }
                    }
                });
                
                // 补充生成字段
                obj.id = uuidv4();
                obj.uploadDate = now;
                obj.previousDate = yesterday;
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

router.get('/template', async (req, res) => {
    try {
        const { type } = req.query;
        let headers = [];
        let fileName = 'template.xlsx';

        if (type === 'rent_adjustment') {
            // 租金调账模板表头
            headers = [
                '城市', '运力公司', 'ID', '申请时间', '司机账号ID', '司机姓名', 
                '司机手机号', '交易类目', '关联订单', '交易说明', '修改金额', 
                '申请人', '申请原因', '撤销人', '撤销原因', '申请状态', 
                '调款状态', '车队'
            ];
            fileName = '租金调账导入模板.xlsx';
        } else {
            // 租金代扣模板表头
            headers = [
                '司机姓名', '司机编号', '城市', '运力公司', '规则名称', '规则ID', 
                '扣款时间', '扣款金额', '账单编号', '账单周期', '租金类型', 
                '账单开始时间', '账单结束时间', '车队'
            ];
            fileName = '租金代扣导入模板.xlsx';
        }

        // 使用 ExcelJS 生成带有样式的 Excel
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sheet1');

        // 计算文本宽度的辅助函数
        const calculateWidth = (text) => {
            let length = 0;
            if (text) {
                for (const char of text.toString()) {
                    length += char.charCodeAt(0) > 255 ? 2 : 1;
                }
            }
            return Math.max(length * 1.5 + 2, 12); // 最小宽度 12
        };

        // 设置表头
        sheet.columns = headers.map(h => ({ 
            header: h, 
            key: h, 
            width: calculateWidth(h) 
        }));

        // 样式定义
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        const headerFill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB8B8EA' } // rgb(184, 184, 234) -> Hex B8B8EA
        };

        // 遍历前 50 行设置样式
        const columnCount = headers.length;
        for (let r = 1; r <= 50; r++) {
            const row = sheet.getRow(r);
            
            for (let c = 1; c <= columnCount; c++) {
                const cell = row.getCell(c);
                
                // 设置边框
                cell.border = borderStyle;

                // 如果是第一行（表头），设置背景色和居中
                if (r === 1) {
                    cell.fill = headerFill;
                    cell.font = { bold: true };
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                }
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(fileName)}`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('模板下载出错:', err);
        res.status(500).send("下载模板失败");
    }
});

export default router;
