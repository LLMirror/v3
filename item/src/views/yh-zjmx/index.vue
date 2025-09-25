<template>
    <div class="container">
        <h2>出纳资金明细登记表</h2>

        <!-- 筛选区 -->
        <div class="filters">
            <el-input v-model="filters.summary" placeholder="摘要" style="width:200px" />
            <el-select v-model="filters.company" placeholder="公司" clearable style="width:150px">
                <el-option v-for="c in companyList" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="filters.bank" placeholder="银行" clearable style="width:150px">
                <el-option v-for="b in bankList" :key="b" :label="b" :value="b" />
            </el-select>
            <el-date-picker v-model="filters.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期"
                style="width:300px" />
            <el-button type="primary" @click="search">查询</el-button>
        </div>
        <!-- 底部汇总 -->
        <div class="summary" style="margin-top:10px;">
            <el-table :data="summary" border style="width:1600px;" size="small">
                <el-table-column prop="company" label="公司" />
                <el-table-column prop="bank" label="银行" />
                <el-table-column prop="totalIncome" label="总收入" />
                <el-table-column prop="totalExpense" label="总支出" />
                <el-table-column prop="balance" label="余额" />
            </el-table>
        </div>
        <!-- 表格 -->
        <el-table :data="records" border style="width:100%" size="small">
            <el-table-column prop="seq" label="序号" width="60" />
            <el-table-column prop="date" label="日期" width="100">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-date-picker v-model="row.date" type="date" size="small" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.date }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column prop="company" label="公司" width="230">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-select v-model="row.company" placeholder="公司" size="small" style="width: 100%;">
                            <el-option v-for="c in companyList" :key="c" :label="c" :value="c" />
                        </el-select>
                    </template>
                    <template v-else>
                        {{ row.company }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column prop="bank" label="银行" width="230">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-select v-model="row.bank" placeholder="银行" size="small" style="width: 100%;">
                            <el-option v-for="b in bankList" :key="b" :label="b" :value="b" />
                        </el-select>
                    </template>
                    <template v-else>
                        {{ row.bank }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column prop="summary" label="摘要" width="450">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-input v-model="row.summary" size="small" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.summary }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column prop="income" label="收入" width="120">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-input-number v-model="row.income" size="small" :min="0" :controls="false" :precision="2"
                            @input="validateNumber(row, 'income')" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.income || 0 }}
                    </template>
                </template>
            </el-table-column>

            <el-table-column prop="expense" label="支出" width="120">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-input-number v-model="row.expense" size="small" :min="0" :controls="false" :precision="2"
                            @input="validateNumber(row, 'expense')" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.expense || 0 }}
                    </template>
                </template>
            </el-table-column>


            <el-table-column prop="balance" label="余额" width="120" />
            <el-table-column prop="remark" label="备注">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-input v-model="row.remark" size="small" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.remark }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column prop="invoice" label="发票">
                <template #default="{ row }">
                    <template v-if="row.editing">
                        <el-input v-model="row.invoice" size="small" style="width: 100%;" />
                    </template>
                    <template v-else>
                        {{ row.invoice }}
                    </template>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="130" align="center">
                <template #default="{ row, $index }">
                    <!-- 历史记录（有id且未编辑） -->
                    <template v-if="row.id && !row.editing">
                        <el-button type="primary" size="small" @click="editRow(row)">修改</el-button>
                    </template>
                    <!-- 编辑状态 -->
                    <template v-if="row.editing">
                        <el-button type="success" size="small" @click="saveRow(row)">保存</el-button>
                        <el-button type="danger" size="small" @click="cancelEdit(row)">取消</el-button>
                    </template>
                    <!-- 删除按钮（非第一行且非编辑状态） -->
                    <el-button 
                        v-if="$index > 0 && !row.editing" 
                        type="danger" 
                        size="small" 
                        @click="delRow(row, $index)"
                    >删除</el-button>
                </template>
            </el-table-column>
        </el-table>


        <el-pagination v-if="total > pageSize" background layout="prev, pager, next, jumper" :current-page="page"
            :page-size="pageSize" :total="total" @current-change="handlePageChange" style="margin-top:10px;" />




     
        <el-button type="success" @click="addRow" style="margin-top:10px;">新增行</el-button>
    </div>
</template>


<script setup>
import { reactive, ref, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import useUserStore from '@/store/modules/user';
import {
    getCashRecords,
    addCashRecord,
    deleteCashRecord,
    updateCashRecord,
    getCashSummary,
    getCompanyList,
    getBankList,
    getCashSummaryList
} from '@/api/system/index.js';

const filters = reactive({
    summary: '',
    company: '',
    bank: '',
    dateRange: []
});

const userStore = useUserStore();

const records = ref([]);
const summary = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(15);

// 数字验证函数
const validateNumber = (row, field) => {
    if (row[field] === null || row[field] === undefined || isNaN(row[field])) {
        row[field] = 0;
    }
};

const companyList = ref([]);
const bankList = ref([]);


const handlePageChange = (newPage) => {
    page.value = newPage;   // 更新页码
    getRecords();           // 重新请求数据
};

// 查询按钮点击时重置页码
const search = () => {
    page.value = 1;
    getRecords();
};

// 获取公司和银行列表
const getFilters = async () => {
    const cRes = await getCompanyList();
    companyList.value = cRes.data || [];
    const bRes = await getBankList();
    bankList.value = bRes.data || [];
};

// 获取记录
const getRecords = async () => {
    const res = await getCashRecords({
        username: userStore.name,
        data: {
            summary: filters.summary,
            company: filters.company,
            bank: filters.bank,
            dateFrom: filters.dateRange[0],
            dateTo: filters.dateRange[1],
            page: page.value,
            size: pageSize.value
        }
    });
    // 为历史记录添加editing属性，默认为false（不可编辑）
    records.value = res.data.map(record => ({
        ...record,
        editing: false
    }));
    total.value = res.total;

    const sumRes = await getCashSummary({
        username: userStore.name,
        data: {
            summary: filters.summary,
            company: filters.company,
            bank: filters.bank,
            dateFrom: filters.dateRange[0],
            dateTo: filters.dateRange[1]
        }
    });
    summary.value = sumRes.data;

    // 保证至少一行空白
    if (!records.value.length || records.value[0].id) {
        records.value.unshift({
            seq: 1,
            date: '',
            company: '',
            bank: '',
            summary: '',
            income: 0,
            expense: 0,
            balance: 0,
            remark: '',
            invoice: '',
            editing: true // 新增行默认处于编辑状态
        });
    }
};

// 编辑行
const editRow = (row) => {
    // 保存原始数据，用于取消编辑时恢复
    row.originalData = { ...row };
    row.editing = true;
};

// 取消编辑
const cancelEdit = (row) => {
    if (row.originalData) {
        // 恢复原始数据
        Object.assign(row, row.originalData);
        delete row.originalData;
    }
    row.editing = false;
};

// 新增行
const addRow = () => {
    records.value.push({
        seq: records.value.length + 1,
        date: '',
        company: '',
        bank: '',
        summary: '',
        income: 0,
        expense: 0,
        balance: 0,
        remark: '',
        invoice: '',
        editing: true // 新增行默认处于编辑状态
    });
};

// 保存行
const saveRow = async (row) => {
    try {
        if (!row.id) await addCashRecord({ username: userStore.name, data: row });
        else await updateCashRecord({ username: userStore.name, data: row });
        ElMessage.success('保存成功');
        // 保存成功后重新获取数据，恢复不可编辑状态
        getRecords();
    } catch (err) {
        ElMessage.error('保存失败');
    }
};

// 删除行
const delRow = async (row, index) => {
    if (index === 0) return;
    try {
        await ElMessageBox.confirm('确认删除该条记录吗？', '提示', { type: 'warning' });
        await deleteCashRecord({ username: userStore.name, data: { id: row.id } });
        ElMessage.success('删除成功');
        getRecords();
    } catch (err) { }
};



onMounted(() => {
    getFilters();
    getRecords();
});
</script>

<style scoped>
.container {
    padding: 20px;
}

.filters {
    margin-bottom: 10px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.summary {
    margin-top: 10px;
    margin-bottom: 10px;
    /* margin: 10px; */
}
</style>
