import express from 'express';
import utils from '../utils/index.js';
import pools from '../utils/pools.js';
import fileEvent from '../utils/file.js';
import xlsx from 'node-xlsx';
import fs from 'fs';
import path from 'path';
import config from '../utils/config.js';

const router = express.Router();

const TABLE_MAP = {
    1: 'pt_fy_table_1',
    2: 'pt_fy_table_2',
    3: 'pt_fy_table_3',
    4: 'pt_fy_table_4'
};

// Check if data exists for the given year_month
router.post('/checkData', async (req, res) => {
    try {
        const { tableType, yearMonth } = req.body;
        const tableName = TABLE_MAP[tableType];

        if (!tableName) return res.send(utils.returnData({ code: -1, msg: "Invalid table type" }));

        // Check if table exists
        const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
        const { result: tableExists } = await pools({ sql: checkTableSql, res, req });

        if (tableExists.length === 0) {
            return res.send(utils.returnData({ data: { exists: false } }));
        }

        // Check data
        const sql = `SELECT COUNT(*) as total, MAX(upload_time) as lastTime FROM ${tableName} WHERE year_month = ?`;
        const { result } = await pools({ sql, val: [yearMonth], res, req });

        if (result[0].total > 0) {
            return res.send(utils.returnData({ 
                data: { 
                    exists: true, 
                    total: result[0].total, 
                    lastTime: result[0].lastTime 
                } 
            }));
        } else {
            return res.send(utils.returnData({ data: { exists: false } }));
        }

    } catch (err) {
        console.error(err);
        res.send(utils.returnData({ code: -1, msg: "Server error", err: err.message }));
    }
});

// Import data
router.post('/importData', async (req, res) => {
    try {
        // Upload file first
        const files = await fileEvent(req, res);
        if (!files || files.length === 0) return; // Error already handled in fileEvent

        const fileInfo = files[0];
        const filePath = path.join(config.fileSite, fileInfo.url); // Adjust path logic based on fileEvent return

        // Parse params (passed as body fields by multer)
        const { tableType, yearMonth, overwrite } = req.body;
        const tableName = TABLE_MAP[tableType];
        
        if (!tableName) return res.send(utils.returnData({ code: -1, msg: "Invalid table type" }));

        // Parse Excel
        const workSheets = xlsx.parse(fs.readFileSync(filePath));
        const sheet = workSheets[0];
        const data = sheet.data;

        if (data.length < 2) {
            return res.send(utils.returnData({ code: -1, msg: "Empty or invalid Excel file" }));
        }

        const headers = data[0]; // First row as headers
        const rows = data.slice(1);

        // Check if table exists, if not create it
        const checkTableSql = `SHOW TABLES LIKE '${tableName}'`;
        const { result: tableExists } = await pools({ sql: checkTableSql, res, req });

        if (tableExists.length === 0) {
            // Create table
            let createSql = `CREATE TABLE ${tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                upload_time DATETIME,
                year_month VARCHAR(20),
            `;
            
            headers.forEach(header => {
                // Sanitize header name
                const colName = header.toString().replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
                createSql += `\`${colName}\` TEXT,`;
            });

            createSql = createSql.slice(0, -1) + ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";
            await pools({ sql: createSql, res, req });
        }

        // Handle overwrite
        if (overwrite === 'true' || overwrite === true) {
            const deleteSql = `DELETE FROM ${tableName} WHERE year_month = ?`;
            await pools({ sql: deleteSql, val: [yearMonth], res, req });
        }

        // Insert Data
        if (rows.length > 0) {
            // Get columns from table (in case table structure changed or we created it)
            // For simplicity, we assume the Excel columns match the table columns (except id, upload_time, year_month)
            // But if the table was just created, it matches. If it existed, we might have issues if columns differ.
            // "If table exists, upload. If not, create." implies we assume consistent structure.
            
            // Construct insert SQL
            const safeHeaders = headers.map(h => h.toString().replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_'));
            const cols = ['upload_time', 'year_month', ...safeHeaders].map(c => `\`${c}\``).join(',');
            
            const now = new Date();
            const placeholders = ['?', '?', ...headers.map(() => '?')].join(',');
            const insertSql = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`;

            // Batch insert is better, but pools might not support complex batch array. 
            // We'll iterate or use a simpler approach. 
            // Given potential size, let's try to batch manually or just loop. 
            // Loop is safer for pools wrapper usually unless we construct a giant SQL.
            // Let's construct a giant SQL for performance (batch size 1000).
            
            const BATCH_SIZE = 1000;
            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);
                let batchSql = `INSERT INTO ${tableName} (${cols}) VALUES `;
                let batchVals = [];
                
                batch.forEach(row => {
                    batchSql += `(?, ?, ${headers.map(() => '?').join(',')}),`;
                    batchVals.push(now, yearMonth);
                    // Ensure row has enough columns, pad with null if needed
                    headers.forEach((_, idx) => {
                        batchVals.push(row[idx] !== undefined ? row[idx] : null);
                    });
                });
                
                batchSql = batchSql.slice(0, -1);
                await pools({ sql: batchSql, val: batchVals, res, req });
            }
        }

        res.send(utils.returnData({ msg: "Import successful", data: { count: rows.length } }));

    } catch (err) {
        console.error(err);
        res.send(utils.returnData({ code: -1, msg: "Import failed", err: err.message }));
    }
});

export default router;
