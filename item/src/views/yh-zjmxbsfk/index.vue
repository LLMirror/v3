<template>
  <div class="page-wrap">
    <div class="page-header">
      <span>应收/应付明细录入</span>
    </div>
    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="应付明细录入" name="payable">
        <div class="batch-actions">
          <el-button type="primary" @click="downloadPayableTemplate">下载应付模板(CSV)</el-button>
          <el-upload :show-file-list="false" :auto-upload="false" accept=".csv" :on-change="onPayableFileChange">
            <el-button>导入应付CSV</el-button>
          </el-upload>
          <el-button :disabled="!(Array.isArray(payableBatch) && payableBatch.length)" @click="exportPayableCSV">导出已导入应付数据(CSV)</el-button>
          <el-button type="success" :disabled="!(Array.isArray(payableBatch) && payableBatch.length)" @click="submitPayableBatch">批量提交(占位)</el-button>
        </div>
        <el-form ref="payableFormRef" :model="payableForm" :rules="payableRules" label-width="110px" status-icon>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="系列" prop="series">
                <el-select v-model="payableForm.series" placeholder="请选择系列" filterable clearable>
                  <el-option v-for="opt in seriesOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="公司" prop="company">
                <el-select v-model="payableForm.company" placeholder="请选择公司" filterable clearable :disabled="!payableForm.series">
                  <el-option v-for="opt in payableCompanyOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="账号" prop="account">
                <el-select v-model="payableForm.account" placeholder="请选择账号" filterable clearable :disabled="!payableForm.company">
                  <el-option v-for="opt in payableAccountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="分类" prop="category">
                <el-input v-model="payableForm.category" placeholder="请输入分类" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="车牌" prop="plate">
                <el-input v-model="payableForm.plate" placeholder="请输入车牌" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="车架号" prop="vin">
                <el-input v-model="payableForm.vin" placeholder="请输入车架号" clearable />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="还款日期" prop="repayDate">
                <el-date-picker v-model="payableForm.repayDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="金额" prop="amount">
                <el-input-number v-model="payableForm.amount" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="商业保单号" prop="policyCommercial">
                <el-input v-model="payableForm.policyCommercial" placeholder="请输入商业保单号" clearable />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="车损" prop="carDamage">
                <el-input-number v-model="payableForm.carDamage" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="三者" prop="thirdParty">
                <el-input-number v-model="payableForm.thirdParty" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="司机" prop="driver">
                <el-input-number v-model="payableForm.driver" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="6">
              <el-form-item label="乘客" prop="passenger">
                <el-input-number v-model="payableForm.passenger" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="交强单号" prop="policyMandatory">
                <el-input v-model="payableForm.policyMandatory" placeholder="请输入交强单号" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="交强金额" prop="mandatoryAmount">
                <el-input-number v-model="payableForm.mandatoryAmount" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="出单日期" prop="issueDate">
                <el-date-picker v-model="payableForm.issueDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="form-actions">
            <el-button type="primary" @click="onSubmitPayable">保存</el-button>
            <el-button @click="onResetPayable">重置</el-button>
          </div>
        </el-form>

        <div v-if="Array.isArray(payableBatch) && payableBatch.length" class="batch-preview">
          <div class="preview-title">应付批量预览（{{ Array.isArray(payableBatch) ? payableBatch.length : 0 }} 条）</div>
          <el-table :data="payableBatch" size="small" border height="360">
            <el-table-column prop="系列" label="系列" width="120" />
            <el-table-column prop="公司" label="公司" width="160" />
            <el-table-column prop="账号" label="账号" width="160" />
            <el-table-column prop="分类" label="分类" width="120" />
            <el-table-column prop="车牌" label="车牌" width="120" />
            <el-table-column prop="车架号" label="车架号" width="160" />
            <el-table-column prop="还款日期" label="还款日期" width="120" />
            <el-table-column prop="金额" label="金额" width="120" />
            <el-table-column prop="商业保单号" label="商业保单号" width="160" />
            <el-table-column prop="车损" label="车损" width="100" />
            <el-table-column prop="三者" label="三者" width="100" />
            <el-table-column prop="司机" label="司机" width="100" />
            <el-table-column prop="乘客" label="乘客" width="100" />
            <el-table-column prop="交强单号" label="交强单号" width="160" />
            <el-table-column prop="交强金额" label="交强金额" width="120" />
            <el-table-column prop="出单日期" label="出单日期" width="120" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="应收明细录入" name="receivable">
        <div class="batch-actions">
          <el-button type="primary" @click="downloadReceivableTemplate">下载应收模板(CSV)</el-button>
          <el-upload :show-file-list="false" :auto-upload="false" accept=".csv" :on-change="onReceivableFileChange">
            <el-button>导入应收CSV</el-button>
          </el-upload>
          <el-button :disabled="!(Array.isArray(receivableBatch) && receivableBatch.length)" @click="exportReceivableCSV">导出已导入应收数据(CSV)</el-button>
          <el-button type="success" :disabled="!(Array.isArray(receivableBatch) && receivableBatch.length)" @click="submitReceivableBatch">批量提交(占位)</el-button>
        </div>
        <el-form ref="receivableFormRef" :model="receivableForm" :rules="receivableRules" label-width="110px" status-icon>
          <el-row :gutter="16">
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="系列" prop="series">
                <el-select v-model="receivableForm.series" placeholder="请选择系列" filterable clearable>
                  <el-option v-for="opt in seriesOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="公司" prop="company">
                <el-select v-model="receivableForm.company" placeholder="请选择公司" filterable clearable :disabled="!receivableForm.series">
                  <el-option v-for="opt in receivableCompanyOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="账号" prop="account">
                <el-select v-model="receivableForm.account" placeholder="请选择账号" filterable clearable :disabled="!receivableForm.company">
                  <el-option v-for="opt in receivableAccountOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
                </el-select>
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="分类" prop="category">
                <el-input v-model="receivableForm.category" placeholder="请输入分类" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="车牌" prop="plate">
                <el-input v-model="receivableForm.plate" placeholder="请输入车牌" clearable />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="车架" prop="vin">
                <el-input v-model="receivableForm.vin" placeholder="请输入车架" clearable />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="金额" prop="amount">
                <el-input-number v-model="receivableForm.amount" :min="0" :step="100" controls-position="right" placeholder="金额" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="应收月份" prop="receivableMonth">
                <el-date-picker v-model="receivableForm.receivableMonth" type="month" value-format="YYYY-MM" placeholder="选择月份" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="开始日期" prop="leaseStartDate">
                <el-date-picker v-model="receivableForm.leaseStartDate" type="date" value-format="YYYY-MM-DD" placeholder="选择开始日期" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="结束日期" prop="leaseEndDate">
                <el-date-picker v-model="receivableForm.leaseEndDate" type="date" value-format="YYYY-MM-DD" placeholder="选择结束日期" />
              </el-form-item>
            </el-col>

            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="赠送天数" prop="giftDays">
                <el-input-number v-model="receivableForm.giftDays" :min="0" :step="1" controls-position="right" placeholder="天数" />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="12" :md="8">
              <el-form-item label="续签日期">
                <el-input :model-value="receivableRenewDate" placeholder="自动计算：结束日期+赠送天数" disabled />
              </el-form-item>
            </el-col>
            <el-col :xs="24" :sm="24" :md="24">
              <el-form-item label="备注" prop="remark">
                <el-input v-model="receivableForm.remark" type="textarea" :rows="2" placeholder="备注" />
              </el-form-item>
            </el-col>
          </el-row>

          <div class="form-actions">
            <el-button type="primary" @click="onSubmitReceivable">保存</el-button>
            <el-button @click="onResetReceivable">重置</el-button>
          </div>
        </el-form>

        <div v-if="Array.isArray(receivableBatch) && receivableBatch.length" class="batch-preview">
          <div class="preview-title">应收批量预览（{{ Array.isArray(receivableBatch) ? receivableBatch.length : 0 }} 条）</div>
          <el-table :data="receivableBatch" size="small" border height="360">
            <el-table-column prop="系列" label="系列" width="120" />
            <el-table-column prop="公司" label="公司" width="160" />
            <el-table-column prop="账号" label="账号" width="160" />
            <el-table-column prop="分类" label="分类" width="120" />
            <el-table-column prop="车牌" label="车牌" width="120" />
            <el-table-column prop="车架" label="车架" width="160" />
            <el-table-column prop="金额" label="金额" width="120" />
            <el-table-column prop="应收月份" label="应收月份" width="120" />
            <el-table-column prop="开始日期" label="开始日期" width="120" />
            <el-table-column prop="结束日期" label="结束日期" width="120" />
            <el-table-column label="续签日期" width="120">
              <template #default="{ row }">{{ computeRowRenewDate(row) }}</template>
            </el-table-column>
            <el-table-column prop="赠送天数" label="赠送天数" width="120" />
            <el-table-column prop="备注" label="备注" />
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getSeriesList, getSettlementCompanyBank, getUniqueSeriesCompanyBank } from '@/api/system'

const activeTab = ref('payable')

// 系列下拉
const seriesOptions = ref([])
async function loadSeriesOptions() {
  try {
    const res = await getSeriesList({})
    const arr = res?.data || []
    seriesOptions.value = arr.map(s => ({ label: s, value: s }))
  } catch (e) {
    console.error(e)
    seriesOptions.value = []
  }
}

// 公司与账号下拉（联动：系列→公司→账号）
const payableCompanyOptions = ref([])
const payableAccountOptions = ref([])
const receivableCompanyOptions = ref([])
const receivableAccountOptions = ref([])

async function fetchCompaniesBySeries(series) {
  try {
    const res = await getUniqueSeriesCompanyBank({ data: { series } })
    const raw = res?.data
    // 支持两种返回结构：
    // 1) { companies: string[] } 形式
    // 2) 原始行数组 rows，需要前端去重提取
    let companiesArr = []
    if (Array.isArray(raw?.companies)) {
      companiesArr = raw.companies
    } else {
      const rows = Array.isArray(raw) ? raw : (raw?.data || [])
      companiesArr = Array.from(new Set(
        rows
          .filter(r => !series || (r?.['系列'] || r?.series) === series)
          .map(r => r?.['公司'] || r?.company)
          .filter(Boolean)
      ))
    }
    return companiesArr.map(c => ({ label: c, value: c }))
  } catch (e) {
    console.warn('按系列加载公司失败：', e?.message || e)
    return []
  }
}

async function fetchAccounts(series, company) {
  try {
    const res = await getUniqueSeriesCompanyBank({ data: { series, company } })
    const raw = res?.data
    // 支持两种返回结构：
    // 1) { banks: string[] } 或 { accounts: string[] } 形式
    // 2) 原始行数组 rows，需要前端去重提取
    let accArr = []
    if (Array.isArray(raw?.banks)) {
      accArr = raw.banks
    } else if (Array.isArray(raw?.accounts)) {
      accArr = raw.accounts
    } else {
      const rows = Array.isArray(raw) ? raw : (raw?.data || [])
      accArr = Array.from(new Set(
        rows
          .filter(r => (!series || (r?.['系列'] || r?.series) === series) && (!company || (r?.['公司'] || r?.company) === company))
          // 兼容不同字段：账号/account/bankAccount/银行/bank
          .map(r => r?.['账号'] || r?.account || r?.bankAccount || r?.['银行'] || r?.bank)
          .filter(Boolean)
      ))
    }
    return accArr.map(a => ({ label: a, value: a }))
  } catch (e) {
    console.warn('按公司加载账号失败：', e?.message || e)
    return []
  }
}

// 应付表单
const payableFormRef = ref()
const payableForm = reactive({
  series: '', company: '', account: '', category: '', plate: '', vin: '',
  repayDate: '', amount: null,
  policyCommercial: '', carDamage: null, thirdParty: null, driver: null, passenger: null,
  policyMandatory: '', mandatoryAmount: null, issueDate: ''
})
const payableRules = {
  series: [{ required: true, message: '请选择系列', trigger: 'change' }],
  company: [{ required: true, message: '请选择公司', trigger: 'change' }],
  account: [{ required: true, message: '请选择账号', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'change' }]
}
function onSubmitPayable() {
  payableFormRef.value?.validate(valid => {
    if (!valid) return
    // 待后端API对接
    console.log('submit payable payload ->', { ...payableForm })
    ElMessage.success('应付保存成功（稍后对接API）')
  })
}
function onResetPayable() {
  payableFormRef.value?.resetFields()
}

// 应收表单
const receivableFormRef = ref()
const receivableForm = reactive({
  series: '', company: '', account: '', category: '', plate: '', vin: '',
  amount: null, receivableMonth: '', leaseStartDate: '', leaseEndDate: '', giftDays: 0, remark: ''
})
const receivableRules = {
  series: [{ required: true, message: '请选择系列', trigger: 'change' }],
  company: [{ required: true, message: '请选择公司', trigger: 'change' }],
  account: [{ required: true, message: '请选择账号', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'change' }],
  receivableMonth: [{ required: true, message: '请选择应收月份', trigger: 'change' }],
  leaseStartDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  leaseEndDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' },
    { validator: validateEndDate, trigger: 'change' }
  ]
}
// 校验函数：结束日期需不小于开始日期
function validateEndDate(rule, value, callback) {
  const start = receivableForm.leaseStartDate
  const end = value
  if (!start || !end) return callback()
  // 使用字符串比较，YYYY-MM-DD 格式按字典序比较等价于时间比较
  if (end < start) return callback(new Error('结束日期需不小于开始日期'))
  callback()
}
function onSubmitReceivable() {
  receivableFormRef.value?.validate(valid => {
    if (!valid) return
    // 待后端API对接
    console.log('submit receivable payload ->', { ...receivableForm })
    ElMessage.success('应收保存成功（稍后对接API）')
  })
}
function onResetReceivable() {
  receivableFormRef.value?.resetFields()
}

onMounted(() => {
  loadSeriesOptions()
})

// 应付联动：系列→公司→账号
watch(() => payableForm.series, async (s) => {
  payableForm.company = ''
  payableForm.account = ''
  payableAccountOptions.value = []
  payableCompanyOptions.value = s ? await fetchCompaniesBySeries(s) : []
})
watch(() => payableForm.company, async (c) => {
  payableForm.account = ''
  payableAccountOptions.value = (c && payableForm.series) ? await fetchAccounts(payableForm.series, c) : []
})

// 应收联动：系列→公司→账号
watch(() => receivableForm.series, async (s) => {
  receivableForm.company = ''
  receivableForm.account = ''
  receivableAccountOptions.value = []
  receivableCompanyOptions.value = s ? await fetchCompaniesBySeries(s) : []
})
watch(() => receivableForm.company, async (c) => {
  receivableForm.account = ''
  receivableAccountOptions.value = (c && receivableForm.series) ? await fetchAccounts(receivableForm.series, c) : []
})

// 日期工具与“续签日期”计算
function pad2(n) { return String(n).padStart(2, '0') }
function formatDateYMD(d) {
  const y = d.getFullYear(); const m = pad2(d.getMonth() + 1); const day = pad2(d.getDate())
  return `${y}-${m}-${day}`
}
function addDays(dateStr, days) {
  if (!dateStr || isNaN(days)) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + Number(days))
  return formatDateYMD(d)
}
const receivableRenewDate = computed(() => {
  const end = receivableForm.leaseEndDate
  const days = receivableForm.giftDays
  if (!end || days === null || days === undefined) return ''
  return addDays(end, Number(days))
})
function computeRowRenewDate(row) {
  const end = row['结束日期']
  const days = Number(row['赠送天数'])
  return addDays(end, days)
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.page-header { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.form-actions { margin-top: 12px; }
.batch-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.batch-preview { margin-top: 12px; }
.preview-title { font-weight: 600; margin-bottom: 8px; }
</style>
// 批量数据
const payableBatch = ref([])
const receivableBatch = ref([])

// CSV 工具
function downloadCSV(filename, headers, rows) {
  const headerLine = headers.join(',')
  const bodyLines = rows.map(r => headers.map(h => (r[h] ?? '')).join(',')).join('\n')
  const content = headerLine + '\n' + (bodyLines || '')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length)
  if (!lines.length) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const row = {}
    headers.forEach((h, idx) => { row[h] = (cols[idx] ?? '').trim() })
    rows.push(row)
  }
  return { headers, rows }
}

// 应付批量
function downloadPayableTemplate() {
  const headers = ['系列','公司','账号','分类','车牌','车架号','还款日期','金额','商业保单号','车损','三者','司机','乘客','交强单号','交强金额','出单日期']
  downloadCSV('应付导入模板.csv', headers, [])
}
function onPayableFileChange(file) {
  const reader = new FileReader()
  reader.onload = () => {
    const { headers, rows } = parseCSV(String(reader.result || ''))
    const required = ['系列','公司','账号','金额']
    const missing = required.filter(h => !headers.includes(h))
    if (missing.length) {
      ElMessage.error('CSV缺少必要列: ' + missing.join(', '))
      return
    }
    payableBatch.value = rows
    ElMessage.success(`已导入应付 ${rows.length} 条`)
  }
  reader.readAsText(file.raw || file)
}
function exportPayableCSV() {
  const headers = ['系列','公司','账号','分类','车牌','车架号','还款日期','金额','商业保单号','车损','三者','司机','乘客','交强单号','交强金额','出单日期']
  downloadCSV('应付导出.csv', headers, payableBatch.value)
}
function submitPayableBatch() {
  // 等待后端API：这里仅占位
  console.log('submit payable batch ->', payableBatch.value)
  ElMessage.success('应付批量提交成功（占位，待API对接）')
}

// 应收批量
function downloadReceivableTemplate() {
  const headers = ['系列','公司','账号','分类','车牌','车架','金额','应收月份','开始日期','结束日期','赠送天数','备注']
  downloadCSV('应收导入模板.csv', headers, [])
}
function onReceivableFileChange(file) {
  const reader = new FileReader()
  reader.onload = () => {
    const { headers, rows } = parseCSV(String(reader.result || ''))
    const required = ['系列','公司','账号','金额']
    const missing = required.filter(h => !headers.includes(h))
    if (missing.length) {
      ElMessage.error('CSV缺少必要列: ' + missing.join(', '))
      return
    }
    receivableBatch.value = rows
    ElMessage.success(`已导应收 ${rows.length} 条`)
  }
  reader.readAsText(file.raw || file)
}
function exportReceivableCSV() {
  const headers = ['系列','公司','账号','分类','车牌','车架','金额','应收月份','开始日期','结束日期','续签日期','赠送天数','备注']
  const rows = (receivableBatch.value || []).map(r => ({ ...r, '续签日期': computeRowRenewDate(r) }))
  downloadCSV('应收导出.csv', headers, rows)
}
function submitReceivableBatch() {
  // 等待后端API：这里仅占位
  console.log('submit receivable batch ->', receivableBatch.value)
  ElMessage.success('应收批量提交成功（占位，待API对接）')
}