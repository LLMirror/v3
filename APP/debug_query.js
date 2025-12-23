import pools from './utils/pools.js';

const mockRes = {
    send: (obj) => console.log('Response:', JSON.stringify(obj, null, 2)),
    status: (code) => ({ send: (obj) => console.log(`Status ${code} Response:`, JSON.stringify(obj, null, 2)) })
};

const run = async () => {
    try {
        console.log('--- Testing getCompanyList ---');
        // Mimic getCompanyList logic
        // Assuming super admin for now (no filtering)
        let sql = `SELECT DISTINCT 公司 AS company FROM pt_cw_zjmxb WHERE 公司 IS NOT NULL AND 公司 <> ''`;
        const params = [];
        // No series filter
        sql += ` ORDER BY 公司`;
        
        console.log('SQL:', sql);
        const { result } = await pools({ sql, val: params, res: mockRes });
        console.log('Result count:', result.length);
        if (result.length > 0) console.log('First 2:', result.slice(0, 2));

        console.log('\n--- Testing getSeriesList ---');
        // Mimic getSeriesList logic
        let sql2 = `SELECT DISTINCT 系列 AS series FROM pt_cw_zjmxb WHERE 系列 IS NOT NULL AND 系列 <> ''`;
        sql2 += ` ORDER BY 系列`;
        
        console.log('SQL:', sql2);
        const { result: result2 } = await pools({ sql: sql2, res: mockRes });
        console.log('Result count:', result2.length);
        if (result2.length > 0) console.log('First 2:', result2.slice(0, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
