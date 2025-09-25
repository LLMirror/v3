<template>
    <div class="container">
        <h2>出纳资金明细登记表</h2>

        <!-- 筛选区 -->
        <div class="filters">
            <el-input v-model="filters.summary" placeholder="摘要" style="width:150px; height: 32px;" />
            <el-select v-model="filters.company" placeholder="公司" clearable style="width:150px">
                <el-option v-for="c in companyList" :key="c" :label="c" :value="c" />
            </el-select>
            <el-select v-model="filters.bank" placeholder="银行" clearable style="width:150px">
                <el-option v-for="b in bankList" :key="b" :label="b" :value="b" />
            </el-select>
            <el-date-picker v-model="filters.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期"
                style="width:300px" />
            <el-button type="primary" @click="search">查询</el-button>
            <el-button type="success" @click="showAddDialog">录入资金明细</el-button>
            <el-dropdown trigger="click" @command="handleExport">
              <el-button type="primary" plain>
                 导出 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
               </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="template">导出录入模板</el-dropdown-item>
                  <el-dropdown-item command="current">导出当前页</el-dropdown-item>
                  <el-dropdown-item command="all">导出全部数据</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <el-upload
              class="upload-demo"
              action=""
              :auto-upload="false"
              :on-change="handleFileChange"
              accept=".xlsx,.xls"
              :limit="1"
              :disabled="importing"
            >
              <el-button type="success" plain :loading="importing">批量导入</el-button>
            </el-upload>
        </div>
        <!-- 底部汇总 -->
        <!-- <div class="summary" style="margin-top:10px;">
            <el-table :data="summary" border style="width:1600px;" size="small">
                <el-table-column prop="company" label="公司" />
                <el-table-column prop="bank" label="银行" />
                <el-table-column prop="totalIncome" label="总收入" />
                <el-table-column prop="totalExpense" label="总支出" />
                <el-table-column prop="balance" label="余额" />
            </el-table>
        </div> -->.
        <!-- 表格 -->
        <el-table :data="records" border style="width:100%" size="small" height="600" max-height="600">
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


            <el-table-column prop="balance" label="余额" width="120">
                <template #default="{ row }">
                    <span :style="{ color: parseFloat(row.balance) < 0 ? 'red' : '' }">
                        {{ row.balance }}
                    </span>
                </template>
            </el-table-column>
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
                    <!-- 删除按钮（非编辑状态） -->
                    <el-button 
                        v-if="!row.editing" 
                        type="danger" 
                        size="small" 
                        @click="delRow(row, $index)"
                    >删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 添加资金明细对话框 -->
        <el-dialog v-model="dialogVisible" title="录入资金明细" width="600px" center height="500px">
            <div class="dialog-content">
                <el-form label-width="80px" :model="formData">
            <el-form-item label="日期">
                <el-date-picker v-model="formData.date" type="date" style="width:100%" />
            </el-form-item>
            <el-form-item label="公司">
                <el-select v-model="formData.company" placeholder="请选择公司" style="width:100%" @change="getHistorySummaries">
                    <el-option v-for="c in companyList" :key="c" :label="c" :value="c" />
                </el-select>
            </el-form-item>
            <el-form-item label="银行">
                <el-select v-model="formData.bank" placeholder="请选择银行" style="width:100%" :disabled="!formData.company" @change="getHistorySummaries">
                    <el-option v-for="b in bankList" :key="b" :label="b" :value="b" />
                </el-select>
            </el-form-item>
            <el-form-item label="摘要">
                <el-autocomplete
                    v-model="formData.summary"
                    :fetch-suggestions="querySearch"
                    placeholder="请输入摘要"
                    :disabled="!formData.company || !formData.bank"
                    clearable
                    :trigger-on-focus="false"  
                    :select-when-unmatched="true"  
                    debounce="100"  
                    class="w-full"
                    @select="handleSummarySelect"  
                >
                    <template #default="{ item }">
                        <!-- 自定义下拉选项模板 -->
                        <div>{{ item }}</div>
                    </template>
                </el-autocomplete>
            </el-form-item>
                    <el-form-item label="收入">
                        <el-input-number
                            v-model="formData.income"
                            :min="0"
                            :controls="false"
                            :precision="2"
                            @input="handleIncomeInput(formData)"
                            style="width:100%; color: green;"
                        />
                        </el-form-item>

                        <el-form-item label="支出">
                        <el-input-number
                            v-model="formData.expense"
                            :min="0"
                            :controls="false"
                            :precision="2"
                            @input="handleExpenseInput(formData)"
                            style="width:100%; color: red;"
                        />
                        </el-form-item>

                    <el-form-item label="备注">
                        <el-input v-model="formData.remark" placeholder="请输入备注" type="textarea" :rows="2" />
                    </el-form-item>
                    <el-form-item label="发票">
                        <el-input v-model="formData.invoice" placeholder="请输入发票信息" />
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="saveFormData">确定</el-button>
                </span>
            </template>
        </el-dialog>

        <el-pagination 
            v-if="total > pageSize" 
            background 
            layout="prev, pager, next, jumper, sizes, total" 
            :current-page="page"
            :page-size="pageSize" 
            :page-sizes="pageSizes"
            :total="total" 
            @current-change="handlePageChange"
            @size-change="handlePageSizeChange"
            style="margin-top:10px;" 
        />
    </div>
</template>


<script setup>
import { reactive, ref, onMounted, watch } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import * as XLSX from 'xlsx';
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
// 分页大小选项
const pageSizes = [10, 15, 20, 50, 100];
// 对话框相关
const dialogVisible = ref(false);
const formData = reactive({
    date: '',
    company: '',
    bank: '',
    summary: '',
    income: 0,
    expense: 0,
    remark: '',
    invoice: ''
});

const historySummaries = ref([]); // 历史摘要列表
const isLoading = ref(false); // 防止重复提交的loading状态

// 摘要下拉框选择事件处理
const handleSummarySelect = (item) => {
    formData.summary = item; // 点击下拉项后赋值
};
// 录入收入时，支出归零
const handleIncomeInput = (row) => {
  if (row.income > 0) row.expense = 0;
  if (isNaN(row.income) || row.income === null) row.income = 0;
};

// 录入支出时，收入归零
const handleExpenseInput = (row) => {
  if (row.expense > 0) row.income = 0;
  if (isNaN(row.expense) || row.expense === null) row.expense = 0;
};



// 自动完成搜索函数
const querySearch = (queryString, cb) => {
      // 输入时实时联想，不依赖查询按钮
      let suggestions = [];
      
      // 只有在公司和银行都有值且用户输入了查询字符串时才进行过滤
      if (queryString && formData.company && formData.bank) {
          // 实时过滤历史摘要，支持模糊匹配
          suggestions = historySummaries.value
              .filter(item => item.toLowerCase().includes(queryString.toLowerCase()))
              .slice(0, 100); // 限制最大返回100条
      }
      
      // 立即回调返回过滤后的结果
      cb(suggestions);
  };

// 数字验证函数
const validateNumber = (row, field) => {
    if (row[field] === null || row[field] === undefined || isNaN(row[field])) {
        row[field] = 0;
    }
};

const companyList = ref([]);
const bankList = ref([]);

// 处理页码变化
const handlePageChange = (newPage) => {
    page.value = newPage;   // 更新页码
    getRecords();           // 重新请求数据
};

// 处理页面大小变化
const handlePageSizeChange = (newSize) => {
    pageSize.value = newSize;  // 更新页面大小
    page.value = 1;            // 重置为第一页
    getRecords();              // 重新请求数据
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

// 获取历史摘要列表（根据公司和银行筛选）
const getHistorySummaries = async () => {
    // 如果已经有请求在进行中，或者没有选择公司或银行，则不发起新请求
    if (isLoading.value || !formData.company || !formData.bank) {
        // 只有当没有选择公司或银行时才清空历史摘要
        if (!formData.company || !formData.bank) {
            historySummaries.value = [];
        }
        return;
    }
    
    try {
        isLoading.value = true; // 设置loading状态，防止重复提交
        const res = await getCashSummaryList({
            username: userStore.name,
            data: {
                company: formData.company,
                bank: formData.bank,
                summary: formData.summary
            }
        });
        historySummaries.value = res.data || [];
    } catch (error) {
        console.error('获取历史摘要失败', error);
        historySummaries.value = [];
    } finally {
        // 无论成功失败，都要在最后重置loading状态
        isLoading.value = false;
    }
};

// 监听公司和银行变化，更新历史摘要
watch(() => [formData.company, formData.bank, formData.summary], () => {
    // 只有在公司和银行都有值时才更新历史摘要
    if (formData.company && formData.bank && formData.summary) {
        getHistorySummaries();
    } else {
        historySummaries.value = [];
    }
}, { deep: true });

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

    // 移除之前的空白行逻辑，因为现在使用对话框进行录入
};

// 显示添加对话框
const showAddDialog = () => {
    // 重置表单数据
    formData.date = '';
    formData.company = '';
    formData.bank = '';
    formData.summary = '';
    formData.income = 0;
    formData.expense = 0;
    formData.remark = '';
    formData.invoice = '';
    // 清空历史摘要列表
    historySummaries.value = [];
    // 重置loading状态
    isLoading.value = false;
    // 显示对话框
    dialogVisible.value = true;
};

// 保存表单数据
const saveFormData = async () => {
    try {
        await addCashRecord({ username: userStore.name, data: formData });
        ElMessage.success('保存成功');
        // 关闭对话框
        dialogVisible.value = false;
        // 重置loading状态
        isLoading.value = false;
        // 重新加载数据
        getRecords();
    } catch (err) {
        ElMessage.error('保存失败');
        // 重置loading状态
        isLoading.value = false;
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

// 处理对话框取消
const handleCancel = () => {
    dialogVisible.value = false;
    // 重置loading状态
    isLoading.value = false;
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
    try {
        await ElMessageBox.confirm('确认删除该条记录吗？', '提示', { type: 'warning' });
        await deleteCashRecord({ username: userStore.name, data: { id: row.id } });
        ElMessage.success('删除成功');
        getRecords();
    } catch (err) { }
};

// 处理导出Excel
const handleExport = async (command) => {
    if (command === 'template') {
        // 导出录入模板
        exportTemplate();
    } else if (command === 'current') {
        // 导出当前页数据
        exportToExcel(records.value.filter(r => r.id), '当前页资金明细');
    } else if (command === 'all') {
        // 导出全部数据
        ElMessage.info('正在导出全部数据，请稍候...');
        try {
            const res = await getCashRecords({
                username: userStore.name,
                data: {
                    summary: filters.summary,
                    company: filters.company,
                    bank: filters.bank,
                    dateFrom: filters.dateRange[0],
                    dateTo: filters.dateRange[1],
                    page: 1,
                    size: 99999 // 尽可能大的数量，获取全部数据
                }
            });
            exportToExcel(res.data, '全部资金明细');
            ElMessage.success('导出成功');
        } catch (err) {
            ElMessage.error('导出失败，请重试');
        }
    }
};

// 导出录入模板
const exportTemplate = () => {
    // 创建模板数据（空数据，只有表头）
    const templateData = [{
        '日期': '2024-01-01', // 示例日期格式
        '公司': '',
        '银行': '',
        '摘要': '',
        '收入': '',
        '支出': '',
        '备注': '',
        '发票': ''
    }];
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    const colWidths = [
        { wch: 15 }, // 日期
        { wch: 20 }, // 公司
        { wch: 20 }, // 银行
        { wch: 50 }, // 摘要
        { wch: 15 }, // 收入
        { wch: 15 }, // 支出
        { wch: 30 }, // 备注
        { wch: 30 }  // 发票
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '资金明细模板');
    
    // 生成Excel文件并下载
    XLSX.writeFile(wb, `资金明细录入模板_${new Date().toLocaleDateString()}.xlsx`);
    ElMessage.success('模板导出成功');
};

// 处理文件上传变化
const handleFileChange = async (file) => {
    // 如果正在导入中，不允许再次上传
    if (importing.value) {
        ElMessage.warning('数据处理中请勿重复提交');
        return;
    }
    try {
        ElMessage.info('正在解析文件，请稍候...');
        
        // 读取文件内容
        const data = await readFile(file.raw);
        
        // 解析Excel文件
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        // 将Excel数据转换为JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // 验证数据格式
        const validatedData = validateImportData(jsonData);
        
        if (validatedData.length === 0) {
            ElMessage.warning('未找到有效的数据记录');
            return;
        }
        
        // 确认导入
        await ElMessageBox.confirm(
            `共解析到 ${validatedData.length} 条记录，确认导入吗？`,
            '导入确认',
            { type: 'warning' }
        );
        
        // 批量导入数据
        await batchImportData(validatedData);
        
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('导入失败：' + (error.message || '未知错误'));
        }
    } finally {
        // 清空上传组件
        const uploadComponent = document.querySelector('.upload-demo .el-upload__input');
        if (uploadComponent) {
            uploadComponent.value = '';
        }
    }
};

// 读取文件内容
const readFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
};

// 验证导入数据
const validateImportData = (data) => {
    const validatedData = [];
    
    data.forEach((row, index) => {
        // 跳过示例行
        if (index === 0 && row['日期'] === '2024-01-01') {
            return;
        }
        
        // 验证必填字段
        if (!row['日期'] || !row['公司'] || !row['银行'] || !row['摘要']) {
            return;
        }
        
        // 转换数字字段
        const income = parseFloat(row['收入']) || 0;
        const expense = parseFloat(row['支出']) || 0;
        
        // 验证收入和支出不能同时为0
        if (income === 0 && expense === 0) {
            return;
        }
        
        // 构造有效的数据记录
        validatedData.push({
            date: row['日期'],
            company: row['公司'],
            bank: row['银行'],
            summary: row['摘要'],
            income: income,
            expense: expense,
            remark: row['备注'] || '',
            invoice: row['发票'] || ''
        });
    });
    
    return validatedData;
};

// 导入加载状态
const importing = ref(false);

// 批量导入数据
const batchImportData = async (data) => {
    if (importing.value) {
        ElMessage.warning('数据处理中请勿重复提交');
        return;
    }
    
    importing.value = true;
    ElMessage.info('正在导入数据，请稍候...');
    
    try {
        // 直接将整个数据数组发送到后端，利用后端的批量插入功能
        const result = await addCashRecord({ 
            username: userStore.name, 
            data: data // 发送整个数组
        });
        
        ElMessage.success(`全部 ${data.length} 条记录导入成功`);
    } catch (error) {
        // 检查响应中是否包含部分成功的信息
        if (error.response && error.response.data && error.response.data.message && error.response.data.message.includes('部分成功')) {
            const successCount = error.response.data.successCount || 0;
            const failCount = data.length - successCount;
            ElMessage.warning(`${successCount} 条记录导入成功，${failCount} 条记录导入失败`);
        } else {
            ElMessage.error('导入失败：' + (error.message || '未知错误'));
        }
    } finally {
        importing.value = false;
        // 重新加载数据
        getRecords();
    }
};



// 导出Excel的通用方法
const exportToExcel = (data, filename) => {
    // 准备导出数据
    const exportData = data.map(item => ({
        '序号': item.seq,
        '日期': item.date,
        '公司': item.company,
        '银行': item.bank,
        '摘要': item.summary,
        '收入': item.income || 0,
        '支出': item.expense || 0,
        '余额': item.balance,
        '备注': item.remark || '',
        '发票': item.invoice || ''
    }));
    
    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // 设置列宽
    const colWidths = [
        { wch: 8 },  // 序号
        { wch: 15 }, // 日期
        { wch: 20 }, // 公司
        { wch: 20 }, // 银行
        { wch: 50 }, // 摘要
        { wch: 15 }, // 收入
        { wch: 15 }, // 支出
        { wch: 15 }, // 余额
        { wch: 30 }, // 备注
        { wch: 30 }  // 发票
    ];
    ws['!cols'] = colWidths;
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '资金明细');
    
    // 生成Excel文件并下载
    XLSX.writeFile(wb, `${filename}_${new Date().toLocaleDateString()}.xlsx`);
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

.dialog-content {
    max-height: 400px;
    overflow-y: auto;
}

.upload-demo {
    display: inline-block;
    margin-left: 10px;
}
</style>
