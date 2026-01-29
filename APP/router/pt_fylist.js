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
    4: 'pt_fy_discount_bill',     // 优惠账单
    5: 'pt_fy_driver_info'        // 司机信息
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
        '行程费抽成比例': 'driver_trip_fee_ratio',
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
    },
    5: { // Driver Info
        '司机编号': 'driver_no',
        '司机姓名': 'driver_name',
        '司机类型': 'driver_type',
        '分组': 'group_name',
        '身份证地址': 'id_card_address',
        '网络预约出租汽车驾驶员证照片': 'driver_cert_photo',
        '监督卡照片': 'supervise_card_photo',
        '网络预约出租汽车运输证照片': 'transport_cert_photo',
        '车辆ID': 'vehicle_id',
        '车牌号': 'plate_no',
        '标签': 'tags',
        '车辆品牌': 'vehicle_brand',
        '车系': 'vehicle_series',
        '城市': 'city',
        '运力公司': 'company',
        '所属车队': 'team',
        '入驻时间': 'entry_time',
        '激活时间': 'activate_time',
        '平台调度封禁状态': 'platform_dispatch_ban_status',
        '渠道实时单调度封禁状态': 'realtime_dispatch_ban_status',
        '渠道预约单调度封禁状态': 'appointment_dispatch_ban_status',
        '司机账号停用类型': 'account_disable_type'
    }
};

// Numeric fields that need normalization per table type
const NUMERIC_FIELDS = {
    3: ['reward_amount'] // 平台活动：奖励金额
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
            case 5: fileName = '司机信息模板.xlsx'; break;
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

router.post('/settlement-summary', async (req, res) => {
    try {
        const { company, month } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少月份' } }));
        const clean = (name) => {
            if (!name) return '';
            let s = String(name);
            s = s.replace(/[\(（][^（）\(\)]*[\)）]/g, '');
            s = s.split('-')[0];
            s = s.trim();
            return s;
        };
        const cleanCompany = clean(company);
        const baseExpr = "TRIM(REGEXP_REPLACE(SUBSTRING_INDEX(`company`, '-', 1), '（[^）]*）', ''))";
        let sql = `
            SELECT
              ${baseExpr} AS clean_company,
              COUNT(CASE WHEN subsidy_type = '不免佣' THEN 1 ELSE NULL END) AS unfree_qty,
              COUNT(CASE WHEN subsidy_type != '不免佣' THEN 1 ELSE NULL END) AS free_qty,
              COUNT(*) AS total_qty,
              ROUND(SUM(CASE WHEN subsidy_type = '不免佣' THEN trip_fee ELSE 0 END), 2) AS unfree_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type != '不免佣' THEN trip_fee ELSE 0 END), 2) AS free_trip_fee,
              ROUND(SUM(trip_fee), 2) AS total_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type = '不免佣' THEN driver_trip_fee ELSE 0 END), 2) AS unfree_driver_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type != '不免佣' THEN driver_trip_fee ELSE 0 END), 2) AS free_driver_trip_fee,
              ROUND(SUM(driver_trip_fee), 2) AS total_driver_trip_fee
            FROM \`pt_fy_settlement_order\`
            WHERE \`year_month\` = ?
        `;
        const vals = [month];
        if (cleanCompany) {
            sql += ` AND ${baseExpr} = ?`;
            vals.push(cleanCompany);
        }
        sql += ` GROUP BY clean_company`;
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.get('/rules-template', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const w = (t) => {
            let n = 0;
            if (t) for (const c of String(t)) n += c.charCodeAt(0) > 255 ? 2 : 1;
            return Math.max(n * 1.5 + 2, 12);
        };
        const sheet1 = workbook.addWorksheet('基础配置');
        const h1 = ['政策ID','分类','端口','计算基数','双计算开关','是否减去免佣','是否扣除墨竹','返佣方式','费率/单价','免佣费率/单价','不免佣费率/单价','备注'];
        sheet1.columns = h1.map(h => ({ header: h, key: h, width: w(h) }));
        const sheet2 = workbook.addWorksheet('阶梯规则');
        const h2 = ['政策ID','规则类型','维度','前几月','计算基数','最小值 (>=)','最大值 (<)','返佣方式','双计算开关','免佣费率/单价','不免佣费率/单价','费率/单价','扣减免佣'];
        sheet2.columns = h2.map(h => ({ header: h, key: h, width: w(h) }));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent('规则导入模板.xlsx')}`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.send(utils.returnData({ code: 1, data: { success: false, msg: "下载模板失败: " + err.message } }));
    }
});

router.post('/settlement-detail', async (req, res) => {
    try {
        const { companies = [], month } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少月份' } }));
        const list = Array.isArray(companies) ? companies.filter(Boolean) : [];
        let sql = `
            SELECT
              \`company\` AS company,
              COUNT(CASE WHEN subsidy_type = '不免佣' THEN 1 ELSE NULL END) AS unfree_qty,
              COUNT(CASE WHEN subsidy_type != '不免佣' THEN 1 ELSE NULL END) AS free_qty,
              COUNT(*) AS total_qty,
              ROUND(SUM(CASE WHEN subsidy_type = '不免佣' THEN trip_fee ELSE 0 END), 2) AS unfree_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type != '不免佣' THEN trip_fee ELSE 0 END), 2) AS free_trip_fee,
              ROUND(SUM(trip_fee), 2) AS total_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type = '不免佣' THEN driver_trip_fee ELSE 0 END), 2) AS unfree_driver_trip_fee,
              ROUND(SUM(CASE WHEN subsidy_type != '不免佣' THEN driver_trip_fee ELSE 0 END), 2) AS free_driver_trip_fee,
              ROUND(SUM(driver_trip_fee), 2) AS total_driver_trip_fee
            FROM \`pt_fy_settlement_order\`
            WHERE \`year_month\` = ?
        `;
        const vals = [month];
        if (list.length > 0) {
            const placeholders = list.map(() => '?').join(',');
            sql += ` AND \`company\` IN (${placeholders})`;
            vals.push(...list);
        }
        sql += ` GROUP BY \`company\``;
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.post('/rules-import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.send(utils.returnData({ code: 1, data: { success: false, msg: "未上传文件" } }));
        }
        const ws = xlsx.parse(req.file.buffer);
        const toNum = (v) => {
            if (v === null || v === undefined) return null;
            if (typeof v === 'number') return v;
            const s = String(v).trim();
            if (!s) return null;
            let p;
            if (s.endsWith('%')) {
                const n = parseFloat(s.replace('%',''));
                p = Number.isNaN(n) ? null : n / 100;
            } else {
                const n = parseFloat(s.replace(/[^\d.\-\.]/g,''));
                p = Number.isNaN(n) ? null : n;
            }
            return p;
        };
        const toStr = (v) => {
            if (v === null || v === undefined) return null;
            return String(v).trim();
        };
        let baseSimpleCount = 0, ladderCount = 0;
        const baseSimpleRows = [];
        const ladderRows = [];
        const baseHeaders = ['政策ID','分类','端口','计算基数','双计算开关','是否减去免佣','是否扣除墨竹','返佣方式','费率/单价','免佣费率/单价','不免佣费率/单价','备注'];
        const ladderHeaders = ['政策ID','规则类型','维度','前几月','计算基数','最小值 (>=)','最大值 (<)','返佣方式','双计算开关','免佣费率/单价','不免佣费率/单价','费率/单价','扣减免佣'];
        if (ws[0] && ws[0].data && ws[0].data.length > 1) {
            const data = ws[0].data;
            const headers = (data[0] || []).map(v => v ? String(v).trim() : '');
            const expected = baseHeaders;
            const missing = expected.filter(h => !headers.includes(h));
            if (missing.length > 0) {
                return res.send(utils.returnData({ code: 1, data: { success: false, msg: "基础配置缺失字段: " + missing.join(', ') } }));
            }
            const idx = (name) => headers.indexOf(name);
            data.slice(1).forEach(r => {
                if (!r || r.length === 0) return;
                const policyId = toStr(r[idx('政策ID')]);
                const category = r[idx('分类')] || null;
                const port = r[idx('端口')] || null;
                const baseMetric = r[idx('计算基数')] || null;
                const doubleCalc = String(r[idx('双计算开关')] || '').includes('是') ? 1 : 0;
                const subtractFree = String(r[idx('是否减去免佣')] || '').includes('是') ? 1 : 0;
                const subtractMoZhu = String(r[idx('是否扣除墨竹')] || '').includes('是') ? 1 : 0;
                const method = r[idx('返佣方式')] || null;
                const rateVal = toNum(r[idx('费率/单价')]);
                const freeRateVal = toNum(r[idx('免佣费率/单价')]);
                const unfreeRateVal = toNum(r[idx('不免佣费率/单价')]);
                const remark = r[idx('备注')] || null;
                const rateDisplay = method === '百分比'
                    ? (rateVal !== null && rateVal !== undefined ? ((rateVal * 100).toFixed(2) + '%') : '')
                    : (rateVal !== null && rateVal !== undefined ? Number(rateVal).toFixed(2) : '');
                const freeRateDisplay = method === '百分比'
                    ? (freeRateVal !== null && freeRateVal !== undefined ? ((freeRateVal * 100).toFixed(2) + '%') : '')
                    : (freeRateVal !== null && freeRateVal !== undefined ? Number(freeRateVal).toFixed(2) : '');
                const unfreeRateDisplay = method === '百分比'
                    ? (unfreeRateVal !== null && unfreeRateVal !== undefined ? ((unfreeRateVal * 100).toFixed(2) + '%') : '')
                    : (unfreeRateVal !== null && unfreeRateVal !== undefined ? Number(unfreeRateVal).toFixed(2) : '');
                baseSimpleRows.push({
                    policy_id: policyId,
                    category,
                    port,
                    base_metric: baseMetric,
                    double_calc: doubleCalc,
                    subtract_free: subtractFree,
                    subtract_mozhu: subtractMoZhu,
                    method,
                    rate_value: rateVal,
                    free_rate_value: freeRateVal,
                    unfree_rate_value: unfreeRateVal,
                    rate_display: rateDisplay,
                    free_rate_display: freeRateDisplay,
                    unfree_rate_display: unfreeRateDisplay,
                    remark
                });
                baseSimpleCount++;
            });
        }
        if (ws[1] && ws[1].data && ws[1].data.length > 1) {
            const data = ws[1].data;
            const headers = (data[0] || []).map(v => v ? String(v).trim() : '');
            const expected = ladderHeaders;
            const missing = expected.filter(h => !headers.includes(h));
            if (missing.length > 0) {
                return res.send(utils.returnData({ code: 1, data: { success: false, msg: "阶梯规则缺失字段: " + missing.join(', ') } }));
            }
            const idx = (name) => headers.indexOf(name);
            data.slice(1).forEach(r => {
                if (!r || r.length === 0) return;
                const policyId = toStr(r[idx('政策ID')]);
                const ruleType = r[idx('规则类型')] || null;
                const dimension = r[idx('维度')] || null;
                const monthsPrior = toNum(r[idx('前几月')]);
                const metric = r[idx('计算基数')] || null;
                const minVal = toNum(r[idx('最小值 (>=)')]);
                const maxVal = toNum(r[idx('最大值 (<)')]);
                const method = r[idx('返佣方式')] || null;
                const doubleCalc = String(r[idx('双计算开关')] || '').includes('是') ? 1 : 0;
                const freeRateVal = toNum(r[idx('免佣费率/单价')]);
                const unfreeRateVal = toNum(r[idx('不免佣费率/单价')]);
                const ruleValue = toNum(r[idx('费率/单价')]);
                const subtractFree = String(r[idx('扣减免佣')] || '').includes('是') ? 1 : 0;
                const ruleDisplay = method === '百分比'
                    ? (ruleValue !== null && ruleValue !== undefined ? ((ruleValue * 100).toFixed(2) + '%') : '')
                    : (ruleValue !== null && ruleValue !== undefined ? Number(ruleValue).toFixed(2) : '');
                const freeRateDisplay = method === '百分比'
                    ? (freeRateVal !== null && freeRateVal !== undefined ? ((freeRateVal * 100).toFixed(2) + '%') : '')
                    : (freeRateVal !== null && freeRateVal !== undefined ? Number(freeRateVal).toFixed(2) : '');
                const unfreeRateDisplay = method === '百分比'
                    ? (unfreeRateVal !== null && unfreeRateVal !== undefined ? ((unfreeRateVal * 100).toFixed(2) + '%') : '')
                    : (unfreeRateVal !== null && unfreeRateVal !== undefined ? Number(unfreeRateVal).toFixed(2) : '');
                ladderRows.push({
                    policy_id: policyId,
                    rule_type: ruleType,
                    dimension,
                    months_prior: monthsPrior,
                    metric,
                    min_val: minVal,
                    max_val: maxVal,
                    method,
                    double_calc: doubleCalc,
                    rule_value: ruleValue,
                    rule_display: ruleDisplay,
                    free_rate_value: freeRateVal,
                    unfree_rate_value: unfreeRateVal,
                    free_rate_display: freeRateDisplay,
                    unfree_rate_display: unfreeRateDisplay,
                    subtract_free: subtractFree
                });
                ladderCount++;
            });
        }
        return res.send(utils.returnData({
            msg: "规则解析成功",
            data: {
                success: true,
                baseSimpleHeaders: [
                    { prop: 'policy_id', label: '政策ID' },
                    { prop: 'category', label: '分类' },
                    { prop: 'port', label: '端口' },
                    { prop: 'base_metric', label: '计算基数' },
                    { prop: 'double_calc', label: '双计算开关' },
                    { prop: 'subtract_free', label: '是否减去免佣' },
                    { prop: 'subtract_mozhu', label: '是否扣除墨竹' },
                    { prop: 'method', label: '返佣方式' },
                    { prop: 'rate_display', label: '费率/单价' },
                    { prop: 'free_rate_display', label: '免佣费率/单价' },
                    { prop: 'unfree_rate_display', label: '不免佣费率/单价' },
                    { prop: 'remark', label: '备注' }
                ],
                ladderHeaders: [
                    { prop: 'policy_id', label: '政策ID' },
                    { prop: 'rule_type', label: '规则类型' },
                    { prop: 'dimension', label: '维度' },
                    { prop: 'months_prior', label: '前几月' },
                    { prop: 'metric', label: '计算基数' },
                    { prop: 'min_val', label: '最小值 (>=)' },
                    { prop: 'max_val', label: '最大值 (<)' },
                    { prop: 'method', label: '返佣方式' },
                    { prop: 'double_calc', label: '双计算开关' },
                    { prop: 'free_rate_display', label: '免佣费率/单价' },
                    { prop: 'unfree_rate_display', label: '不免佣费率/单价' },
                    { prop: 'rule_display', label: '费率/单价' },
                    { prop: 'subtract_free', label: '扣减免佣' }
                ],
                baseSimpleRows,
                ladderRows,
                baseSimpleCount,
                ladderCount
            }
        }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: "规则导入失败: " + err.message } }));
    }
});

router.post('/driver-flow-summary', async (req, res) => {
    try {
        const { company, month } = req.body || {};
        if (!company || !month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少公司或月份' } }));
        const baseExpr = "TRIM(REGEXP_REPLACE(SUBSTRING_INDEX(`company`, '-', 1), '（[^）]*）', ''))";
        const sql = `
            SELECT
              t.clean_company,
              t.driver_id,
              t.driver_name,
              t.order_qty,
              t.order_income,
              t.reward_income,
              t.total_income,
              MAX(LEFT(di.activate_time, 7)) AS activate_month,
              CASE WHEN MAX(LEFT(di.activate_time, 7)) = ? THEN '是' ELSE '否' END AS activated_in_month
            FROM (
              SELECT
                ${baseExpr} AS clean_company,
                \`driver_id\` AS driver_id,
                \`driver_name\` AS driver_name,
                COUNT(CASE WHEN \`category\` = '订单收入' THEN 1 ELSE NULL END) AS order_qty,
                ROUND(SUM(CASE WHEN \`category\` = '订单收入' THEN \`amount\` ELSE 0 END), 2) AS order_income,
                ROUND(SUM(CASE WHEN \`category\` != '订单收入' THEN \`amount\` ELSE 0 END), 2) AS reward_income,
                ROUND(SUM(\`amount\`), 2) AS total_income
              FROM \`pt_fy_driver_flow\`
              WHERE \`year_month\` = ?
                AND ${baseExpr} = ?
                AND \`category\` NOT IN ('提现支出','提现返还','手动扣款','租赁支出')
              GROUP BY clean_company, \`driver_id\`, \`driver_name\`
            ) t
            LEFT JOIN \`pt_fy_driver_info\` di
              ON di.\`driver_no\` = t.\`driver_id\`
            GROUP BY t.clean_company, t.driver_id, t.driver_name, t.order_qty, t.order_income, t.reward_income, t.total_income
            ORDER BY t.total_income DESC
        `;
        const vals = [month, month, company];
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.post('/rules-save', async (req, res) => {
    try {
        const { baseSimpleRows = [], ladderRows = [], overwrite = false, overwriteBasePolicyIds = [], overwriteLadderPolicyIds = [] } = req.body;
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const ensureSql1 = `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_base_simple\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            policy_id VARCHAR(64),
            category VARCHAR(32),
            port VARCHAR(32),
            base_metric VARCHAR(32),
            double_calc TINYINT(1),
            subtract_free TINYINT(1),
            method VARCHAR(32),
            rate_value DECIMAL(20,6),
            free_rate_value DECIMAL(20,6),
            unfree_rate_value DECIMAL(20,6),
            remark TEXT,
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql1, res, req });
        const ensureSql2 = `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_ladder\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            policy_id VARCHAR(64),
            rule_type VARCHAR(64),
            dimension VARCHAR(32),
            months_prior INT,
            metric VARCHAR(32),
            min_val DECIMAL(20,6),
            max_val DECIMAL(20,6),
            method VARCHAR(32),
            rule_value DECIMAL(20,6),
            double_calc TINYINT(1),
            free_rate_value DECIMAL(20,6),
            unfree_rate_value DECIMAL(20,6),
            subtract_free TINYINT(1),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql2, res, req });
        const ensureCols = async (table, req, res, cols) => {
            const { result } = await pools({ sql: `SHOW COLUMNS FROM \`${table}\``, res, req });
            const existingMap = new Map(result.map(r => [r.Field, r.Type]));
            for (const c of cols) {
                if (!existingMap.has(c.name)) {
                    await pools({ sql: `ALTER TABLE \`${table}\` ADD COLUMN \`${c.name}\` ${c.type}`, res, req });
                    existingMap.set(c.name, c.type);
                } else {
                    const curType = String(existingMap.get(c.name)).toLowerCase();
                    const wantType = String(c.type).toLowerCase();
                    const typeMismatch =
                        (wantType.startsWith('varchar') && !curType.includes('varchar')) ||
                        (wantType.startsWith('datetime') && !curType.includes('datetime')) ||
                        (wantType.startsWith('int') && !curType.includes('int')) ||
                        (wantType.startsWith('decimal') && !curType.includes('decimal'));
                    if (typeMismatch) {
                        await pools({ sql: `ALTER TABLE \`${table}\` MODIFY COLUMN \`${c.name}\` ${c.type}`, res, req });
                        existingMap.set(c.name, c.type);
                    }
                }
            }
            if (existingMap.has('created_at') && !existingMap.has('upload_time')) {
                await pools({ sql: `ALTER TABLE \`${table}\` CHANGE COLUMN \`created_at\` \`upload_time\` DATETIME`, res, req });
                existingMap.delete('created_at');
                existingMap.set('upload_time', 'datetime');
            }
            if (existingMap.has('updated_at') && !existingMap.has('updated_time')) {
                await pools({ sql: `ALTER TABLE \`${table}\` CHANGE COLUMN \`updated_at\` \`updated_time\` DATETIME`, res, req });
                existingMap.delete('updated_at');
                existingMap.set('updated_time', 'datetime');
            }
        };
        await ensureCols('pt_fy_rules_base_simple', req, res, [
            { name: 'policy_id', type: 'VARCHAR(64)' },
            { name: 'double_calc', type: 'TINYINT(1)' },
            { name: 'subtract_mozhu', type: 'TINYINT(1)' },
            { name: 'method', type: 'VARCHAR(32)' },
            { name: 'free_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'unfree_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'upload_time', type: 'DATETIME' },
            { name: 'updated_time', type: 'DATETIME' }
        ]);
        await ensureCols('pt_fy_rules_ladder', req, res, [
            { name: 'policy_id', type: 'VARCHAR(64)' },
            { name: 'months_prior', type: 'INT' },
            { name: 'upload_time', type: 'DATETIME' },
            { name: 'updated_time', type: 'DATETIME' }
        ]);
        if (overwrite) {
            await pools({ sql: 'DELETE FROM `pt_fy_rules_base_simple`', res, req });
            await pools({ sql: 'DELETE FROM `pt_fy_rules_ladder`', res, req });
        } else {
            const delByPolicyIds = async (table, ids) => {
                if (!ids || ids.length === 0) return;
                const placeholders = ids.map(() => '?').join(',');
                const sql = `DELETE FROM \`${table}\` WHERE \`policy_id\` IN (${placeholders})`;
                await pools({ sql, val: ids, res, req });
            };
            await delByPolicyIds('pt_fy_rules_base_simple', overwriteBasePolicyIds);
            await delByPolicyIds('pt_fy_rules_ladder', overwriteLadderPolicyIds);
        }
        let savedBase = 0, savedLadder = 0;
        if (baseSimpleRows.length > 0) {
            const cols = ['id','policy_id','category','port','base_metric','double_calc','subtract_free','method','rate_value','free_rate_value','unfree_rate_value','remark','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_rules_base_simple\` (\`${cols.join('`,`')}\`) VALUES `;
            let vals = [];
            baseSimpleRows.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.policy_id ?? null, r.category || null, r.port || null, r.base_metric || null, r.double_calc ? 1 : 0, r.subtract_free ? 1 : 0, r.method || null, r.rate_value ?? null, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.remark || null, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            savedBase = baseSimpleRows.length;
        }
        if (ladderRows.length > 0) {
            const cols = ['id','policy_id','rule_type','dimension','months_prior','metric','min_val','max_val','method','rule_value','double_calc','free_rate_value','unfree_rate_value','subtract_free','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_rules_ladder\` (\`${cols.join('`,`')}\`) VALUES `;
            let vals = [];
            ladderRows.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.policy_id ?? null, r.rule_type || null, r.dimension || null, r.months_prior ?? null, r.metric || null, r.min_val ?? null, r.max_val ?? null, r.method || null, r.rule_value ?? null, r.double_calc ? 1 : 0, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.subtract_free ? 1 : 0, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            savedLadder = ladderRows.length;
        }
        return res.send(utils.returnData({ msg: '规则保存成功', data: { success: true, baseSaved: savedBase, ladderSaved: savedLadder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '规则保存失败: ' + err.message } }));
    }
});
router.post('/rules-check-duplicates', async (req, res) => {
    try {
        const { basePolicyIds = [], ladderPolicyIds = [] } = req.body || {};
        const checkTable = async (table, ids) => {
            if (!ids || ids.length === 0) return { duplicates: [] };
            const placeholders = ids.map(() => '?').join(',');
            const aggSql = `SELECT \`policy_id\`, COUNT(*) AS cnt FROM \`${table}\` WHERE \`policy_id\` IN (${placeholders}) GROUP BY \`policy_id\``;
            const { result: agg } = await pools({ sql: aggSql, val: ids, res, req });
            const duplicates = [];
            for (const r of agg) {
                if (table === 'pt_fy_rules_base_simple') {
                    const { result: sample } = await pools({
                        sql: 'SELECT `category`,`port`,`base_metric`,`method`,`rate_value` FROM `pt_fy_rules_base_simple` WHERE `policy_id` = ? LIMIT 1',
                        val: [r.policy_id],
                        res,
                        req
                    });
                    const s = sample && sample[0] ? sample[0] : {};
                    duplicates.push({
                        policy_id: r.policy_id,
                        count: r.cnt,
                        category: s.category || null,
                        port: s.port || null,
                        base_metric: s.base_metric || null,
                        method: s.method || null,
                        rate_value: s.rate_value ?? null
                    });
                } else {
                    const { result: sample } = await pools({
                        sql: 'SELECT `rule_type`,`dimension`,`metric`,`method`,`rule_value` FROM `pt_fy_rules_ladder` WHERE `policy_id` = ? LIMIT 1',
                        val: [r.policy_id],
                        res,
                        req
                    });
                    const s = sample && sample[0] ? sample[0] : {};
                    duplicates.push({
                        policy_id: r.policy_id,
                        count: r.cnt,
                        rule_type: s.rule_type || null,
                        dimension: s.dimension || null,
                        metric: s.metric || null,
                        method: s.method || null,
                        rule_value: s.rule_value ?? null
                    });
                }
            }
            return { duplicates };
        };
        const base = await checkTable('pt_fy_rules_base_simple', basePolicyIds);
        const ladder = await checkTable('pt_fy_rules_ladder', ladderPolicyIds);
        return res.send(utils.returnData({ msg: '重复校验成功', data: { base, ladder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '重复校验失败: ' + err.message } }));
    }
});
router.get('/rules-stats', async (req, res) => {
    try {
        const baseSql = 'SHOW TABLES LIKE \'pt_fy_rules_base_simple\'';
        const ladderSql = 'SHOW TABLES LIKE \'pt_fy_rules_ladder\'';
        let baseCount = 0, ladderCount = 0;
        const { result: baseExists } = await pools({ sql: baseSql, res, req });
        if (baseExists.length > 0) {
            const { result } = await pools({ sql: 'SELECT COUNT(*) AS c FROM `pt_fy_rules_base_simple`', res, req });
            baseCount = result[0]?.c || 0;
        }
        const { result: ladderExists } = await pools({ sql: ladderSql, res, req });
        if (ladderExists.length > 0) {
            const { result } = await pools({ sql: 'SELECT COUNT(*) AS c FROM `pt_fy_rules_ladder`', res, req });
            ladderCount = result[0]?.c || 0;
        }
        return res.send(utils.returnData({ msg: '规则统计成功', data: { baseCount, ladderCount } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '统计失败: ' + err.message } }));
    }
});
router.post('/rules-query', async (req, res) => {
    try {
        const { table = 'base', page = 1, size = 20, policyId } = req.body || {};
        const tbl = table === 'ladder' ? 'pt_fy_rules_ladder' : 'pt_fy_rules_base_simple';
        const offset = (Number(page) - 1) * Number(size);
        let where = '';
        let vals = [];
        if (policyId) {
            where = 'WHERE `policy_id` = ?';
            vals = [policyId];
        }
        const listSql = `SELECT * FROM \`${tbl}\` ${where} ORDER BY \`policy_id\` ASC LIMIT ? OFFSET ?`;
        vals.push(Number(size), Number(offset));
        const countSql = `SELECT COUNT(*) AS c FROM \`${tbl}\` ${where}`;
        const { result: list } = await pools({ sql: listSql, val: vals, res, req });
        const { result: cnt } = await pools({ sql: countSql, val: policyId ? [policyId] : [], res, req });
        return res.send(utils.returnData({ msg: '查询成功', total: cnt[0]?.c || 0, data: { list } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});

router.get('/rules-in-use', async (req, res) => {
    try {
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        const { result } = await pools({ sql: 'SELECT `base_policy_id`,`ladder_policy_id` FROM `pt_fy_company_policy`', res, req });
        const baseSet = new Set();
        const ladderSet = new Set();
        for (const r of (result || [])) {
            if (r.base_policy_id) baseSet.add(String(r.base_policy_id));
            if (r.ladder_policy_id) {
                try {
                    const arr = JSON.parse(r.ladder_policy_id);
                    if (Array.isArray(arr)) {
                        arr.forEach(x => { if (x && x.policy_id) ladderSet.add(String(x.policy_id)); });
                    }
                } catch {}
            }
        }
        return res.send(utils.returnData({ msg: '查询成功', data: { base: Array.from(baseSet), ladder: Array.from(ladderSet) } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
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
        const numericSet = new Set(NUMERIC_FIELDS[typeId] || []);
        const toNumber = (val) => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return val;
            const s = String(val).trim();
            if (!s) return null;
            const parsed = parseFloat(s.replace(/[^\d.\-\.]/g, ''));
            return Number.isNaN(parsed) ? null : parsed;
        };

        rawRows.forEach(row => {
            if (!row || row.length === 0) return;
            
            const item = {
                id: uuidv4(),
                upload_time: now,
                year_month: yearMonth
            };
            
            Object.keys(headerIndexMap).forEach(key => {
                const idx = headerIndexMap[key];
                const rawVal = row[idx] !== undefined ? row[idx] : null;
                item[key] = numericSet.has(key) ? toNumber(rawVal) : rawVal;
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

router.post('/company-bank/query', async (req, res) => {
    try {
        const { month, company } = req.body || {};
        const ensurePolicy = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensurePolicy, res, req });
        const ensureBank = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_bank\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            account_name VARCHAR(256),
            account_number VARCHAR(64),
            payment_info VARCHAR(256),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureBank, res, req });
        let sql = `
          SELECT DISTINCT p.company,
                 b.account_name,
                 b.account_number,
                 b.payment_info
          FROM \`pt_fy_company_policy\` p
          LEFT JOIN \`pt_fy_company_bank\` b
            ON b.company = p.company
           AND b.updated_time = (
              SELECT MAX(\`updated_time\`)
              FROM \`pt_fy_company_bank\` 
              WHERE \`company\` = p.company
           )
        `;
        const conds = [];
        const vals = [];
        if (month) { conds.push('p.month = ?'); vals.push(month); }
        if (company) { conds.push('p.company = ?'); vals.push(company); }
        if (conds.length > 0) sql += ` WHERE ` + conds.join(' AND ');
        sql += ` ORDER BY p.company ASC`;
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});

router.post('/company-bank/save', async (req, res) => {
    try {
        const { list = [] } = req.body || {};
        const ensureBank = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_bank\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            account_name VARCHAR(256),
            account_number VARCHAR(64),
            payment_info VARCHAR(256),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureBank, res, req });
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        let saved = 0;
        for (const r of Array.isArray(list) ? list : []) {
            const company = r.company || '';
            if (!company) continue;
            const { result } = await pools({ sql: 'SELECT id FROM `pt_fy_company_bank` WHERE `company` = ? LIMIT 1', val: [company], res, req });
            if (result && result.length > 0) {
                const id = result[0].id;
                await pools({
                    sql: 'UPDATE `pt_fy_company_bank` SET `account_name`=?,`account_number`=?,`payment_info`=?,`updated_time`=? WHERE `id`=?',
                    val: [r.account_name || '', r.account_number || '', r.payment_info || '', now, id],
                    res, req
                });
            } else {
                await pools({
                    sql: 'INSERT INTO `pt_fy_company_bank` (`id`,`company`,`account_name`,`account_number`,`payment_info`,`upload_time`,`updated_time`) VALUES (?,?,?,?,?,?,?)',
                    val: [uuidv4(), company, r.account_name || '', r.account_number || '', r.payment_info || '', now, now],
                    res, req
                });
            }
            saved++;
        }
        return res.send(utils.returnData({ msg: '保存成功', data: { success: true, saved } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '保存失败: ' + err.message } }));
    }
});
router.post('/discount-summary', async (req, res) => {
    try {
        const { month, teams = [] } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少月份' } }));
        const baseExpr = "TRIM(REGEXP_REPLACE(SUBSTRING_INDEX(`team`, '-', 1), '（[^）]*）', ''))";
        let sql = `
            SELECT
              ${baseExpr} AS clean_team,
              ROUND(SUM(CASE WHEN \`cost_bearer\` = '平台' THEN \`deduct_amount\` ELSE 0 END), 2) AS platform_bear,
              ROUND(SUM(CASE WHEN \`cost_bearer\` = '高德渠道' THEN \`deduct_amount\` ELSE 0 END), 2) AS gaode_bear
            FROM \`pt_fy_discount_bill\`
            WHERE \`year_month\` = ?
        `;
        const vals = [month];
        if (Array.isArray(teams) && teams.length > 0) {
            const placeholders = teams.map(() => '?').join(',');
            sql += ` AND ${baseExpr} IN (${placeholders})`;
            vals.push(...teams);
        }
        sql += ` GROUP BY clean_team ORDER BY clean_team ASC`;
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.post('/rules-delete-by-policy', async (req, res) => {
    try {
        const { basePolicyIds = [], ladderPolicyIds = [] } = req.body || {};
        let deletedBase = 0, deletedLadder = 0;
        if (Array.isArray(basePolicyIds) && basePolicyIds.length > 0) {
            const placeholders = basePolicyIds.map(() => '?').join(',');
            const sql = `DELETE FROM \`pt_fy_rules_base_simple\` WHERE \`policy_id\` IN (${placeholders})`;
            const { result } = await pools({ sql, val: basePolicyIds, res, req });
            deletedBase = result?.affectedRows || 0;
        }
        if (Array.isArray(ladderPolicyIds) && ladderPolicyIds.length > 0) {
            const placeholders = ladderPolicyIds.map(() => '?').join(',');
            const sql = `DELETE FROM \`pt_fy_rules_ladder\` WHERE \`policy_id\` IN (${placeholders})`;
            const { result } = await pools({ sql, val: ladderPolicyIds, res, req });
            deletedLadder = result?.affectedRows || 0;
        }
        return res.send(utils.returnData({ msg: '删除成功', data: { success: true, deletedBase, deletedLadder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '删除失败: ' + err.message } }));
    }
});

router.post('/discount-detail', async (req, res) => {
    try {
        const { month, teams = [] } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少月份' } }));
        let sql = `
            SELECT
              \`team\` AS team,
              ROUND(SUM(CASE WHEN \`cost_bearer\` = '平台' THEN \`deduct_amount\` ELSE 0 END), 2) AS platform_bear,
              ROUND(SUM(CASE WHEN \`cost_bearer\` = '高德渠道' THEN \`deduct_amount\` ELSE 0 END), 2) AS gaode_bear
            FROM \`pt_fy_discount_bill\`
            WHERE \`year_month\` = ?
        `;
        const vals = [month];
        if (Array.isArray(teams) && teams.length > 0) {
            const placeholders = teams.map(() => '?').join(',');
            sql += ` AND \`team\` IN (${placeholders})`;
            vals.push(...teams);
        }
        sql += ` GROUP BY \`team\` ORDER BY \`team\` ASC`;
        const { result } = await pools({ sql, val: vals, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.post('/rules-save-chunk', async (req, res) => {
    try {
        const { baseSimpleRows = [], ladderRows = [] } = req.body || {};
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const ensureSql1 = `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_base_simple\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            policy_id VARCHAR(64),
            category VARCHAR(32),
            port VARCHAR(32),
            base_metric VARCHAR(32),
            subtract_free TINYINT(1),
            method VARCHAR(32),
            rate_value DECIMAL(20,6),
            remark TEXT,
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql1, res, req });
        const ensureSql2 = `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_ladder\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            policy_id VARCHAR(64),
            rule_type VARCHAR(64),
            dimension VARCHAR(32),
            metric VARCHAR(32),
            min_val DECIMAL(20,6),
            max_val DECIMAL(20,6),
            method VARCHAR(32),
            rule_value DECIMAL(20,6),
            subtract_free TINYINT(1),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql2, res, req });
        const ensureCols = async (table, req, res, cols) => {
            const { result } = await pools({ sql: `SHOW COLUMNS FROM \`${table}\``, res, req });
            const existingSet = new Set(result.map(r => r.Field));
            for (const c of cols) {
                if (!existingSet.has(c.name)) {
                    await pools({ sql: `ALTER TABLE \`${table}\` ADD COLUMN \`${c.name}\` ${c.type}`, res, req });
                    existingSet.add(c.name);
                }
            }
        };
        await ensureCols('pt_fy_rules_base_simple', req, res, [
            { name: 'policy_id', type: 'VARCHAR(64)' },
            { name: 'double_calc', type: 'TINYINT(1)' },
            { name: 'free_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'unfree_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'method', type: 'VARCHAR(32)' },
            { name: 'upload_time', type: 'DATETIME' },
            { name: 'updated_time', type: 'DATETIME' }
        ]);
        await ensureCols('pt_fy_rules_ladder', req, res, [
            { name: 'policy_id', type: 'VARCHAR(64)' },
            { name: 'months_prior', type: 'INT' },
            { name: 'double_calc', type: 'TINYINT(1)' },
            { name: 'free_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'unfree_rate_value', type: 'DECIMAL(20,6)' },
            { name: 'method', type: 'VARCHAR(32)' },
            { name: 'upload_time', type: 'DATETIME' },
            { name: 'updated_time', type: 'DATETIME' }
        ]);
        let savedBase = 0, savedLadder = 0;
        if (Array.isArray(baseSimpleRows) && baseSimpleRows.length > 0) {
            const cols = ['id','policy_id','category','port','base_metric','double_calc','subtract_free','subtract_mozhu','method','rate_value','free_rate_value','unfree_rate_value','remark','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_rules_base_simple\` (\`${cols.join('`,`')}\`) VALUES `;
            let vals = [];
            baseSimpleRows.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.policy_id ?? null, r.category || null, r.port || null, r.base_metric || null, r.double_calc ? 1 : 0, r.subtract_free ? 1 : 0, r.subtract_mozhu ? 1 : 0, r.method || null, r.rate_value ?? null, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.remark || null, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            savedBase = baseSimpleRows.length;
        }
        if (Array.isArray(ladderRows) && ladderRows.length > 0) {
            const cols = ['id','policy_id','rule_type','dimension','months_prior','metric','min_val','max_val','method','rule_value','double_calc','free_rate_value','unfree_rate_value','subtract_free','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_rules_ladder\` (\`${cols.join('`,`')}\`) VALUES `;
            let vals = [];
            ladderRows.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.policy_id ?? null, r.rule_type || null, r.dimension || null, r.months_prior ?? null, r.metric || null, r.min_val ?? null, r.max_val ?? null, r.method || null, r.rule_value ?? null, r.double_calc ? 1 : 0, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.subtract_free ? 1 : 0, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            savedLadder = ladderRows.length;
        }
        return res.send(utils.returnData({ msg: '分批保存成功', data: { success: true, baseSaved: savedBase, ladderSaved: savedLadder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '分批保存失败: ' + err.message } }));
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
        } else {
            const { result: existingCols } = await pools({ sql: `SHOW COLUMNS FROM \`${tableName}\``, res, req });
            const existingSet = new Set((existingCols || []).map(c => c.Field));
            for (const col of Object.values(mapping)) {
                if (!existingSet.has(col)) {
                    await pools({ sql: `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` TEXT`, res, req });
                    existingSet.add(col);
                }
            }
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

router.post('/rules-update', async (req, res) => {
    try {
        const { baseUpdates = [], ladderUpdates = [] } = req.body || {};
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        let updatedBase = 0, updatedLadder = 0;
        for (const r of Array.isArray(baseUpdates) ? baseUpdates : []) {
            const sql = 'UPDATE `pt_fy_rules_base_simple` SET `policy_id`=?,`category`=?,`port`=?,`base_metric`=?,`double_calc`=?,`subtract_free`=?,`subtract_mozhu`=?,`method`=?,`rate_value`=?,`free_rate_value`=?,`unfree_rate_value`=?,`remark`=?,`updated_time`=? WHERE `id`=?';
            const val = [r.policy_id ?? null, r.category ?? null, r.port ?? null, r.base_metric ?? null, r.double_calc ? 1 : 0, r.subtract_free ? 1 : 0, r.subtract_mozhu ? 1 : 0, r.method ?? null, r.rate_value ?? null, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.remark ?? null, now, r.id];
            await pools({ sql, val, res, req });
            updatedBase++;
        }
        for (const r of Array.isArray(ladderUpdates) ? ladderUpdates : []) {
            const sql = 'UPDATE `pt_fy_rules_ladder` SET `policy_id`=?,`rule_type`=?,`dimension`=?,`months_prior`=?,`metric`=?,`min_val`=?,`max_val`=?,`method`=?,`rule_value`=?,`double_calc`=?,`free_rate_value`=?,`unfree_rate_value`=?,`subtract_free`=?,`updated_time`=? WHERE `id`=?';
            const val = [r.policy_id ?? null, r.rule_type ?? null, r.dimension ?? null, r.months_prior ?? null, r.metric ?? null, r.min_val ?? null, r.max_val ?? null, r.method ?? null, r.rule_value ?? null, r.double_calc ? 1 : 0, r.free_rate_value ?? null, r.unfree_rate_value ?? null, r.subtract_free ? 1 : 0, now, r.id];
            await pools({ sql, val, res, req });
            updatedLadder++;
        }
        return res.send(utils.returnData({ msg: '更新成功', data: { success: true, updatedBase, updatedLadder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '更新失败: ' + err.message } }));
    }
});

router.post('/rules-delete-by-id', async (req, res) => {
    try {
        const { baseIds = [], ladderIds = [] } = req.body || {};
        let deletedBase = 0, deletedLadder = 0;
        if (Array.isArray(baseIds) && baseIds.length > 0) {
            const placeholders = baseIds.map(() => '?').join(',');
            const sql = `DELETE FROM \`pt_fy_rules_base_simple\` WHERE \`id\` IN (${placeholders})`;
            const { result } = await pools({ sql, val: baseIds, res, req });
            deletedBase = result?.affectedRows || 0;
        }
        if (Array.isArray(ladderIds) && ladderIds.length > 0) {
            const placeholders = ladderIds.map(() => '?').join(',');
            const sql = `DELETE FROM \`pt_fy_rules_ladder\` WHERE \`id\` IN (${placeholders})`;
            const { result } = await pools({ sql, val: ladderIds, res, req });
            deletedLadder = result?.affectedRows || 0;
        }
        return res.send(utils.returnData({ msg: '按ID删除成功', data: { success: true, deletedBase, deletedLadder } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '按ID删除失败: ' + err.message } }));
    }
});

router.get('/company-policy/template', async (req, res) => {
    try {
        const workbook = new ExcelJS.Workbook();
        const w = (t) => { let n = 0; if (t) for (const c of String(t)) n += c.charCodeAt(0) > 255 ? 2 : 1; return Math.max(n * 1.5 + 2, 12); };
        const sheet = workbook.addWorksheet('公司返佣配置');
        const h = ['公司','绑定车队','基础政策ID','阶梯政策ID','生效月份'];
        sheet.columns = h.map(x => ({ header: x, key: x, width: w(x) }));
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent('公司返佣配置模板.xlsx')}`);
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        res.send(utils.returnData({ code: 1, data: { success: false, msg: '下载模板失败: ' + err.message } }));
    }
});

router.post('/company-policy/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '未上传文件' } }));
        const month = req.body.month;
        const ws = xlsx.parse(req.file.buffer);
        const sheet = ws[0];
        const data = sheet?.data || [];
        if (data.length < 2) return res.send(utils.returnData({ code: 1, data: { success: false, msg: 'Excel为空或格式不正确' } }));
        const headers = (data[0] || []).map(v => v ? String(v).trim() : '');
        const expected = ['公司','绑定车队','基础政策ID','阶梯政策ID','生效月份'];
        const missing = expected.filter(h => !headers.includes(h));
        if (missing.length > 0) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺失字段: ' + missing.join(', ') } }));
        const idx = (name) => headers.indexOf(name);
        const list = [];
        data.slice(1).forEach(r => {
            if (!r || r.length === 0) return;
            list.push({
                company: r[idx('公司')] || '',
                team: r[idx('绑定车队')] || '',
                base_policy_id: r[idx('基础政策ID')] || '',
                ladder_policy_id: r[idx('阶梯政策ID')] || '',
                month: String(r[idx('生效月份')] || month || '').trim()
            });
        });
        return res.send(utils.returnData({ msg: '解析成功', data: { success: true, list } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '解析失败: ' + err.message } }));
    }
});

router.post('/company-policy/save', async (req, res) => {
    try {
        const { month, list = [], append } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少生效月份' } }));
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        const { result: cols } = await pools({ sql: 'SHOW COLUMNS FROM `pt_fy_company_policy`', res, req });
        const teamCol = cols.find(c => c.Field === 'team');
        if (teamCol && !String(teamCol.Type).toLowerCase().includes('text')) {
            await pools({ sql: 'ALTER TABLE `pt_fy_company_policy` MODIFY COLUMN `team` TEXT', res, req });
        }
        const ladderCol = cols.find(c => c.Field === 'ladder_policy_id');
        if (ladderCol && !String(ladderCol.Type).toLowerCase().includes('text')) {
            await pools({ sql: 'ALTER TABLE `pt_fy_company_policy` MODIFY COLUMN `ladder_policy_id` TEXT', res, req });
        }
        if (!append) {
            await pools({ sql: 'DELETE FROM `pt_fy_company_policy` WHERE `month` = ?', val: [month], res, req });
        }
        let saved = 0;
        if (Array.isArray(list) && list.length > 0) {
            const cols = ['id','company','team','base_policy_id','ladder_policy_id','month','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_company_policy\` (\`${cols.join('`,`')}\`) VALUES `;
            let vals = [];
            const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
            list.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.company || '', r.team || '', r.base_policy_id || '', r.ladder_policy_id || '', month, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            saved = list.length;
        }
        return res.send(utils.returnData({ msg: '保存成功', data: { success: true, saved } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '保存失败: ' + err.message } }));
    }
});

router.post('/policy-details/query', async (req, res) => {
    try {
        const { company, month } = req.body || {};
        if (!company || !month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少公司或月份' } }));
        const ensurePolicy = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensurePolicy, res, req });
        const { result: polRows } = await pools({
            sql: 'SELECT `base_policy_id`,`ladder_policy_id` FROM `pt_fy_company_policy` WHERE `company`=? AND `month`=? LIMIT 1',
            val: [company, month],
            res, req
        });
        if (!polRows || polRows.length === 0) {
            return res.send(utils.returnData({ msg: '无配置', data: { success: true, base_policy_id: '', ladder_policy_ids: [], base_rows: [], ladder_rows: [] } }));
        }
        const basePolicyId = polRows[0].base_policy_id || '';
        let ladderPolicyIds = [];
        try {
            const arr = JSON.parse(polRows[0].ladder_policy_id || '[]');
            ladderPolicyIds = Array.isArray(arr) ? arr.map(x => x.policy_id).filter(Boolean) : [];
        } catch {}
        await pools({ sql: `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_base_simple\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`, res, req });
        await pools({ sql: `CREATE TABLE IF NOT EXISTS \`pt_fy_rules_ladder\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`, res, req });
        let base_rows = [];
        if (basePolicyId) {
            const { result: baseRes } = await pools({
                sql: 'SELECT * FROM `pt_fy_rules_base_simple` WHERE `policy_id` = ?',
                val: [basePolicyId], res, req
            });
            base_rows = baseRes || [];
        }
        let ladder_rows = [];
        if (ladderPolicyIds.length > 0) {
            const placeholders = ladderPolicyIds.map(() => '?').join(',');
            const { result: ladRes } = await pools({
                sql: `SELECT * FROM \`pt_fy_rules_ladder\` WHERE \`policy_id\` IN (${placeholders})`,
                val: ladderPolicyIds, res, req
            });
            ladder_rows = ladRes || [];
        }
        return res.send(utils.returnData({
            msg: '查询成功',
            data: { success: true, base_policy_id: basePolicyId, ladder_policy_ids: ladderPolicyIds, base_rows, ladder_rows }
        }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});
router.post('/company-policy/query', async (req, res) => {
    try {
        const { month } = req.body || {};
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        let sql = 'SELECT * FROM `pt_fy_company_policy`';
        let val = [];
        if (month) { sql += ' WHERE `month` = ?'; val = [month]; }
        sql += ' ORDER BY `company` ASC';
        const { result } = await pools({ sql, val, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});

router.post('/company-policy/update', async (req, res) => {
    try {
        const { list = [] } = req.body || {};
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_policy\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            team TEXT,
            base_policy_id VARCHAR(64),
            ladder_policy_id TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        let updated = 0;
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        for (const r of Array.isArray(list) ? list : []) {
            if (!r.id) continue;
            const sql = 'UPDATE `pt_fy_company_policy` SET `company`=?,`team`=?,`base_policy_id`=?,`ladder_policy_id`=?,`updated_time`=? WHERE `id`=?';
            const val = [r.company ?? null, r.team ?? '[]', r.base_policy_id ?? '', r.ladder_policy_id ?? '[]', now, r.id];
            await pools({ sql, val, res, req });
            updated++;
        }
        return res.send(utils.returnData({ msg: '更新成功', data: { success: true, updated } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '更新失败: ' + err.message } }));
    }
});

router.post('/company-list/generate', async (req, res) => {
    try {
        const { month, append } = req.body || {};
        if (!month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少生效月份' } }));
        const checkSettle = `SHOW TABLES LIKE 'pt_fy_settlement_order'`;
        const { result: settleExists } = await pools({ sql: checkSettle, res, req });
        if (settleExists.length === 0) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '结算明细表不存在' } }));
        const { result: raw } = await pools({
            sql: 'SELECT DISTINCT `company` FROM `pt_fy_settlement_order` WHERE `year_month` = ? AND `company` IS NOT NULL AND `company`<>\'\'',
            val: [month],
            res,
            req
        });
        const clean = (name) => {
            if (!name) return '';
            let s = String(name);
            s = s.replace(/[\(（][^（）\(\)]*[\)）]/g, '');
            s = s.split('-')[0];
            s = s.trim();
            return s;
        };
        const map = new Map();
        for (const r of raw) {
            const orig = String(r.company).trim();
            const c = clean(orig);
            if (!c) continue;
            if (!map.has(c)) map.set(c, new Set());
            map.get(c).add(orig);
        }
        const list = Array.from(map.entries()).map(([company, set]) => ({ company, original_names: JSON.stringify(Array.from(set)) }));
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_list\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            original_names TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        const { result: cols } = await pools({ sql: 'SHOW COLUMNS FROM `pt_fy_company_list`', res, req });
        const hasOrig = cols.some(c => c.Field === 'original_names');
        if (!hasOrig) {
            await pools({ sql: 'ALTER TABLE `pt_fy_company_list` ADD COLUMN `original_names` TEXT', res, req });
        }
        if (!append) {
            await pools({ sql: 'DELETE FROM `pt_fy_company_list` WHERE `month` = ?', val: [month], res, req });
        }
        let saved = 0;
        if (list.length > 0) {
            const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
            const colsIns = ['id','company','original_names','month','upload_time','updated_time'];
            let sql = `INSERT INTO \`pt_fy_company_list\` (\`${colsIns.join('`,`')}\`) VALUES `;
            let vals = [];
            list.forEach(r => {
                sql += `(?, ?, ?, ?, ?, ?),`;
                vals.push(uuidv4(), r.company, r.original_names || '[]', month, now, now);
            });
            sql = sql.slice(0, -1);
            await pools({ sql, val: vals, res, req });
            saved = list.length;
        }
        return res.send(utils.returnData({ msg: '生成并保存成功', data: { success: true, saved, list } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '生成失败: ' + err.message } }));
    }
});

router.post('/company-list/query', async (req, res) => {
    try {
        const { month } = req.body || {};
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_list\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            original_names TEXT,
            month VARCHAR(10),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        const { result: cols } = await pools({ sql: 'SHOW COLUMNS FROM `pt_fy_company_list`', res, req });
        const hasOrig = cols.some(c => c.Field === 'original_names');
        if (!hasOrig) {
            await pools({ sql: 'ALTER TABLE `pt_fy_company_list` ADD COLUMN `original_names` TEXT', res, req });
        }
        let sql = 'SELECT * FROM `pt_fy_company_list`';
        let val = [];
        if (month) { sql += ' WHERE `month` = ?'; val = [month]; }
        sql += ' ORDER BY `company` ASC';
        const { result } = await pools({ sql, val, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: { list: result || [] } }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});

router.post('/invoice-info/query', async (req, res) => {
    try {
        const { company, month } = req.body || {};
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_invoice\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            month VARCHAR(10),
            invoice_unit_name VARCHAR(256),
            credit_code VARCHAR(64),
            invoice_address TEXT,
            mail_address TEXT,
            mail_receiver VARCHAR(64),
            mail_phone VARCHAR(32),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        let sql = 'SELECT * FROM `pt_fy_company_invoice`';
        let val = [];
        const conds = [];
        if (company) { conds.push('`company` = ?'); val.push(company); }
        if (month) { conds.push('`month` = ?'); val.push(month); }
        if (conds.length > 0) sql += ' WHERE ' + conds.join(' AND ');
        sql += ' ORDER BY `updated_time` DESC LIMIT 1';
        const { result } = await pools({ sql, val, res, req });
        return res.send(utils.returnData({ msg: '查询成功', data: result && result[0] ? result[0] : null }));
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '查询失败: ' + err.message } }));
    }
});

router.post('/invoice-info/save', async (req, res) => {
    try {
        const { company, month, invoice_unit_name, credit_code, invoice_address, mail_address, mail_receiver, mail_phone } = req.body || {};
        if (!company || !month) return res.send(utils.returnData({ code: 1, data: { success: false, msg: '缺少公司或月份' } }));
        const ensureSql = `CREATE TABLE IF NOT EXISTS \`pt_fy_company_invoice\` (
            id VARCHAR(64) NOT NULL PRIMARY KEY,
            company VARCHAR(128),
            month VARCHAR(10),
            invoice_unit_name VARCHAR(256),
            credit_code VARCHAR(64),
            invoice_address TEXT,
            mail_address TEXT,
            mail_receiver VARCHAR(64),
            mail_phone VARCHAR(32),
            upload_time DATETIME,
            updated_time DATETIME
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
        await pools({ sql: ensureSql, res, req });
        const now = dayjs().format('YYYY-MM-DD HH:mm:ss');
        const { result } = await pools({ sql: 'SELECT `id` FROM `pt_fy_company_invoice` WHERE `company` = ? AND `month` = ? LIMIT 1', val: [company, month], res, req });
        if (result && result.length > 0) {
            const id = result[0].id;
            await pools({
                sql: 'UPDATE `pt_fy_company_invoice` SET `invoice_unit_name`=?,`credit_code`=?,`invoice_address`=?,`mail_address`=?,`mail_receiver`=?,`mail_phone`=?,`updated_time`=? WHERE `id`=?',
                val: [invoice_unit_name || '', credit_code || '', invoice_address || '', mail_address || '', mail_receiver || '', mail_phone || '', now, id],
                res, req
            });
            return res.send(utils.returnData({ msg: '更新成功', data: { success: true, updated: 1 } }));
        } else {
            const id = uuidv4();
            await pools({
                sql: 'INSERT INTO `pt_fy_company_invoice` (`id`,`company`,`month`,`invoice_unit_name`,`credit_code`,`invoice_address`,`mail_address`,`mail_receiver`,`mail_phone`,`upload_time`,`updated_time`) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                val: [id, company, month, invoice_unit_name || '', credit_code || '', invoice_address || '', mail_address || '', mail_receiver || '', mail_phone || '', now, now],
                res, req
            });
            return res.send(utils.returnData({ msg: '保存成功', data: { success: true, saved: 1 } }));
        }
    } catch (err) {
        return res.send(utils.returnData({ code: 1, data: { success: false, msg: '保存失败: ' + err.message } }));
    }
});
export default router;
