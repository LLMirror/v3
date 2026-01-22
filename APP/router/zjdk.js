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

const createFilesTable = `
CREATE TABLE IF NOT EXISTS \`files_copy1\` (
  \`addid\` VARCHAR(255) PRIMARY KEY,
  \`status\` VARCHAR(50),
  \`update_time\` DATETIME,
  \`nameValue\` VARCHAR(255),
  \`totalAmount\` DECIMAL(10, 2),
  \`totalAmount1\` DECIMAL(10, 2),
  \`totalAmount2\` DECIMAL(10, 2),
  \`ApplicationNotes\` TEXT,
  \`listValue\` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function ensureTables() {
    try {
        await pools({ sql: createAdjustmentTable, res: { send() {} }, req: {} });
        await pools({ sql: createWithholdingTable, res: { send() {} }, req: {} });
        await pools({ sql: createFilesTable, res: { send() {} }, req: {} });
        console.log('租金代扣相关表检查完成');
    } catch (err) {
        console.error('初始化表失败:', err);
    }
}

await ensureTables();

router.post('/check-period', async (req, res) => {
    try {
        const { startDate, endDate, type } = req.body;
        const isAdjustment = type === 'rent_adjustment';
        const tableName = isAdjustment ? 'pt-dz-zjdktz_copy1' : 'pt-dz-zjdkdk_copy1';
        const timePeriod = `${startDate} 至 ${endDate}`;
        
        // 统计查询
        const countSql = `SELECT COUNT(*) as total FROM \`${tableName}\` WHERE timePeriod = ?`;
        // 运力公司字段: 调账是 ylgs, 代扣是 ylgsmc
        const companyField = isAdjustment ? 'ylgs' : 'ylgsmc';
        const companiesSql = `SELECT DISTINCT ${companyField} FROM \`${tableName}\` WHERE timePeriod = ?`;
        // 金额字段: 调账是 xgje, 代扣是 kkje
        const amountField = isAdjustment ? 'xgje' : 'kkje';
        const amountSql = `SELECT SUM(${amountField}) as totalAmount FROM \`${tableName}\` WHERE timePeriod = ?`;

        const { result: countResult } = await pools({ sql: countSql, val: [timePeriod], res, req });
        
        if (countResult[0].total > 0) {
            // 查询详细统计：公司、条数、金额
            const detailSql = `
                SELECT ${companyField} as company, COUNT(*) as count, SUM(${amountField}) as amount 
                FROM \`${tableName}\` 
                WHERE timePeriod = ? 
                GROUP BY ${companyField}
            `;
            const { result: detailResult } = await pools({ sql: detailSql, val: [timePeriod], res, req });
            
            const companies = detailResult.map(row => row.company);
            const totalAmount = detailResult.reduce((sum, row) => sum + (row.amount || 0), 0);

            return res.send(utils.returnData({
                msg: "查询成功",
                data: {
                    exists: true,
                    count: countResult[0].total,
                    companies: companies,
                    companyStats: detailResult,
                    totalAmount: totalAmount
                }
            }));
        }

        res.send(utils.returnData({
            msg: "查询成功",
            data: { exists: false }
        }));

    } catch (err) {
        console.error('查询周期数据出错:', err);
        res.send(utils.returnData({ code: -1, msg: "查询失败", err: err.message }));
    }
});

router.post('/delete-period', async (req, res) => {
    try {
        const { startDate, endDate, type } = req.body;
        const isAdjustment = type === 'rent_adjustment';
        const tableName = isAdjustment ? 'pt-dz-zjdktz_copy1' : 'pt-dz-zjdkdk_copy1';
        const timePeriod = `${startDate} 至 ${endDate}`;

        const sql = `DELETE FROM \`${tableName}\` WHERE timePeriod = ?`;
        await pools({ sql, val: [timePeriod], res, req });

        res.send(utils.returnData({ msg: "删除成功" }));
    } catch (err) {
        console.error('删除周期数据出错:', err);
        res.send(utils.returnData({ code: -1, msg: "删除失败", err: err.message }));
    }
});

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

router.post('/list', async (req, res) => {
    try {
        const { type, pageNum = 1, pageSize = 20, startDate, endDate, companyName } = req.body;
        const isAdjustment = type === 'rent_adjustment';
        const tableName = isAdjustment ? 'pt-dz-zjdktz_copy1' : 'pt-dz-zjdkdk_copy1';
        
        let where = 'WHERE 1=1';
        let params = [];
        
        if (companyName) {
            const column = isAdjustment ? 'ylgs' : 'ylgsmc';
            where += ` AND ${column} LIKE ?`;
            params.push(`%${companyName}%`);
        }

        if (startDate && endDate) {
             where += ' AND uploadDate BETWEEN ? AND ?';
             params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        }

        const offset = (Number(pageNum) - 1) * Number(pageSize);
        const limit = Number(pageSize);
        
        const sql = `SELECT * FROM \`${tableName}\` ${where} ORDER BY uploadDate DESC LIMIT ? OFFSET ?`;
        const countSql = `SELECT COUNT(*) as total FROM \`${tableName}\` ${where}`;
        
        const { result: list } = await pools({ sql, val: [...params, limit, offset], res, req });
        const { result: countRes } = await pools({ sql: countSql, val: params, res, req });
        
        res.send(utils.returnData({
            msg: "查询成功",
            data: {
                list,
                total: countRes[0].total
            }
        }));
    } catch (err) {
        console.error('查询列表失败:', err);
        res.send(utils.returnData({ code: -1, msg: "查询失败", err: err.message }));
    }
});

router.post('/statement-list', async (req, res) => {
    try {
        const { pageNum = 1, pageSize = 20, startDate, endDate } = req.body;
        const offset = (Number(pageNum) - 1) * Number(pageSize);
        const limit = Number(pageSize);

        let periodSql;
        if (startDate && endDate) {
            // Use provided custom period
            periodSql = `'${startDate}至${endDate}'`;
        } else {
            // Default to Last Week
            periodSql = `
                CONCAT(
                    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY), '%Y-%m-%d'),
                    '至',
                    DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 1) DAY), '%Y-%m-%d')
                )
            `;
        }

        const sql = `
            SELECT *
            FROM files_copy1 
            WHERE listValue = ${periodSql}
            ORDER BY update_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const countSql = `
            SELECT COUNT(*) as total 
            FROM files_copy1 
            WHERE listValue = ${periodSql}
        `;
        
        const { result: list } = await pools({ sql, val: [limit, offset], res, req });
        const { result: countRes } = await pools({ sql: countSql, val: [], res, req });
        
        res.send(utils.returnData({
            msg: "查询成功",
            data: {
                list,
                total: countRes[0].total
            }
        }));
    } catch (err) {
        console.error('查询对账单数据失败:', err);
        res.send(utils.returnData({ code: -1, msg: "查询失败", err: err.message }));
    }
});

router.post('/generate-statement', async (req, res) => {
    try {
        const { companyNames, startDate, endDate } = req.body;
        
        let periodSql, periodStart, periodEnd;
        let prevPeriodStart, prevPeriodEnd;

        if (startDate && endDate) {
            // Use provided custom period
            periodStart = `'${startDate}'`;
            periodEnd = `'${endDate}'`;
            periodSql = `'${startDate}至${endDate}'`;
            
            // Calculate previous period (assuming 7 days prior for now, or maybe just based on the difference?)
            // If the user selects a custom range, "Previous Period" logic is tricky. 
            // For now, let's assume the user selects a week.
            // If we strictly follow "Previous Week" logic based on the selected start date:
            // But if the user selects a random range (e.g. 3 days), "Previous Period" might mean the 3 days before that?
            // To keep it simple and consistent with the "Weekly" concept, let's assume we shift back 7 days for "Previous Period" 
            // if it looks like a week, or just shift back by the duration.
            // However, the original logic was strictly "Last Week" vs "Week Before Last".
            // Let's stick to 7-day shift for "Previous Period" relative to the Custom Period Start.
             
             // We need to calculate dates in SQL or JS. Let's do it in SQL for consistency with previous logic, 
             // but we need to inject the strings.
             // Actually, it's better to pass the dates as strings to SQL.
             
             // Previous period: startDate - 7 days, endDate - 7 days (Simple assumption for "Weekly" cycles)
             // Or better: If the user selects Monday-Sunday, previous is last Monday-Sunday.
             
             prevPeriodStart = `DATE_SUB('${startDate}', INTERVAL 7 DAY)`;
             prevPeriodEnd = `DATE_SUB('${endDate}', INTERVAL 7 DAY)`;
             
        } else {
            // Default to Last Week (Monday to Sunday)
            periodStart = `DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 7) DAY)`;
            periodEnd = `DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 1) DAY)`;
            
            periodSql = `
                CONCAT(
                    DATE_FORMAT(${periodStart}, '%Y-%m-%d'),
                    '至',
                    DATE_FORMAT(${periodEnd}, '%Y-%m-%d')
                )
            `;
            
            prevPeriodStart = `DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 14) DAY)`;
            prevPeriodEnd = `DATE_SUB(CURDATE(), INTERVAL (WEEKDAY(CURDATE()) + 8) DAY)`;
        }

        // 1. Delete old data for the target period
        let deleteSql = `
            DELETE FROM files_copy1 WHERE listValue = ${periodSql} AND status = '未提交'
        `;
        
        let deleteParams = [];
        if (companyNames && companyNames.length > 0) {
            deleteSql += ` AND nameValue IN (?)`;
            deleteParams.push(companyNames);
        }

        await pools({ sql: deleteSql, val: deleteParams, res, req });

        // 2. Insert new data
        let insertSql = `
 INSERT IGNORE INTO files_copy1 
 (addid, status, update_time, nameValue, totalAmount, totalAmount1,totalAmount2, ApplicationNotes, listValue) 
 SELECT * FROM (
 SELECT 
   CONCAT(current.nameValue, current.listValue) AS addid, 
   CASE 
     WHEN current.nameValue IS NULL THEN '其他' 
     ELSE '未提交' 
   END AS status, 
   NOW() AS update_time, 
   COALESCE(current.nameValue, previous.nameValue) AS nameValue, 
   IFNULL(current.totalAmount, 0) AS totalAmount, 
   IFNULL(current.totalAmount1, 0) AS totalAmount1, 
 	 ROUND(IFNULL(current.totalAmount1, 0)+IFNULL(current.totalAmount, 0),2) AS totalAmount2, 
   CONCAT( 
     IFNULL(previous.g, ''), 
     IFNULL(current.g, '') 
   ) AS ApplicationNotes, 
   IFNULL(current.listValue, '') AS listValue 
 FROM ( 
   -- 当前账期数据 
   SELECT 
   公司名称 AS nameValue, 
   ROUND(SUM(CASE WHEN 扣款_状态 = '是' THEN 扣款_金额 ELSE 0 END), 2) AS totalAmount, 
   ROUND(SUM(CASE WHEN 扣款_状态 = '调账' THEN 扣款_金额 ELSE 0 END), 2) AS totalAmount1, 
 	 	 	 城市, 
   CONCAT( 
     公司名称, 
     
     DATE_FORMAT(${periodStart}, '%Y-%m-%d'), 
     '至', 
     DATE_FORMAT(${periodEnd}, '%Y-%m-%d'), 
     '租金代扣', 
     ROUND(SUM(CASE WHEN 扣款_状态 = '是' THEN 扣款_金额 ELSE 0 END), 2), 
     '元，调账金额', 
     ROUND(SUM(CASE WHEN 扣款_状态 = '调账' THEN 扣款_金额 ELSE 0 END), 2), 
     '元（本期）故本次付合计', 
     ROUND(SUM(扣款_金额), 2), 
     '元  ', 
 	 	 IF(城市 = '南京市', '注：南京区域所有运力公司都由南京沛途科技有限公司代收代付。', "") 
   ) AS g, 
   CONCAT( 
     DATE_FORMAT(${periodStart}, '%Y-%m-%d'), 
     '至', 
     DATE_FORMAT(${periodEnd}, '%Y-%m-%d') 
   ) AS listValue 
 FROM ( 
   -- 本期明细数据 
   SELECT 
 -- 	 TRIM(SUBSTRING_INDEX(ylgsmc, '（', 1)) AS 公司名称, 
 IF(cs = '南京市', '南京沛途科技有限公司', TRIM(SUBSTRING_INDEX(ylgsmc, '（', 1))) AS 公司名称, 
 	 	 	 	 	 cs AS 城市, 
          ROUND(kkje * 1, 2) AS 扣款_金额, 
          zt AS 扣款_状态 
   FROM \`pt-dz-zjdkdk_copy1\` 
   WHERE DATE(STR_TO_DATE(REPLACE(kksj, ' ', ''), '%Y-%m-%d%H:%i:%s')) 
         BETWEEN ${periodStart} AND ${periodEnd} 
   
   UNION ALL 
   
   SELECT 
 -- 	 TRIM(SUBSTRING_INDEX(ylgs, '（', 1)) AS 公司名称, 
 IF(cs = '南京市', '南京沛途科技有限公司', TRIM(SUBSTRING_INDEX(ylgs, '（', 1))) AS 公司名称, 
 	 	 	 	 cs AS 城市, 
          ROUND(xgje * -1, 2) AS 扣款_金额, 
          zt AS 扣款_状态 
   FROM \`pt-dz-zjdktz_copy1\` 
   WHERE DATE(STR_TO_DATE(REPLACE(sqsj, ' ', ''), '%Y-%m-%d%H:%i:%s')) 
         BETWEEN ${periodStart} AND ${periodEnd} 
     AND sqyy NOT LIKE '%司机违规扣款%' 
     AND sqr != '系统操作' 
     AND sqzt = '申请成功' 
     AND tkzt = '调账成功' 
 ) AS current_data 
 GROUP BY 公司名称,城市 
 ) AS current 
 LEFT JOIN ( 
   -- 上期数据 
   SELECT 
   公司名称 AS nameValue, 
   CONCAT( 
     公司名称, 
     DATE_FORMAT(${prevPeriodStart}, '%Y-%m-%d'), 
     '至', 
     DATE_FORMAT(${prevPeriodEnd}, '%Y-%m-%d'), 
     '租金代扣', 
     ROUND(SUM(CASE WHEN 扣款_状态 = '是' THEN 扣款_金额 ELSE 0 END), 2), 
     '元，调账金额', 
     ROUND(SUM(CASE WHEN 扣款_状态 = '调账' THEN 扣款_金额 ELSE 0 END), 2), 
     '元（上期）' 
   ) AS g 
   FROM ( 
     SELECT 
 -- 	 	 TRIM(SUBSTRING_INDEX(ylgsmc, '（', 1)) AS 公司名称, 
 IF(cs = '南京市', '南京沛途科技有限公司', TRIM(SUBSTRING_INDEX(ylgsmc, '（', 1))) AS 公司名称, 
          ROUND(kkje * 1, 2) AS 扣款_金额, 
          zt AS 扣款_状态 
     FROM \`pt-dz-zjdkdk_copy1\` 
     WHERE DATE(STR_TO_DATE(REPLACE(kksj, ' ', ''), '%Y-%m-%d%H:%i:%s')) 
           BETWEEN ${prevPeriodStart} AND ${prevPeriodEnd} 
     
     UNION ALL 
     
     SELECT 
 -- 	 	 TRIM(SUBSTRING_INDEX(ylgs, '（', 1)) AS 公司名称, 
 IF(cs = '南京市', '南京沛途科技有限公司', TRIM(SUBSTRING_INDEX(ylgs, '（', 1))) AS 公司名称, 
          ROUND(xgje * -1, 2) AS 扣款_金额, 
          zt AS 扣款_状态 
     FROM \`pt-dz-zjdktz_copy1\` 
     WHERE DATE(STR_TO_DATE(REPLACE(sqsj, ' ', ''), '%Y-%m-%d%H:%i:%s')) 
           BETWEEN ${prevPeriodStart} AND ${prevPeriodEnd} 
       AND sqyy NOT LIKE '%司机违规扣款%' 
       AND sqr != '系统操作' 
       AND sqzt = '申请成功' 
       AND tkzt = '调账成功' 
   ) AS previous_data 
   GROUP BY 公司名称 
 ) AS previous ON current.nameValue = previous.nameValue 
 -- 仅插入本期有数据的公司 
 WHERE current.nameValue IS NOT NULL 
 ) AS final_data
 `;

        let insertParams = [];
        if (companyNames && companyNames.length > 0) {
            insertSql += ` WHERE nameValue IN (?)`;
            insertParams.push(companyNames);
        }

        // Add ON DUPLICATE KEY UPDATE just in case
        /*
        insertSql += `
         ON DUPLICATE KEY UPDATE 
         status = VALUES(status), 
         update_time = NOW(), 
         nameValue = VALUES(nameValue), 
         totalAmount = VALUES(totalAmount), 
         totalAmount1 = VALUES(totalAmount1), 
         totalAmount2 = VALUES(totalAmount2), 
         ApplicationNotes = VALUES(ApplicationNotes), 
         listValue = VALUES(listValue);
        `;
        */
        
        await pools({ sql: insertSql, val: insertParams, res, req });
        
        res.send(utils.returnData({ msg: "生成对账单成功" }));

    } catch (err) {
        console.error('生成对账单失败:', err);
        res.send(utils.returnData({ code: -1, msg: "生成失败", err: err.message }));
    }
});

export default router;
