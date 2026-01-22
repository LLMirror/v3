import express from 'express';
import utils from '../utils/index.js';
import pools from '../utils/pools.js';
import xlsx from 'node-xlsx';
import ExcelJS from 'exceljs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const TABLE_MAP = {
    1: 'pt_fy_driver_flow',       // 司机流水
    2: 'pt_fy_settlement_order',  // 结算明细-订单
    3: 'pt_fy_platform_activity', // 平台活动
    4: 'pt_fy_discount_bill'      // 优惠账单
};

// Field Mappings (Header -> DB Column)
const FIELD_MAPPINGS = {
    1: { // Driver Flow
        '司机ID': 'driver_id',
        '司机名称': 'driver_name',
        '城市': 'city',
      
        '运力公司': 'company',
        '结算时间': 'settle_time',
        '交易类目': 'category',
        '交易金额': 'amount',
        '关联类型': 'rel_type',
        '关联编号': 'rel_id',
        '关联流水': 'rel_flow',
        '余额': 'balance',
        '处置ID': 'handle_id',
        '备注': 'remark',
        '车队': 'team'
    },
    2: { // Settlement Order
        '运力公司城市': 'company_city',
       
        '运力公司': 'company',
        '业务类型': 'biz_type',
        '订单号': 'order_id',
        '渠道': 'channel',
        '司机编号': 'driver_no',
        '司机名称': 'driver_name',
        '司机手机号': 'driver_phone',
        '佣金补贴类型': 'subsidy_type',
        '订单创建时间': 'order_create_time',
        '支付完成时间': 'pay_finish_time',
        '订单完成时间': 'order_finish_time',
        '支付状态': 'pay_status',
        '服务形式': 'service_type',
        '行程费': 'trip_fee',
        '远程调度费': 'dispatch_fee',
        '悦享服务费': 'enjoy_fee',
        '司机结算悦享服务费': 'driver_enjoy_fee',
        '悦享服务费抽成比例': 'enjoy_fee_ratio',
        '综合能耗费': 'energy_fee',
        '节假日服务费': 'holiday_fee',
        '红包': 'red_packet',
        '跨城费': 'cross_city_fee',
        '附加费结算给司机': 'surcharge_driver',
        '附加费结算给运力公司': 'surcharge_company',
        '司机结算行程费': 'driver_trip_fee',
        '行程费抽成比例': 'trip_fee_ratio',
        '佣金补贴': 'subsidy',
        '车队': 'team'
    },
    3: { // Platform Activity
        '完成活动时间': 'finish_time',
        '发放奖励时间': 'reward_time',
        '城市': 'city',
        '运力公司': 'company',
        '车队': 'team',
        '司机信息': 'driver_info',
        '司机编号': 'driver_no',
        '平台活动ID': 'activity_id',
        '活动来源': 'source',
        '共补类型': 'subsidy_share_type',
        '活动类型': 'activity_type',
        '奖励类目': 'reward_category',
        '活动名称': 'activity_name',
        '达标条件': 'target_condition',
        '实际达标数据': 'actual_data',
        '奖励金额': 'reward_amount'
    },
    4: { // Discount Bill
        '优惠抵扣时间': 'deduct_time',
        '使用城市': 'city',
       
        '运力公司': 'company',
        '订单号': 'order_id',
        '渠道订单号': 'channel_order_id',
        '优惠id': 'discount_id',
        '优惠类型': 'discount_type',
        '抵扣金额': 'deduct_amount',
        '优惠成本方': 'cost_bearer',
        '车队': 'team'
    }
};

router.get('/template', async (req, res) => {
    try {
        const { tableType } = req.query;
        console.log(`收到下载模板请求: tableType=${tableType}`);
        
        const typeId = Number(tableType);
        const mapping = FIELD_MAPPINGS[typeId];
        
        if (!mapping) {
            return res.send(utils.returnData({ code: -1, msg: "无效的表格类型" }));
        }

        const headers = Object.keys(mapping);
        
        let fileName = 'template.xlsx';
        switch (typeId) {
            case 1: fileName = '司机流水导入模板.xlsx'; break;
            case 2: fileName = '结算明细-订单导入模板.xlsx'; break;
            case 3: fileName = '平台活动导入模板.xlsx'; break;
            case 4: fileName = '优惠账单导入模板.xlsx'; break;
        }

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Sheet1');

        const calculateWidth = (text) => {
            let length = 0;
            if (text) {
                for (const char of text.toString()) {
                    length += char.charCodeAt(0) > 255 ? 2 : 1;
                }
            }
            return Math.max(length * 1.5 + 2, 12);
        };

        sheet.columns = headers.map(h => ({ 
            header: h, 
            key: h, 
            width: calculateWidth(h) 
        }));

        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        const headerFill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFB8B8EA' } 
        };

        const columnCount = headers.length;
        for (let r = 1; r <= 50; r++) {
            const row = sheet.getRow(r);
            for (let c = 1; c <= columnCount; c++) {
                const cell = row.getCell(c);
                cell.border = borderStyle;
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
        console.error('Template download error:', err);
        res.send(utils.returnData({ code: -1, msg: "下载模板失败" }));
    }
});

// Import Preview (Parse & Check)
router.post('/import-preview', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.send(utils.returnData({ code: 1, data: { success: false, msg: "未上传文件" } }));
        }
        
        const { tableType, yearMonth } = req.body;
        const typeId = Number(tableType);
        const mapping = FIELD_MAPPINGS[typeId];
        const tableName = TABLE_MAP[typeId];

        if (!mapping || !tableName) {
            return res.send(utils.returnData({ code: 1, data: { success: false, msg: "无效的数据类型" } }));
        }

        // Parse Excel from Buffer
        const workSheets = xlsx.parse(req.file.buffer);
        const sheet = workSheets[0];
        const data = sheet.data;

        if (data.length < 2) {
            return res.send(utils.returnData({ code: 1, data: { success: false, msg: "Excel文件为空或格式不正确" } }));
        }

        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const requiredHeaders = Object.keys(mapping);
        
        // Validate Headers
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            return res.send(utils.returnData({ 
                code: 1, 
                data: { success: false, msg: `表头校验失败，缺失字段: ${missingHeaders.join(', ')}` }
            }));
        }

        // Check if data exists for this month
        let exists = false;
        let lastTime = '';
        let totalCount = 0;
        
        try {
            const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
            const { result: tableExists } = await pools({ sql: checkTableSql, res, req });
            
            if (tableExists.length > 0) {
                const checkSql = `SELECT COUNT(*) as total, MAX(\`upload_time\`) as lastTime FROM \`${tableName}\` WHERE \`year_month\` = ?`;
                const { result } = await pools({ sql: checkSql, val: [yearMonth], res, req });
                if (result[0].total > 0) {
                    exists = true;
                    totalCount = result[0].total;
                    lastTime = result[0].lastTime;
                }
            }
        } catch (e) {
            console.warn('Table check failed, likely table does not exist yet', e);
        }

        // Process All Data
        const list = [];
        const rawRows = data.slice(1);
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        
        // Map data to object
        const headerIndexMap = {};
        headers.forEach((h, idx) => {
            if (mapping[h]) {
                headerIndexMap[mapping[h]] = idx;
            }
        });

        rawRows.forEach(row => {
            if (!row || row.length === 0) return;
            
            const item = {
                id: uuidv4(),
                upload_time: now,
                year_month: yearMonth
            };
            
            Object.keys(headerIndexMap).forEach(key => {
                const idx = headerIndexMap[key];
                item[key] = row[idx] !== undefined ? row[idx] : null;
            });
            list.push(item);
        });

        res.send(utils.returnData({
            msg: "解析成功",
            data: {
                success: true,
                exists,
                lastTime,
                totalCount,
                list, // Return all data
                previewHeaders: Object.keys(mapping).map(k => ({ prop: mapping[k], label: k })),
                totalRows: list.length
            }
        }));

    } catch (err) {
        console.error(err);
        res.send(utils.returnData({ code: 1, data: { success: false, msg: "解析失败: " + err.message } }));
    }
});

// Save Data
router.post('/save-data', async (req, res) => {
    try {
        const { tableType, yearMonth, list, overwrite } = req.body;
        const typeId = Number(tableType);
        const mapping = FIELD_MAPPINGS[typeId];
        const tableName = TABLE_MAP[typeId];

        if (!mapping || !tableName) return res.send(utils.returnData({ code: 1, data: { success: false, msg: "无效的数据类型" } }));
        if (!list || list.length === 0) return res.send(utils.returnData({ code: 1, data: { success: false, msg: "没有数据需要保存" } }));

        // Ensure table exists
        const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
        const { result: tableExists } = await pools({ sql: checkTableSql, res, req });

        if (tableExists.length === 0) {
            const cols = [
                'id VARCHAR(64) NOT NULL PRIMARY KEY',
                '`upload_time` DATETIME',
                '`year_month` VARCHAR(20)'
            ];
            Object.values(mapping).forEach(col => cols.push(`\`${col}\` TEXT`));
            const createSql = `CREATE TABLE \`${tableName}\` (${cols.join(',')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
            await pools({ sql: createSql, res, req });
        }

        // Handle overwrite
        if (overwrite) {
            const deleteSql = `DELETE FROM \`${tableName}\` WHERE \`year_month\` = ?`;
            await pools({ sql: deleteSql, val: [yearMonth], res, req });
        }

        // Batch Insert
        const dbCols = ['id', 'upload_time', 'year_month', ...Object.values(mapping)];
        const colsStr = dbCols.map(c => `\`${c}\``).join(',');
        
        const BATCH_SIZE = 1000;
        
        for (let i = 0; i < list.length; i += BATCH_SIZE) {
            const batch = list.slice(i, i + BATCH_SIZE);
            let batchSql = `INSERT INTO \`${tableName}\` (${colsStr}) VALUES `;
            let batchVals = [];
            
            batch.forEach(item => {
                const placeholders = dbCols.map(() => '?').join(',');
                batchSql += `(${placeholders}),`;
                
                const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
                const rowVals = [
                    uuidv4(),
                    now,
                    yearMonth,
                    ...Object.values(mapping).map(col => item[col] !== undefined ? item[col] : null)
                ];
                batchVals.push(...rowVals);
            });
            
            batchSql = batchSql.slice(0, -1);
            await pools({ sql: batchSql, val: batchVals, res, req });
        }

        res.send(utils.returnData({ msg: "导入成功", data: { success: true, count: list.length } }));

    } catch (err) {
        console.error(err);
        res.send(utils.returnData({ code: 1, data: { success: false, msg: "保存失败: " + err.message } }));
    }
});

export default router;
