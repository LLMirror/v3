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
              <el-form-item label="对方公司名字" prop="targetCompanyName">
                <el-input v-model="payableForm.targetCompanyName" placeholder="请输入对方公司名字" clearable />
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
              <el-form-item label="实付金额" prop="actualPayAmount">
                <el-input-number v-model="payableForm.actualPayAmount" :min="0" :step="100" controls-position="right" placeholder="实付金额" />
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
            <el-table-column prop="对方公司名字" label="对方公司名字" width="160" />
            <el-table-column prop="账号" label="账号" width="160" />
            <el-table-column prop="分类" label="分类" width="120" />
            <el-table-column prop="车牌" label="车牌" width="120" />
            <el-table-column prop="车架号" label="车架号" width="160" />
            <el-table-column prop="还款日期" label="还款日期" width="120" />
            <el-table-column prop="金额" label="金额" width="120" />
            <el-table-column prop="实付金额" label="实付金额" width="120" />
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

        <div class="list-section">
  <div class="preview-title">应付记录列表（{{ Array.isArray(payableList) ? payableList.length : 0 }} 条）</div>
  <el-table :data="payableList" size="small" border height="360">
  <el-table-column prop="系列" label="系列" width="120" />
  <el-table-column prop="公司" label="公司" width="160" />
  <el-table-column prop="对方公司名字" label="对方公司名字" width="160" />
  <el-table-column prop="账号" label="账号" width="160" />
  <el-table-column prop="分类" label="分类" width="120" />
  <el-table-column prop="车牌" label="车牌" width="120" />
  <el-table-column prop="车架号" label="车架号" width="160" />
  <el-table-column prop="还款日期" label="还款日期" width="120" />
  <el-table-column prop="金额" label="金额" width="120" />
  <el-table-column prop="实付金额" label="实付金额" width="120" />
  <el-table-column prop="商业保单号" label="商业保单号" width="160" />
  <el-table-column prop="车损" label="车损" width="100" />
  <el-table-column prop="三者" label="三者" width="100" />
  <el-table-column prop="司机" label="司机" width="100" />
  <el-table-column prop="乘客" label="乘客" width="100" />
  <el-table-column prop="交强单号" label="交强单号" width="160" />
  <el-table-column prop="交强金额" label="交强金额" width="120" />
  <el-table-column prop="出单日期" label="出单日期" width="120" />
  <el-table-column prop="备注" label="备注" />
  <el-table-column label="操作" fixed="right" width="160">
    <template #default="{ row }">
      <el-button size="small" type="primary" @click="openEditPayable(row)">编辑</el-button>
      <el-button size="small" type="danger" @click="confirmDeletePayable(row)">删除</el-button>
    </template>
  </el-table-column>
  </el-table>
  <!-- 编辑应付对话框 -->
  <el-dialog v-model="editPayableVisible" title="编辑应付记录" width="560px">
    <el-form :model="editPayableForm" label-width="90px">
      <el-form-item label="金额"><el-input-number v-model="editPayableForm.amount" :min="0" :step="0.01" /></el-form-item>
      <el-form-item label="实付金额"><el-input-number v-model="editPayableForm.actualPayAmount" :min="0" :step="0.01" /></el-form-item>
      <el-form-item label="还款日期"><el-date-picker v-model="editPayableForm.repayDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="对方公司名字"><el-input v-model="editPayableForm.targetCompanyName" /></el-form-item>
      <el-form-item label="分类"><el-input v-model="editPayableForm.category" /></el-form-item>
      <el-form-item label="车牌"><el-input v-model="editPayableForm.plate" /></el-form-item>
      <el-form-item label="车架号"><el-input v-model="editPayableForm.vin" /></el-form-item>
      <el-form-item label="商业保单号"><el-input v-model="editPayableForm.policyCommercial" /></el-form-item>
      <el-form-item label="交强单号"><el-input v-model="editPayableForm.policyMandatory" /></el-form-item>
      <el-form-item label="交强金额"><el-input-number v-model="editPayableForm.mandatoryAmount" :min="0" :step="0.01" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="editPayableForm.remark" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editPayableVisible=false">取消</el-button>
      <el-button type="primary" @click="submitEditPayable">保存</el-button>
    </template>
  </el-dialog>
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
              <el-form-item label="对方公司名字" prop="targetCompanyName">
                <el-input v-model="receivableForm.targetCompanyName" placeholder="请输入对方公司名字" clearable />
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
              <el-form-item label="实收金额" prop="actualReceiveAmount">
                <el-input-number v-model="receivableForm.actualReceiveAmount" :min="0" :step="100" controls-position="right" placeholder="实收金额" />
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
            <el-table-column prop="实收金额" label="实收金额" width="120" />
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

        <div class="list-section">
  <div class="preview-title">应收记录列表（{{ Array.isArray(receivableList) ? receivableList.length : 0 }} 条）</div>
  <el-table :data="receivableList" size="small" border height="360">
  <el-table-column prop="系列" label="系列" width="120" />
  <el-table-column prop="公司" label="公司" width="160" />
  <el-table-column prop="对方公司名字" label="对方公司名字" width="160" />
  <el-table-column prop="账号" label="账号" width="160" />
   
  <el-table-column prop="分类" label="分类" width="120" />
  <el-table-column prop="车牌" label="车牌" width="120" />
  <el-table-column prop="车架" label="车架" width="160" />
  <el-table-column prop="金额" label="金额" width="120" />
  <el-table-column prop="实收金额" label="实收金额" width="120" />
  <el-table-column prop="应收月份" label="应收月份" width="120" />
  <el-table-column prop="开始日期" label="开始日期" width="120" />
  <el-table-column prop="结束日期" label="结束日期" width="120" />
  <el-table-column prop="续签日期" label="续签日期" width="120" />
  <el-table-column prop="赠送天数" label="赠送天数" width="120" />
  <el-table-column prop="备注" label="备注" />
  <el-table-column label="操作" fixed="right" width="160">
    <template #default="{ row }">
      <el-button size="small" type="primary" @click="openEditReceivable(row)">编辑</el-button>
      <el-button size="small" type="danger" @click="confirmDeleteReceivable(row)">删除</el-button>
    </template>
  </el-table-column>
  </el-table>
  <!-- 编辑应收对话框 -->
  <el-dialog v-model="editReceivableVisible" title="编辑应收记录" width="560px">
    <el-form :model="editReceivableForm" label-width="90px">
      <el-form-item label="金额"><el-input-number v-model="editReceivableForm.amount" :min="0" :step="0.01" /></el-form-item>
      <el-form-item label="实收金额"><el-input-number v-model="editReceivableForm.actualReceiveAmount" :min="0" :step="0.01" /></el-form-item>
      <el-form-item label="应收月份"><el-input v-model="editReceivableForm.receivableMonth" placeholder="YYYY-MM" /></el-form-item>
      <el-form-item label="开始日期"><el-date-picker v-model="editReceivableForm.leaseStartDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="结束日期"><el-date-picker v-model="editReceivableForm.leaseEndDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      <el-form-item label="赠送天数"><el-input-number v-model="editReceivableForm.giftDays" :min="0" /></el-form-item>
      <el-form-item label="分类"><el-input v-model="editReceivableForm.category" /></el-form-item>
      <el-form-item label="车牌"><el-input v-model="editReceivableForm.plate" /></el-form-item>
      <el-form-item label="车架"><el-input v-model="editReceivableForm.vin" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="editReceivableForm.remark" type="textarea" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="editReceivableVisible=false">取消</el-button>
      <el-button type="primary" @click="submitEditReceivable">保存</el-button>
    </template>
  </el-dialog>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getSeriesList, getSettlementCompanyBank, getUniqueSeriesCompanyBank, addPayable, addReceivable, getPayableList, getReceivableList, updatePayable, deletePayable, updateReceivable, deleteReceivable, getCashRecords } from '@/api/system'

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
  series: '', company: '', targetCompanyName: '', account: '', category: '', plate: '', vin: '',
  repayDate: '', amount: null, actualPayAmount: null,
  policyCommercial: '', carDamage: null, thirdParty: null, driver: null, passenger: null,
  policyMandatory: '', mandatoryAmount: null, issueDate: '',
  remark: ''
})
const payableRules = {
  series: [{ required: true, message: '请选择系列', trigger: 'change' }],
  company: [{ required: true, message: '请选择公司', trigger: 'change' }],
  account: [{ required: true, message: '请选择账号', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'change' }]
}
async function onSubmitPayable() {
  payableFormRef.value?.validate(async valid => {
    if (!valid) return
    try {
      const payload = { ...payableForm }
      await addPayable({ data: payload })
      ElMessage.success('应付保存成功')
      await loadPayableList()
    } catch (e) {
      ElMessage.error('应付保存失败：' + (e?.message || '服务器异常'))
    }
  })
}
function onResetPayable() {
  payableFormRef.value?.resetFields()
}

// 应收表单
const receivableFormRef = ref()
const receivableForm = reactive({
  series: '', company: '', targetCompanyName: '', account: '', category: '', plate: '', vin: '',
  amount: null, actualReceiveAmount: null, receivableMonth: '', leaseStartDate: '', leaseEndDate: '', giftDays: 0, remark: ''
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
async function onSubmitReceivable() {
  receivableFormRef.value?.validate(async valid => {
    if (!valid) return
    try {
      const payload = { ...receivableForm }
      payload.renewDate = receivableRenewDate.value || ''
      await addReceivable({ data: payload })
      ElMessage.success('应收保存成功')
      await loadReceivableList()
    } catch (e) {
      ElMessage.error('应收保存失败：' + (e?.message || '服务器异常'))
    }
  })
}
function onResetReceivable() {
  receivableFormRef.value?.resetFields()
}

onMounted(() => {
  loadSeriesOptions()
  loadPayableList()
  loadReceivableList()
})

// 应付联动：系列→公司→账号
watch(() => payableForm.series, async (s) => {
  payableForm.company = ''
  payableForm.account = ''
  payableAccountOptions.value = []
  payableCompanyOptions.value = s ? await fetchCompaniesBySeries(s) : []
  loadPayableList()
})
watch(() => payableForm.company, async (c) => {
  payableForm.account = ''
  payableAccountOptions.value = (c && payableForm.series) ? await fetchAccounts(payableForm.series, c) : []
  loadPayableList()
})

// 应收联动：系列→公司→账号
watch(() => receivableForm.series, async (s) => {
  receivableForm.company = ''
  receivableForm.account = ''
  receivableAccountOptions.value = []
  receivableCompanyOptions.value = s ? await fetchCompaniesBySeries(s) : []
  loadReceivableList()
})
watch(() => receivableForm.company, async (c) => {
  receivableForm.account = ''
  receivableAccountOptions.value = (c && receivableForm.series) ? await fetchAccounts(receivableForm.series, c) : []
  loadReceivableList()
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

// ===== 自动计算：实收/实付金额（来源：出纳资金明细 pt_cw_zjmxb） =====
function getMonthRangeFromYearMonth(ym) {
  // ym: 'YYYY-MM'
  if (!ym || typeof ym !== 'string' || ym.length < 7) return { from: '', to: '' }
  const [yStr, mStr] = ym.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  if (!y || !m) return { from: '', to: '' }
  const lastDay = new Date(y, m, 0).getDate()
  const mm = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(lastDay).padStart(2, '0')}` }
}

function getMonthRangeFromDate(dateStr) {
  // dateStr: 'YYYY-MM-DD'
  if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 7) return { from: '', to: '' }
  const ym = dateStr.slice(0, 7)
  return getMonthRangeFromYearMonth(ym)
}

async function computeActualReceiveAmount() {
  const series = (receivableForm.series || '').trim()
  const company = (receivableForm.company || '').trim()
  const bank = (receivableForm.account || '').trim()
  const target = (receivableForm.targetCompanyName || '').trim()
  const ym = (receivableForm.receivableMonth || '').trim()
  if (!series || !company || !bank || !ym) return
  const { from, to } = getMonthRangeFromYearMonth(ym)
  try {
    const res = await getCashRecords({
      series,
      company,
      bank,
      summary: target || undefined,
      dateFrom: from,
      dateTo: to,
      page: 1,
      size: 5000
    })
    const rows = Array.isArray(res?.data) ? res.data : []
    const toNum = v => {
      if (v === null || v === undefined || v === '') return 0
      if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0
      return Number(v) || 0
    }
    const sumIncome = rows.reduce((acc, r) => acc + toNum(r.income ?? r['收入']), 0)
    receivableForm.actualReceiveAmount = Math.round(sumIncome * 100) / 100
  } catch (e) {
    console.warn('computeActualReceiveAmount error:', e?.message || e)
  }
}

async function computeActualPayAmount() {
  const series = (payableForm.series || '').trim()
  const company = (payableForm.company || '').trim()
  const bank = (payableForm.account || '').trim()
  const target = (payableForm.targetCompanyName || '').trim()
  const repayDate = (payableForm.repayDate || '').trim()
  if (!series || !company || !bank || !repayDate) return
  const { from, to } = getMonthRangeFromDate(repayDate)
  try {
    const res = await getCashRecords({
      series,
      company,
      bank,
      summary: target || undefined,
      dateFrom: from,
      dateTo: to,
      page: 1,
      size: 5000
    })
    const rows = Array.isArray(res?.data) ? res.data : []
    const toNum = v => {
      if (v === null || v === undefined || v === '') return 0
      if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0
      return Number(v) || 0
    }
    const sumExpense = rows.reduce((acc, r) => acc + toNum(r.expense ?? r['支出']), 0)
    payableForm.actualPayAmount = Math.round(sumExpense * 100) / 100
  } catch (e) {
    console.warn('computeActualPayAmount error:', e?.message || e)
  }
}

// 监听应收关键字段变化，自动计算“实收金额”
watch(
  () => [receivableForm.series, receivableForm.company, receivableForm.account, receivableForm.targetCompanyName, receivableForm.receivableMonth],
  () => { computeActualReceiveAmount() }
)

// 监听应付关键字段变化，自动计算“实付金额”
watch(
  () => [payableForm.series, payableForm.company, payableForm.account, payableForm.targetCompanyName, payableForm.repayDate],
  () => { computeActualPayAmount() }
)
// 编辑对话框：应付
const editPayableVisible = ref(false)
const editPayableForm = reactive({ id: null, amount: null, actualPayAmount: null, repayDate: '', targetCompanyName: '', category: '', plate: '', vin: '', policyCommercial: '', policyMandatory: '', mandatoryAmount: null, remark: '' })
function openEditPayable(row) {
  editPayableVisible.value = true
  editPayableForm.id = row.id
  editPayableForm.amount = row['金额']
  editPayableForm.actualPayAmount = row['实付金额']
  editPayableForm.repayDate = row['还款日期'] || ''
  editPayableForm.targetCompanyName = row['对方公司名字'] || ''
  editPayableForm.category = row['分类'] || ''
  editPayableForm.plate = row['车牌'] || ''
  editPayableForm.vin = row['车架号'] || ''
  editPayableForm.policyCommercial = row['商业保单号'] || ''
  editPayableForm.policyMandatory = row['交强单号'] || ''
  editPayableForm.mandatoryAmount = row['交强金额']
  editPayableForm.remark = row['备注'] || ''
}
async function submitEditPayable() {
  try {
    await updatePayable({ data: { id: editPayableForm.id, amount: editPayableForm.amount, actualPayAmount: editPayableForm.actualPayAmount, repayDate: editPayableForm.repayDate, targetCompanyName: editPayableForm.targetCompanyName, category: editPayableForm.category, plate: editPayableForm.plate, vin: editPayableForm.vin, policyCommercial: editPayableForm.policyCommercial, policyMandatory: editPayableForm.policyMandatory, mandatoryAmount: editPayableForm.mandatoryAmount, remark: editPayableForm.remark } })
    ElMessage.success('应付更新成功')
    editPayableVisible.value = false
    await loadPayableList()
  } catch (e) {
    ElMessage.error('应付更新失败')
  }
}
async function confirmDeletePayable(row) {
  // 先处理用户确认，取消/关闭直接返回，不提示错误
  try {
    await ElMessageBox.confirm(`确认删除应付记录 #${row.id} 吗？`, '提示', { type: 'warning' })
  } catch (e) {
    return
  }
  // 执行删除
  try {
    await deletePayable({ data: { id: row.id } })
    ElMessage.success('已删除应付记录')
    await loadPayableList()
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '删除失败')
  }
}

// 编辑对话框：应收
const editReceivableVisible = ref(false)
const editReceivableForm = reactive({ id: null, amount: null, actualReceiveAmount: null, receivableMonth: '', leaseStartDate: '', leaseEndDate: '', giftDays: null, targetCompanyName: '', category: '', plate: '', vin: '', remark: '' })
function openEditReceivable(row) {
  editReceivableVisible.value = true
  editReceivableForm.id = row.id
  editReceivableForm.amount = row['金额']
  editReceivableForm.actualReceiveAmount = row['实收金额']
  editReceivableForm.receivableMonth = row['应收月份'] || ''
  editReceivableForm.leaseStartDate = row['开始日期'] || ''
  editReceivableForm.leaseEndDate = row['结束日期'] || ''
  editReceivableForm.giftDays = row['赠送天数']
  editReceivableForm.targetCompanyName = row['对方公司名字'] || ''
  editReceivableForm.category = row['分类'] || ''
  editReceivableForm.plate = row['车牌'] || ''
  editReceivableForm.vin = row['车架'] || ''
  editReceivableForm.remark = row['备注'] || ''
}
async function submitEditReceivable() {
  try {
    const renewDate = addDays(editReceivableForm.leaseEndDate, Number(editReceivableForm.giftDays))
    await updateReceivable({ data: { id: editReceivableForm.id, amount: editReceivableForm.amount, actualReceiveAmount: editReceivableForm.actualReceiveAmount, receivableMonth: editReceivableForm.receivableMonth, leaseStartDate: editReceivableForm.leaseStartDate, leaseEndDate: editReceivableForm.leaseEndDate, renewDate, giftDays: editReceivableForm.giftDays, targetCompanyName: editReceivableForm.targetCompanyName, category: editReceivableForm.category, plate: editReceivableForm.plate, vin: editReceivableForm.vin, remark: editReceivableForm.remark } })
    ElMessage.success('应收更新成功')
    editReceivableVisible.value = false
    await loadReceivableList()
  } catch (e) {
    ElMessage.error('应收更新失败')
  }
}
async function confirmDeleteReceivable(row) {
  // 先处理用户确认，取消/关闭直接返回，不提示错误
  try {
    await ElMessageBox.confirm(`确认删除应收记录 #${row.id} 吗？`, '提示', { type: 'warning' })
  } catch (e) {
    return
  }
  // 执行删除
  try {
    
    await deleteReceivable({ data: { id: row.id } })
    ElMessage.success('已删除应收记录')
    await loadReceivableList()
  } catch (e) {
    ElMessage.error(e?.msg || e?.message || '删除失败')
  }
}
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
  const headers = ['系列','公司','对方公司名字','账号','分类','车牌','车架号','还款日期','金额','商业保单号','车损','三者','司机','乘客','交强单号','交强金额','出单日期']
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
  const headers = ['系列','公司','对方公司名字','账号','分类','车牌','车架号','还款日期','金额','商业保单号','车损','三者','司机','乘客','交强单号','交强金额','出单日期']
  downloadCSV('应付导出.csv', headers, payableBatch.value)
}
function submitPayableBatch() {
  // 等待后端API：这里仅占位
  console.log('submit payable batch ->', payableBatch.value)
  ElMessage.success('应付批量提交成功（占位，待API对接）')
}

// 应收批量
function downloadReceivableTemplate() {
  const headers = ['系列','公司','对方公司名字','账号','分类','车牌','车架','金额','应收月份','开始日期','结束日期','赠送天数','备注']
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
  const headers = ['系列','公司','对方公司名字','账号','分类','车牌','车架','金额','应收月份','开始日期','结束日期','续签日期','赠送天数','备注']
  const rows = (receivableBatch.value || []).map(r => ({ ...r, '续签日期': computeRowRenewDate(r) }))
  downloadCSV('应收导出.csv', headers, rows)
}
function submitReceivableBatch() {
  // 等待后端API：这里仅占位
  console.log('submit receivable batch ->', receivableBatch.value)
  ElMessage.success('应收批量提交成功（占位，待API对接）')
}

// 列表加载函数
const payableList = ref([])
const receivableList = ref([])
async function loadPayableList() {
  try {
    const res = await getPayableList({ data: { series: payableForm.series, company: payableForm.company, account: payableForm.account } })
    payableList.value = res?.data || []
    await enrichPayableListActuals()
  } catch (e) {
    console.warn('加载应付列表失败：', e?.message || e)
    payableList.value = []
  }
}
async function loadReceivableList() {
  try {
    const res = await getReceivableList({ data: { series: receivableForm.series, company: receivableForm.company, account: receivableForm.account } })
    receivableList.value = res?.data || []
    await enrichReceivableListActuals()
  } catch (e) {
    console.warn('加载应收列表失败：', e?.message || e)
    receivableList.value = []
  }
}

// 列表自动填充：应收的“实收金额”按当月汇总出纳“收入”
async function enrichReceivableListActuals() {
  const rows = Array.isArray(receivableList.value) ? receivableList.value : []
  if (!rows.length) return
  const toNum = v => {
    if (v === null || v === undefined || v === '') return 0
    if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0
    return Number(v) || 0
  }
  const tasks = new Map()
  const makeKey = (r) => {
    const series = (r['系列'] || '').trim()
    const company = (r['公司'] || '').trim()
    const bank = (r['账号'] || r['银行'] || '').trim()
    const target = (r['对方公司名字'] || '').trim()
    const ym = (r['应收月份'] || '').trim()
    return `${series}||${company}||${bank}||${target}||${ym}`
  }
  const monthRange = (ym) => {
    const { from, to } = getMonthRangeFromYearMonth(ym)
    return { from, to }
  }
  for (const r of rows) {
    const key = makeKey(r)
    if (!tasks.has(key)) {
      const series = (r['系列'] || '').trim()
      const company = (r['公司'] || '').trim()
      const bank = (r['账号'] || r['银行'] || '').trim()
      const summary = (r['对方公司名字'] || '').trim() || undefined
      const ym = (r['应收月份'] || '').trim()
      if (!series || !company || !bank || !ym) continue
      const { from, to } = monthRange(ym)
      tasks.set(key, getCashRecords({ series, company, bank, summary, dateFrom: from, dateTo: to, page: 1, size: 5000 }))
    }
  }
  const results = new Map()
  for (const [key, p] of tasks.entries()) {
    try {
      const res = await p
      const arr = Array.isArray(res?.data) ? res.data : []
      const sumIncome = arr.reduce((acc, r) => acc + toNum(r.income ?? r['收入']), 0)
      results.set(key, Math.round(sumIncome * 100) / 100)
    } catch (e) {
      results.set(key, undefined)
      console.warn('应收列表自动汇总失败:', e?.message || e)
    }
  }
  for (const r of rows) {
    const key = makeKey(r)
    const val = results.get(key)
    if (val !== undefined) r['实收金额'] = val
  }
}

// 列表自动填充：应付的“实付金额”按当月汇总出纳“支出”
async function enrichPayableListActuals() {
  const rows = Array.isArray(payableList.value) ? payableList.value : []
  if (!rows.length) return
  const toNum = v => {
    if (v === null || v === undefined || v === '') return 0
    if (typeof v === 'string') return Number(v.replace(/,/g, '')) || 0
    return Number(v) || 0
  }
  const tasks = new Map()
  const makeKey = (r) => {
    const series = (r['系列'] || '').trim()
    const company = (r['公司'] || '').trim()
    const bank = (r['账号'] || r['银行'] || '').trim()
    const target = (r['对方公司名字'] || '').trim()
    const date = (r['还款日期'] || '').trim()
    const ym = date ? date.slice(0, 7) : ''
    return `${series}||${company}||${bank}||${target}||${ym}`
  }
  const monthRangeFromDate = (dateStr) => {
    const { from, to } = getMonthRangeFromDate(dateStr)
    return { from, to }
  }
  for (const r of rows) {
    const key = makeKey(r)
    if (!tasks.has(key)) {
      const series = (r['系列'] || '').trim()
      const company = (r['公司'] || '').trim()
      const bank = (r['账号'] || r['银行'] || '').trim()
      const summary = (r['对方公司名字'] || '').trim() || undefined
      const date = (r['还款日期'] || '').trim()
      if (!series || !company || !bank || !date) continue
      const { from, to } = monthRangeFromDate(date)
      tasks.set(key, getCashRecords({ series, company, bank, summary, dateFrom: from, dateTo: to, page: 1, size: 5000 }))
    }
  }
  const results = new Map()
  for (const [key, p] of tasks.entries()) {
    try {
      const res = await p
      const arr = Array.isArray(res?.data) ? res.data : []
      const sumExpense = arr.reduce((acc, r) => acc + toNum(r.expense ?? r['支出']), 0)
      results.set(key, Math.round(sumExpense * 100) / 100)
    } catch (e) {
      results.set(key, undefined)
      console.warn('应付列表自动汇总失败:', e?.message || e)
    }
  }
  for (const r of rows) {
    const key = makeKey(r)
    const val = results.get(key)
    if (val !== undefined) r['实付金额'] = val
  }
}
</script>

<style scoped>
.page-wrap { padding: 16px; }
.page-header { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
.form-actions { margin-top: 12px; }
.batch-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.batch-preview { margin-top: 12px; }
.preview-title { font-weight: 600; margin-bottom: 8px; }
.list-section { margin-top: 16px; }
</style>