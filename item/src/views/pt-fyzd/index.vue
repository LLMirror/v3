<template>
  <div class="page-container">
    <!-- Toolbar (Hidden when printing) -->
    <div class="toolbar no-print">
      <div class="toolbar-title">加盟商结算对账单</div>
      
      <div class="toolbar-actions">
        <!-- Filters -->
        <div class="filter-controls">
          <el-select 
            v-model="filters.company" 
            placeholder="选择加盟商" 
            style="width: 220px" 
            filterable
          >
            <el-option
              v-for="item in companyOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-date-picker
            v-model="filters.month"
            type="month"
            placeholder="选择账期"
            style="width: 140px"
            format="YYYY-MM"
            value-format="YYYY-MM"
            :clearable="false"
          />
        </div>

        <!-- Scale Controls -->
        <div class="scale-controls">
          <!-- <span>缩放: {{ Math.round(scale * 100) }}%</span> -->
          <!-- <el-button-group>
            <el-button size="small" @click="scale = Math.max(0.5, scale - 0.1)">-</el-button>
            <el-button size="small" @click="scale = Math.min(1.5, scale + 0.1)">+</el-button>
          </el-button-group> -->
        </div>
        <el-button type="primary" @click="handlePrint">打印账单</el-button>
        <el-button type="success" @click="handleDownloadPDF">下载PDF</el-button>
      </div>
    </div>

    <!-- Content Wrapper -->
    <div class="main-content">
      <!-- Left Side: Printable Area -->
      <div class="statement-wrapper">
        <div class="statement-scale-container" :style="{ transform: `scale(${scale})` }">
          <div class="statement-container" id="statement-content">
            <table class="statement-table">
            <!-- Header with Background -->
            <tr>
              <td colspan="9" class="header-bg">{{ statementData.companyName }}</td>
            </tr>
            
            <!-- Title -->
            <tr>
              <td colspan="9" class="title-row">加盟商结算对账单</td>
            </tr>
            
            <!-- Intro Text -->
            <tr>
              <td colspan="9" class="intro-text">
                为确保与贵公司长期友好地合作，准确并及时反映两个公司的对账往来，根据双方签定的合作协议，核算当期的结算金额如下表，请加盟商仔细核对并在3个工作日内反馈核对结果。如核对无误，请在本对账函下方“数据确认无误“处签章并开具相应发票（开票税目为：现代服务费*服务费）并邮寄到以下收件地址，我方在收到签章的对账单和发票后将安排相应的付款。
              </td>
            </tr>
            
            <!-- Settlement Period -->
            <tr>
              <td class="label-cell">结算周期：</td>
              <td colspan="8" class="value-cell-center">{{ statementData.period }}</td>
            </tr>
            
            <!-- Detail Headers -->
            <tr class="gray-header">
              <td class="col-header">运力公司明细：</td>
              <td class="col-header">{{ baseMetricLabel }}</td>
              <td class="col-header">{{ baseRateLabel }}</td>
              <td class="col-header">基础分佣金额（元）</td>
              <td class="col-header">阶梯比率</td>
              <td class="col-header">阶梯分佣金额(元)</td>
              <td class="col-header">司机奖励金额（元）</td>
              <td class="col-header">墨竹金额（元）</td>
              <td class="col-header">结算金额（元）</td>
            </tr>
            
            <!-- Detail Data (Example Row) -->
            <tr>
              <td class="data-cell bold">合计：</td>
              <td class="data-cell">{{ fmt2(statementData.shareBase) }}</td>
              <td class="data-cell">{{ baseRateDisplay }}</td>
              <td class="data-cell">{{ fmt2(statementData.baseAmount) }}</td>
              <td class="data-cell">{{ fmtRate(statementData.ladderRatio, statementData.ladderMethod || '百分比') }}</td>
              <td class="data-cell">{{ fmt2(statementData.ladderAmount) }}</td>
              <td class="data-cell">{{ fmt2(statementData.driverRewardAmount) }}</td>
              <td class="data-cell">{{ fmt2(statementData.mozhuAmount) }}</td>
              <td class="data-cell red-text bold">{{ fmt2(statementData.amount) }}</td>
            </tr>
            
            <!-- Invoice Information -->
            <tr>
              <td class="label-cell-vertical">发票信息：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">单位名称：</span>{{ statementData.invoiceUnitName }}</div>
                <div class="info-row"><span class="info-label">信用代码：</span>{{ statementData.creditCode }}</div>
                <div class="info-row"><span class="info-label">地址：</span>{{ statementData.invoiceAddress }}</div>
              </td>
            </tr>
            
            <!-- Bank Information -->
            <tr>
              <td class="label-cell-vertical">银行信息：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">银行账户名称：</span>{{ statementData.bankAccountName }}</div>
                <div class="info-row"><span class="info-label">银行收款账号：</span>{{ statementData.bankAccountNumber }}</div>
                <div class="info-row"><span class="info-label">支付信息：</span>{{ statementData.paymentInfo }}</div>
              </td>
            </tr>
            
            <!-- Mailing Address -->
            <tr>
              <td class="label-cell-vertical">发票收件地址：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">收件地址：</span>{{ statementData.mailAddress }}</div>
                <div class="info-row"><span class="info-label">收件人：</span>{{ statementData.mailReceiver }}</div>
                <div class="info-row"><span class="info-label">收件人电话：</span>{{ statementData.mailPhone }}</div>
              </td>
            </tr>
            
            <!-- Special Note -->
            <tr>
              <td class="label-cell-vertical">特别说明：</td>
              <td colspan="8" class="content-cell-left">
                如发票信息有误或未在规定时间内寄达我方（按快递签收时间为准），结算费用将顺延到下一期结算
              </td>
            </tr>
            
            <!-- Signatures -->
            <tr>
              <td class="label-cell-center">公司签章</td>
              <td colspan="8" rowspan="3" class="signature-area">
                <div class="signature-text">数据确认无误，转入账号确认无误同意转账</div>
              </td>
            </tr>
            <tr>
              <td class="label-cell-center">经办人</td>
            </tr>
            <tr>
              <td class="label-cell-center">确认日期</td>
            </tr>
            
          </table>
        </div>
      </div>
    </div>

    <!-- Right Side: Caliber Data -->
      <div class="caliber-panel no-print">
  
        
        <!-- Driver Side Table -->
        <div class="caliber-section">
          <div class="section-title">司机端数据</div>
          <div class="company-title">{{ filters.company }}</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th></th>
                  <th>分类</th>
                  <th>不免佣</th>
                  <th>免佣</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(item, index) in driverRows" :key="'driver-'+index">
                  <tr>
                    <td rowspan="2" class="org-name">{{ index === 0 ? '汇总数据' : item.name }}</td>
                    <td class="row-label">订单量</td>
                    <td>{{ item.unfree_qty }}</td>
                    <td>{{ item.free_qty }}</td>
                    <td class="total-col">{{ item.total_qty }}</td>
                  </tr>
                  <tr>
                    <td class="row-label">司机行程</td>
                    <td>{{ fmt2(item.unfree_driver_trip_fee) }}</td>
                    <td>{{ fmt2(item.free_driver_trip_fee) }}</td>
                    <td class="total-col">{{ fmt2(item.total_driver_trip_fee) }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Client Side Table -->
        <div class="caliber-section">
          <div class="section-title">客户端数据</div>
          <div class="company-title">{{ filters.company }}</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th></th>
                  <th>分类</th>
                  <th>不免佣</th>
                  <th>免佣</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(item, index) in clientRows" :key="'client-'+index">
                  <tr>
                    <td rowspan="2" class="org-name">{{ index === 0 ? '汇总数据' : item.name }}</td>
                    <td class="row-label">订单量</td>
                    <td>{{ item.unfree_qty }}</td>
                    <td>{{ item.free_qty }}</td>
                    <td class="total-col">{{ item.total_qty }}</td>
                  </tr>
                  <tr>
                    <td class="row-label">行程费</td>
                    <td>{{ fmt2(item.unfree_trip_fee) }}</td>
                    <td>{{ fmt2(item.free_trip_fee) }}</td>
                    <td class="total-col">{{ fmt2(item.total_trip_fee) }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Metrics Overview Table -->
        <div class="caliber-section">
          <div class="section-title">指标总览</div>
          <div class="table-scroll-container" style="max-height:none">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th>指标</th>
                  <th>数值</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="org-name">本月天数</td>
                  <td>{{ monthDays }}</td>
                </tr>
                <tr>
                  <td class="org-name">总订单量</td>
                  <td>{{ driverFlowSummary.order_qty_total }}</td>
                </tr>
                <tr>
                  <td class="org-name">总订单收入</td>
                  <td>{{ fmt2(driverFlowSummary.order_income_total) }}</td>
                </tr>
                <tr>
                  <td class="org-name">日均订单量</td>
                  <td>{{ fmt2(driverFlowSummary.order_qty_avg) }}</td>
                </tr>
                <tr>
                  <td class="org-name">日均订单收入</td>
                  <td>{{ fmt2(driverFlowSummary.order_income_avg) }}</td>
                </tr>
                <tr>
                  <td class="org-name">当月激活司机量</td>
                  <td>{{ driverFlowSummary.activated_count }}</td>
                </tr>
                <tr>
                  <td class="org-name">当月激活且单量>1的司机数</td>
                  <td>{{ driverFlowSummary.activated_over1_count }}</td>
                </tr>
                <tr>
                  <td class="org-name">前三个月司机量（累计月1-3）</td>
                  <td>{{ driverFlowSummary.first_three_months_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Driver Flow Table -->
        <div class="caliber-section">
          <div class="section-title">司机流水详情</div>
          <div class="summary-bar">
            本月天数：{{ monthDays }} ｜ 总订单量：{{ driverFlowSummary.order_qty_total }} ｜ 总订单收入：{{ fmt2(driverFlowSummary.order_income_total) }} ｜ 日均订单量：{{ fmt2(driverFlowSummary.order_qty_avg) }} ｜ 日均订单收入：{{ fmt2(driverFlowSummary.order_income_avg) }} ｜ 本月激活司机量：{{ driverFlowSummary.activated_count }}
          </div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th>司机</th>
                  <th>司机ID</th>
                  <th>当月激活</th>
                  <th>激活月份</th>
                  <th>累计月</th>
                  <th>订单量</th>
                  <th>订单收入</th>
                  <th>奖励</th>
                  <th>日均单量</th>
                  <th>日均订单收入</th>
                  <th>总金额</th>
                  <th>返现金额</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in driverFlowRows" :key="'flow-'+index" :class="{'highlight-green': Number(item.order_income) > 10000}">
                  <td class="org-name">{{ item.driver_name }}</td>
                  <td class="id-cell">{{ item.driver_id }}</td>
                  <td :class="{'avg-qty-strong': item.activated_in_month === '是'}">{{ item.activated_in_month }}</td>
                  <td>{{ item.activate_month || '-' }}</td>
                  <td>{{ item.cumulative_months }}</td>
                  <td>{{ item.order_qty }}</td>
                  <td>{{ fmt2(item.order_income) }}</td>
                  <td>{{ fmt2(item.reward_income) }}</td>
                  <td :class="{'avg-qty-strong': (Number(item.order_qty || 0) / monthDays) > 350}">{{ fmt2(item.order_qty / monthDays) }}</td>
                  <td>{{ fmt2(item.order_income / monthDays) }}</td>
                  <td class="total-col">{{ fmt2(item.total_income) }}</td>
                  <td>{{ fmt2(item.cashback) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="caliber-section">
          <div class="section-title">优惠账单数据</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th>车队</th>
                  <th>平台承担</th>
                  <th>高德承担</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in discountRows" :key="'disc-'+index">
                  <td class="org-name">{{ item.name }}</td>
                  <td>{{ fmt2(item.platform_bear) }}</td>
                  <td class="total-col">{{ fmt2(item.gaode_bear) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
       

        <!-- Business Rules -->
        <div class="caliber-section">
          <div class="section-title">商务规则</div>
          <div class="rules-container">
            <div class="rule-item">
              <span class="rule-label">基础政策ID：</span>
              <span class="rule-value">{{ policyDetail.base_policy_id || '-' }}</span>
            </div>
            <div class="rule-item">
              <span class="rule-label">阶梯政策ID：</span>
              <span class="rule-value">{{ (policyDetail.ladder_policy_ids || []).join('，') || '-' }}</span>
            </div>
            <div class="rule-item">
              <span class="rule-label">基础政策明细：</span>
              <span class="rule-value">{{ policyDetail.base_rows && policyDetail.base_rows.length ? policyDetail.base_rows.length+' 条' : '-' }}</span>
            </div>
            <div class="rule-item">
              <span class="rule-label">阶梯政策明细：</span>
              <span class="rule-value">{{ policyDetail.ladder_rows && policyDetail.ladder_rows.length ? policyDetail.ladder_rows.length+' 条' : '-' }}</span>
            </div>
          </div>
          <div class="policy-tables">
            <div class="policy-block">
              <div class="sub-title">基础配置</div>
              <div class="table-scroll-container">
                <table class="caliber-table">
                  <thead>
                    <tr>
                      <th>政策ID</th>
                      <th>分类</th>
                      <th>端口</th>
                      <th>基数</th>
                      <th>是否双计算</th>
                      <th>是否免佣</th>
                      <th>是否扣除墨竹</th>
                      <th>返佣方式</th>
                      <th>免佣费率/单价</th>
                      <th>不免佣费率/单价</th>
                      <th>费率/单价</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in policyDetail.base_rows" :key="'base-'+i">
                      <td class="org-name">{{ row.policy_id }}</td>
                      <td>{{ row.category }}</td>
                      <td>{{ row.port }}</td>
                      <td>{{ row.base_metric }}</td>
                      <td>{{ row.double_calc ? '是' : '否' }}</td>
                      <td>{{ row.subtract_free ? '是' : '否' }}</td>
                      <td>{{ row.subtract_mozhu ? '是' : '否' }}</td>
                      <td>{{ row.method }}</td>
                      <td>{{ fmtRate(row.free_rate_value, row.method) }}</td>
                      <td>{{ fmtRate(row.unfree_rate_value, row.method) }}</td>
                      <td>{{ fmtRate(row.rate_value, row.method) }}</td>
                      <td>{{ row.remark }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="policy-block">
              <div class="sub-title">阶梯规则</div>
              <div class="table-scroll-container">
                <table class="caliber-table">
                  <thead>
                    <tr>
                      <th>政策ID</th>
                      <th>规则类型</th>
                      <th>维度</th>
                      <th>基数</th>
                      <th>最小值</th>
                      <th>最大值</th>
                      <th>返佣方式</th>
                      <th>费率/单价</th>
                      <th>是否免佣</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in policyDetail.ladder_rows" :key="'lad-'+i">
                      <td class="org-name">{{ row.policy_id }}</td>
                      <td>{{ row.rule_type }}</td>
                      <td>{{ row.dimension }}</td>
                      <td>{{ row.metric }}</td>
                      <td>{{ fmt2(row.min_val) }}</td>
                      <td>{{ fmt2(row.max_val) }}</td>
                      <td>{{ row.method }}</td>
                      <td>{{ fmtRate(row.rule_value, row.method) }}</td>
                      <td>{{ row.subtract_free ? '是' : '否' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice & Mailing Maintenance -->
        <div class="caliber-section">
          <div class="section-title">发票信息与收件地址维护</div>
          <el-form label-width="110px" class="maintain-form">
            <el-form-item label="单位名称">
              <el-input v-model="statementData.invoiceUnitName" placeholder="单位名称" />
            </el-form-item>
            <el-form-item label="信用代码">
              <el-input v-model="statementData.creditCode" placeholder="统一社会信用代码" />
            </el-form-item>
            <el-form-item label="开票地址">
              <el-input v-model="statementData.invoiceAddress" placeholder="发票信息地址" />
            </el-form-item>
            <el-divider />
            <el-form-item label="收件地址">
              <el-input v-model="statementData.mailAddress" placeholder="发票收件地址" />
            </el-form-item>
            <el-form-item label="收件人">
              <el-input v-model="statementData.mailReceiver" placeholder="收件人" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="statementData.mailPhone" placeholder="收件人电话" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveInvoiceInfo">保存信息</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';
import request from '@/utils/request';

const filters = reactive({
  company: '',
  month: dayjs().subtract(1, 'month').format('YYYY-MM')
});

const companyOptions = ref([]);

const statementData = reactive({
  companyName: '',
  period: '2025-12-01至2025-12-31',
  amount: '4.73',
  invoiceUnitName: '',
  creditCode: '91510107MAC46XL84H',
  invoiceAddress: '四川省成都市武侯区二环路南四段69号2栋1层2号',
  mailAddress: '四川省成都市金牛区迎宾大道318号（信泰集团财务室）',
  mailReceiver: '刘磊',
  mailPhone: '18696916911',
  bankAccountName: '',
  bankAccountNumber: '',
  paymentInfo: '',
  shareBase: 0,
  baseRate: 0,
  baseAmount: 0,
  ladderAmount: 0,
  ladderRatio: 0,
  ladderMethod: '百分比',
  mozhuAmount: 0,
  driverRewardAmount: 0,
  amount: 0,
  baseRateDriverFree: 0,
  baseRateDriverUnfree: 0
});

watch(() => filters.company, (val) => {
  statementData.companyName = val;
  ElMessage.success(`已切换至: ${val}`);
  loadInvoiceInfo();
  loadBankInfo();
  loadDriverSummary();
  loadPolicyDetails();
  loadDriverFlow();
  loadDiscountSummary();
});

const loadCompanyOptions = async () => {
  if (!filters.month) return;
  try {
    const res = await request.post('/pt_fylist/company-policy/query', { month: filters.month }, { headers: { repeatSubmit: false } });
    const list = res.data?.list || [];
    const uniq = Array.from(new Set(list.map(r => r.company).filter(Boolean)));
    const sorted = uniq.sort((a, b) => String(a).localeCompare(String(b), 'zh-Hans-CN'));
    companyOptions.value = sorted.map(c => ({ label: c, value: c }));
    if (!companyOptions.value.find(o => o.value === filters.company)) {
      filters.company = companyOptions.value[0]?.value || '';
    }
  } catch (e) {
    companyOptions.value = [];
  }
};

watch(() => filters.month, async (val) => {
  if (val) {
    const start = dayjs(val).startOf('month').format('YYYY-MM-DD');
    const end = dayjs(val).endOf('month').format('YYYY-MM-DD');
    statementData.period = `${start}至${end}`;
    await loadCompanyOptions();
    if (filters.company) ElMessage.success(`已切换账期: ${val}`);
    if (filters.company) await loadInvoiceInfo();
    if (filters.company) await loadBankInfo();
    if (filters.company) await loadDriverSummary();
    if (filters.company) await loadPolicyDetails();
    if (filters.company) await loadDriverFlow();
    if (filters.company) await loadDiscountSummary();
  }
});

const driverData = reactive([
  {
    name: '汇总',
    unfree_qty: 0, free_qty: 0, total_qty: 0,
    unfree_trip_fee: 0, free_trip_fee: 0, total_trip_fee: 0,
    unfree_driver_trip_fee: 0, free_driver_trip_fee: 0, total_driver_trip_fee: 0
  }
]);

const clientData = reactive([
  {
    name: '汇总',
    unfree_qty: 0, free_qty: 0, total_qty: 0,
    unfree_trip_fee: 0, free_trip_fee: 0, total_trip_fee: 0
  }
]);

const driverRows = computed(() => [
  ...driverData,
  ...teamDetailData.map(r => ({
    name: r.name,
    unfree_qty: r.unfree_qty,
    free_qty: r.free_qty,
    total_qty: r.total_qty,
    unfree_driver_trip_fee: r.unfree_driver_trip_fee,
    free_driver_trip_fee: r.free_driver_trip_fee,
    total_driver_trip_fee: r.total_driver_trip_fee
  }))
]);
const clientRows = computed(() => [
  ...clientData,
  ...teamDetailData.map(r => ({
    name: r.name,
    unfree_qty: r.unfree_qty,
    free_qty: r.free_qty,
    total_qty: r.total_qty,
    unfree_trip_fee: r.unfree_trip_fee,
    free_trip_fee: r.free_trip_fee,
    total_trip_fee: r.total_trip_fee
  }))
]);
// 已移除司机流水静态示例，改为车队明细数据追加在上方两个表
const driverFlowRows = ref([]);
const discountRows = ref([]);

const policyDetail = reactive({ base_policy_id: '', ladder_policy_ids: [], base_rows: [], ladder_rows: [] });

const scale = ref(0.78);

const handlePrint = () => {
  const printContent = document.getElementById('statement-content');
  if (!printContent) return;

  // Record original position
  const originalParent = printContent.parentNode;
  const nextSibling = printContent.nextSibling;

  // Move to body to isolate from layout
  document.body.appendChild(printContent);
  document.body.classList.add('print-mode-active');

  // Define restore function
  const restore = () => {
    document.body.classList.remove('print-mode-active');
    if (nextSibling) {
      originalParent.insertBefore(printContent, nextSibling);
    } else {
      originalParent.appendChild(printContent);
    }
  };

  // Listen for afterprint event to restore DOM
  window.addEventListener('afterprint', restore, { once: true });

  // Trigger print
  window.print();
};

const handleDownloadPDF = async () => {
  const element = document.getElementById('statement-content');
  if (!element) return;

  try {
    const scaleContainer = document.querySelector('.statement-scale-container');
    const prevTransform = scaleContainer ? scaleContainer.style.transform : '';
    if (scaleContainer) scaleContainer.style.transform = 'scale(1)';

    const canvas = await html2canvas(element, {
      scale: Math.max(2, window.devicePixelRatio || 2),
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    if (scaleContainer) scaleContainer.style.transform = prevTransform;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = 0;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = heightLeft - imgHeight;
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const filename = `${statementData.companyName} ${statementData.period} 结算金额：${statementData.amount}.pdf`;
    pdf.save(filename);
    ElMessage.success('PDF 下载成功');
  } catch (error) {
    console.error('PDF generation error:', error);
    ElMessage.error('PDF 下载失败');
  }
};

loadCompanyOptions();
const loadDriverSummary = async () => {
  if (!filters.company || !filters.month) return;
  try {
    const pol = await request.post('/pt_fylist/company-policy/query', { month: filters.month }, { headers: { repeatSubmit: false } });
    const listPolicy = pol.data?.list || [];
    const rowPolicy = listPolicy.find(r => r.company === filters.company);
    const teams = rowPolicy ? (JSON.parse(rowPolicy.team || '[]')) : [];
    const companies = [filters.company, ...teams];
    const det = await request.post('/pt_fylist/settlement-detail', { month: filters.month, companies }, { headers: { repeatSubmit: false } });
    const dl = det.data?.list || [];
    teamDetailData.splice(0, teamDetailData.length, ...dl.map(r => ({
      name: r.company,
      unfree_qty: Number(r.unfree_qty || 0),
      free_qty: Number(r.free_qty || 0),
      total_qty: Number(r.total_qty || 0),
      unfree_trip_fee: Number(r.unfree_trip_fee || 0),
      free_trip_fee: Number(r.free_trip_fee || 0),
      total_trip_fee: Number(r.total_trip_fee || 0),
      unfree_driver_trip_fee: Number(r.unfree_driver_trip_fee || 0),
      free_driver_trip_fee: Number(r.free_driver_trip_fee || 0),
      total_driver_trip_fee: Number(r.total_driver_trip_fee || 0)
    })));
    const sum = teamDetailData.reduce((acc, r) => {
      acc.unfree_qty += r.unfree_qty; acc.free_qty += r.free_qty; acc.total_qty += r.total_qty;
      acc.unfree_trip_fee += r.unfree_trip_fee; acc.free_trip_fee += r.free_trip_fee; acc.total_trip_fee += r.total_trip_fee;
      acc.unfree_driver_trip_fee += r.unfree_driver_trip_fee; acc.free_driver_trip_fee += r.free_driver_trip_fee; acc.total_driver_trip_fee += r.total_driver_trip_fee;
      return acc;
    }, { unfree_qty:0, free_qty:0, total_qty:0, unfree_trip_fee:0, free_trip_fee:0, total_trip_fee:0, unfree_driver_trip_fee:0, free_driver_trip_fee:0, total_driver_trip_fee:0 });
    driverData.splice(0, driverData.length, {
      name: filters.company,
      unfree_qty: sum.unfree_qty, free_qty: sum.free_qty, total_qty: sum.total_qty,
      unfree_trip_fee: sum.unfree_trip_fee, free_trip_fee: sum.free_trip_fee, total_trip_fee: sum.total_trip_fee,
      unfree_driver_trip_fee: sum.unfree_driver_trip_fee, free_driver_trip_fee: sum.free_driver_trip_fee, total_driver_trip_fee: sum.total_driver_trip_fee
    });
    clientData.splice(0, clientData.length, {
      name: filters.company,
      unfree_qty: sum.unfree_qty, free_qty: sum.free_qty, total_qty: sum.total_qty,
      unfree_trip_fee: sum.unfree_trip_fee, free_trip_fee: sum.free_trip_fee, total_trip_fee: sum.total_trip_fee
    });
    clientUnfreeTripFeeTotal.value = Number(sum.unfree_trip_fee || 0);
    updateBaseVars();
  computeLadderBase();
  } catch (e) {
    // ignore
  }
};
const loadDriverFlow = async () => {
  if (!filters.company || !filters.month) return;
  try {
    const res = await request.post('/pt_fylist/driver-flow-summary', { company: filters.company, month: filters.month }, { headers: { repeatSubmit: false } });
    const rawList = res.data?.list || [];
    const currentMonth = dayjs(filters.month);
    
    driverFlowRows.value = rawList.map(item => {
      let cumulative = '-';
      if (item.activate_month) {
        const actMonth = dayjs(item.activate_month);
        if (actMonth.isValid()) {
          const diff = currentMonth.diff(actMonth, 'month');
          cumulative = diff >= 0 ? diff + 1 : 0;
        }
      }
      return {
        ...item,
        cumulative_months: cumulative
      };
    });

    statementData.driverRewardAmount = 0;
    updateTotalAmount();
  computeDriverIncentive();
  } catch {}
};
const loadDiscountSummary = async () => {
  if (!filters.company || !filters.month) return;
  try {
    const pol = await request.post('/pt_fylist/company-policy/query', { month: filters.month }, { headers: { repeatSubmit: false } });
    const list = pol.data?.list || [];
    const row = list.find(r => r.company === filters.company);
    const teams = row ? (JSON.parse(row.team || '[]')) : [];
    const res = await request.post('/pt_fylist/discount-summary', { month: filters.month, teams }, { headers: { repeatSubmit: false } });
    const rows = res.data?.list || [];
    const sum = rows.reduce((acc, r) => {
      acc.platform_bear += Number(r.platform_bear || 0);
      acc.gaode_bear += Number(r.gaode_bear || 0);
      return acc;
    }, { platform_bear: 0, gaode_bear: 0 });
    discountRows.value = [{ name: '汇总数据', platform_bear: sum.platform_bear, gaode_bear: sum.gaode_bear }, ...rows.map(r => ({ name: r.clean_team, platform_bear: r.platform_bear, gaode_bear: r.gaode_bear }))];
    clientDiscountPlatformTotal.value = Number(sum.platform_bear || 0);
    updateBaseVars();
  } catch {}
};
const loadPolicyDetails = async () => {
  try {
    const res = await request.post('/pt_fylist/policy-details/query', { company: filters.company, month: filters.month }, { headers: { repeatSubmit: false } });
    const d = res.data || {};
    policyDetail.base_policy_id = d.base_policy_id || '';
    policyDetail.ladder_policy_ids = d.ladder_policy_ids || [];
    policyDetail.base_rows = d.base_rows || [];
    policyDetail.ladder_rows = (d.ladder_rows || []).slice().sort((a, b) => {
      const c1 = String(a.policy_id).localeCompare(String(b.policy_id), 'zh-Hans-CN', { numeric: true });
      if (c1 !== 0) return c1;
      const av = Number(a.min_val ?? 0);
      const bv = Number(b.min_val ?? 0);
      return av - bv;
    });
    updateBaseVars();
  computeLadderBase();
  computeDriverIncentive();
  } catch {}
};
const monthDays = computed(() => {
  try {
    return dayjs(filters.month).daysInMonth();
  } catch {
    return 30;
  }
});
const driverFlowSummary = computed(() => {
  const days = monthDays.value || 1;
  const totals = (driverFlowRows.value || []).reduce((acc, r) => {
    acc.order_qty += Number(r.order_qty || 0);
    acc.order_income += Number(r.order_income || 0);
    if (r.activate_month === filters.month) {
      acc.activated_count += 1;
    }
    if ((r.activated_in_month === '是') && Number(r.order_qty || 0) > 1) {
      acc.activated_over1 += 1;
    }
    const cm = Number(r.cumulative_months);
    if (Number.isFinite(cm) && cm >= 1 && cm <= 3) {
      acc.first_three += 1;
    }
    return acc;
  }, { order_qty: 0, order_income: 0, activated_count: 0, activated_over1: 0, first_three: 0 });
  return {
    order_qty_total: totals.order_qty,
    order_income_total: totals.order_income,
    order_qty_avg: totals.order_qty / days,
    order_income_avg: totals.order_income / days,
    activated_count: totals.activated_count,
    activated_over1_count: totals.activated_over1,
    first_three_months_count: totals.first_three
  };
});
const fmtRate = (n, method) => {
  const num = Number(n || 0);
  if (method === '百分比') {
    const pct = (num * 100);
    return `${pct.toFixed(2)}%`;
  }
  return fmt2(num);
};
const baseMetricLabel = computed(() => (getDriverQtyDoubleRow() ? '分佣基数（单量）' : '分佣基数（元）'));
const baseRateLabel = computed(() => (getDriverQtyDoubleRow() ? '基础分佣比率（单价）' : '基础分佣比率（%）'));
const baseRateDisplay = computed(() => {
  if (getDriverQtyDoubleRow()) {
    return `${fmt2(statementData.baseRateDriverFree)}/${fmt2(statementData.baseRateDriverUnfree)}`;
  }
  return fmtRate(statementData.baseRate, '百分比');
});
const clientUnfreeTripFeeTotal = ref(0);
const clientDiscountPlatformTotal = ref(0);
const meetsBasicPolicy = () => {
  const rows = policyDetail.base_rows || [];
  return rows.some(r => r.port === '乘客' && r.base_metric === '金额' && (r.subtract_free ? true : false) && r.method === '百分比');
};
const getBaseRow = () => {
  const rows = policyDetail.base_rows || [];
  return rows.find(r => r.port === '乘客' && r.base_metric === '金额' && (r.subtract_free ? true : false) && r.method === '百分比');
};
const getDriverQtyDoubleRow = () => {
  const rows = policyDetail.base_rows || [];
  return rows.find(r => r.port === '司机' && r.base_metric === '单量' && (r.double_calc ? true : false) && r.method === '单价');
};
const updateTotalAmount = () => {
  statementData.amount = Number(statementData.baseAmount || 0) + Number(statementData.ladderAmount || 0) + Number(statementData.driverRewardAmount || 0);
};
const computeLadderBase = () => {
  const rows = (policyDetail.ladder_rows || []).filter(r => r.rule_type === '阶梯《基础》规则' && r.metric === '单量');
  if (!rows.length) {
    statementData.ladderRatio = 0;
    statementData.ladderMethod = '百分比';
    statementData.ladderAmount = 0;
    updateTotalAmount();
    return;
  }
  const getBaseVal = (dim) => {
    if (dim === '司机') return Number((driverData[0]?.total_qty) || 0);
    if (dim === '乘客') return Number((clientData[0]?.total_qty) || 0);
    return 0;
  };
  let matched = null;
  let baseVal = 0;
  for (const r of rows) {
    const val = getBaseVal(r.dimension);
    if (val === 0) continue;
    if (Number(val) >= Number(r.min_val ?? 0) && Number(val) < Number(r.max_val ?? Infinity)) {
      matched = r;
      baseVal = val;
      break;
    }
  }
  if (!matched) {
    statementData.ladderRatio = 0;
    statementData.ladderMethod = '百分比';
    statementData.ladderAmount = 0;
    updateTotalAmount();
    return;
  }
  statementData.ladderRatio = Number(matched.rule_value || 0);
  statementData.ladderMethod = matched.method || '百分比';
  if (statementData.ladderMethod === '百分比') {
    statementData.ladderAmount = baseVal * Number(matched.rule_value || 0);
  } else {
    statementData.ladderAmount = baseVal * Number(matched.rule_value || 0);
  }
  updateTotalAmount();
};
const computeDriverIncentive = () => {
  const rules = (policyDetail.ladder_rows || []).filter(r => r.rule_type === '阶梯《激励》规则' && r.dimension === '司机' && r.metric === '金额');
  if (!rules.length || !(driverFlowRows.value?.length)) {
    driverFlowRows.value = (driverFlowRows.value || []).map(it => ({ ...it, cashback: 0 }));
    statementData.driverRewardAmount = 0;
    updateTotalAmount();
    return;
  }
  let totalCashback = 0;
  driverFlowRows.value = (driverFlowRows.value || []).map(it => {
    const amt = Number(it.order_income || 0);
    const rule = rules.find(r => amt >= Number(r.min_val ?? 0) && amt < Number(r.max_val ?? Infinity));
    let cashback = 0;
    if (rule) {
      if (rule.method === '百分比') cashback = amt * Number(rule.rule_value || 0);
      else cashback = Number(rule.rule_value || 0);
    }
    totalCashback += cashback;
    return { ...it, cashback };
  });
  statementData.driverRewardAmount = totalCashback;
  updateTotalAmount();
};
const updateBaseVars = () => {
  const driverRow = getDriverQtyDoubleRow();
  if (driverRow) {
    const summary = driverData[0] || { unfree_qty: 0, free_qty: 0, total_qty: 0 };
    statementData.shareBase = Number(summary.total_qty || 0);
    statementData.baseRateDriverFree = Number(driverRow.free_rate_value || 0);
    statementData.baseRateDriverUnfree = Number(driverRow.unfree_rate_value || 0);
    // 基础分佣金额（元）= 不免佣单量 * 不免佣单价 + 免佣单量 * 免佣单价
    statementData.baseAmount =
      Number(summary.unfree_qty || 0) * Number(statementData.baseRateDriverUnfree || 0) +
      Number(summary.free_qty || 0) * Number(statementData.baseRateDriverFree || 0);
    // 双计算场景不参与墨竹扣减
    updateTotalAmount();
    return;
  }
  // 旧规则保持不变（乘客金额百分比）
  const row = getBaseRow();
  const valid = !!row;
  statementData.shareBase = valid ? clientUnfreeTripFeeTotal.value : 0;
  statementData.baseRate = valid ? Number(row?.rate_value || 0) : 0;
  statementData.mozhuAmount = valid && (row?.subtract_mozhu ? true : false) ? Number(clientDiscountPlatformTotal.value || 0) : 0;
  const adjustedBase = Number(statementData.shareBase || 0) - Number(statementData.mozhuAmount || 0);
  statementData.baseAmount = adjustedBase * Number(statementData.baseRate || 0);
  updateTotalAmount();
};

const teamDetailData = reactive([]);
const loadTeamDetails = async () => {
  try {
    const pol = await request.post('/pt_fylist/company-policy/query', { month: filters.month }, { headers: { repeatSubmit: false } });
    const list = pol.data?.list || [];
    const row = list.find(r => r.company === filters.company);
    const teams = row ? (JSON.parse(row.team || '[]')) : [];
    if (!teams || teams.length === 0) {
      teamDetailData.splice(0, teamDetailData.length);
      return;
    }
    const companies = [filters.company, ...teams];
    const det = await request.post('/pt_fylist/settlement-detail', { month: filters.month, companies }, { headers: { repeatSubmit: false } });
    const dl = det.data?.list || [];
    teamDetailData.splice(0, teamDetailData.length, ...dl.map(r => ({
      name: r.company,
      unfree_qty: Number(r.unfree_qty || 0),
      free_qty: Number(r.free_qty || 0),
      total_qty: Number(r.total_qty || 0),
      unfree_trip_fee: Number(r.unfree_trip_fee || 0),
      free_trip_fee: Number(r.free_trip_fee || 0),
      total_trip_fee: Number(r.total_trip_fee || 0),
      unfree_driver_trip_fee: Number(r.unfree_driver_trip_fee || 0),
      free_driver_trip_fee: Number(r.free_driver_trip_fee || 0),
      total_driver_trip_fee: Number(r.total_driver_trip_fee || 0)
    })));
    if (/[（(]-?/.test(filters.company) || filters.company.includes('-')) {
      const sum = teamDetailData.reduce((acc, r) => {
        acc.unfree_qty += r.unfree_qty; acc.free_qty += r.free_qty; acc.total_qty += r.total_qty;
        acc.unfree_trip_fee += r.unfree_trip_fee; acc.free_trip_fee += r.free_trip_fee; acc.total_trip_fee += r.total_trip_fee;
        acc.unfree_driver_trip_fee += r.unfree_driver_trip_fee; acc.free_driver_trip_fee += r.free_driver_trip_fee; acc.total_driver_trip_fee += r.total_driver_trip_fee;
        return acc;
      }, { unfree_qty:0, free_qty:0, total_qty:0, unfree_trip_fee:0, free_trip_fee:0, total_trip_fee:0, unfree_driver_trip_fee:0, free_driver_trip_fee:0, total_driver_trip_fee:0 });
      driverData.splice(0, 1, {
        name: filters.company,
        unfree_qty: sum.unfree_qty, free_qty: sum.free_qty, total_qty: sum.total_qty,
        unfree_trip_fee: sum.unfree_trip_fee, free_trip_fee: sum.free_trip_fee, total_trip_fee: sum.total_trip_fee,
        unfree_driver_trip_fee: sum.unfree_driver_trip_fee, free_driver_trip_fee: sum.free_driver_trip_fee, total_driver_trip_fee: sum.total_driver_trip_fee
      });
      clientData.splice(0, 1, {
        name: filters.company,
        unfree_qty: sum.unfree_qty, free_qty: sum.free_qty, total_qty: sum.total_qty,
        unfree_trip_fee: sum.unfree_trip_fee, free_trip_fee: sum.free_trip_fee, total_trip_fee: sum.total_trip_fee
      });
    }
  } catch {}
};
const fmt2 = (n) => {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '0.00';
  return num.toFixed(2);
};
const loadInvoiceInfo = async () => {
  if (!filters.company || !filters.month) return;
  try {
    const res = await request.post('/pt_fylist/invoice-info/query', { company: filters.company, month: filters.month }, { headers: { repeatSubmit: false } });
    const info = res.data;
    if (info) {
      statementData.invoiceUnitName = info.invoice_unit_name || filters.company;
      statementData.creditCode = info.credit_code || statementData.creditCode;
      statementData.invoiceAddress = info.invoice_address || statementData.invoiceAddress;
      statementData.mailAddress = info.mail_address || statementData.mailAddress;
      statementData.mailReceiver = info.mail_receiver || statementData.mailReceiver;
      statementData.mailPhone = info.mail_phone || statementData.mailPhone;
    }
  } catch {}
};
const saveInvoiceInfo = async () => {
  if (!filters.company || !filters.month) {
    ElMessage.warning('请选择公司与账期');
    return;
  }
  try {
    const res = await request.post('/pt_fylist/invoice-info/save', {
      company: filters.company,
      month: filters.month,
      invoice_unit_name: statementData.invoiceUnitName,
      credit_code: statementData.creditCode,
      invoice_address: statementData.invoiceAddress,
      mail_address: statementData.mailAddress,
      mail_receiver: statementData.mailReceiver,
      mail_phone: statementData.mailPhone
    }, { headers: { repeatSubmit: false } });
    if (res.code === 1 && res.data && res.data.success) {
      ElMessage.success('发票与收件信息已保存');
    } else {
      ElMessage.error(res.data?.msg || res.msg || '保存失败');
    }
  } catch (e) {
    ElMessage.error('保存失败');
  }
};
const loadBankInfo = async () => {
  if (!filters.company) return;
  try {
    const res = await request.post('/pt_fylist/company-bank/query', { month: filters.month, company: filters.company }, { headers: { repeatSubmit: false } });
    const row = res.data?.list?.[0];
    statementData.bankAccountName = row?.account_name || '';
    statementData.bankAccountNumber = row?.account_number || '';
    statementData.paymentInfo = row?.payment_info || '';
  } catch {}
};
</script>

<style scoped>
/* Page & Container Styles */
.page-container {
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  height: 100vh; /* Fill viewport */
  overflow: hidden; /* Prevent body scroll */
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden; /* Contain inner scrolling */
  width: 100%;
}

.statement-wrapper {
  flex: 1;
  background-color: #525659; /* PDF Viewer Dark Gray */
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 24px;
  position: relative;
}

/* Container for the scaled content */
.statement-scale-container {
  transform-origin: top center;
  transition: transform 0.3s ease;
  margin-bottom: 40px; /* Space for scrolling */
}

.toolbar {
  flex-shrink: 0;
  width: 100%;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #dcdfe6;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-sizing: border-box;
  z-index: 10;
}

.toolbar-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.filter-controls {
  display: flex;
  gap: 10px;
  margin-right: 20px;
  padding-right: 20px;
  border-right: 1px solid #dcdfe6;
}

.scale-controls {
  margin-right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
}

.statement-container {
  /* A4 Dimensions */
  width: 210mm;
  min-height: 297mm;
  padding: 15mm;
  background-color: #fff;
  font-family: 'SimSun', 'Songti SC', serif;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3); /* Stronger shadow for paper effect */
  box-sizing: border-box;
}

/* Right Side Panel Styles */
.caliber-panel {
  width: 980px; /* Expanded width for better readability */
  background-color: #fff;
  padding: 20px;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  z-index: 5;
}

.panel-header {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
}

.panel-header h3 {
  margin: 0;
  color: #333;
}

.caliber-section {
  margin-bottom: 30px;
}

.section-title {
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 18px;
  color: #1f2d3d;
  background-color: #EEF5FF;
  border-left: 6px solid #409EFF;
  padding: 8px 10px;
}

.summary-bar {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin: 6px 0 10px;
  letter-spacing: 0.2px;
}

.company-title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  background-color: #F5F7FA;
  padding: 6px 8px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.table-scroll-container {
  max-height: 250px; /* Specific height as requested */
  overflow-y: auto;
  border: 1px solid #EBEEF5;
}

.caliber-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  border: none; /* Border handled by container */
}

.caliber-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #F5F7FA;
  font-weight: bold;
  color: #303133;
  font-size: 13px;
  border: 1px solid #EBEEF5; /* Keep borders for cells */
  box-shadow: 0 1px 0 #EBEEF5; /* Fix bottom border visibility on sticky */
}

.caliber-table td {
  border: 1px solid #EBEEF5;
  padding: 8px;
  text-align: center;
  white-space: nowrap; /* Prevent text wrapping */
  font-size: 13px;
  font-family: 'PingFang SC','Microsoft YaHei','Helvetica Neue',Arial,sans-serif;
}

.rules-container {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #EBEEF5;
}

.rule-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.rule-item:last-child {
  margin-bottom: 0;
}

.rule-label {
  font-weight: bold;
  color: #606266;
  width: 100px;
  flex-shrink: 0;
}

.rule-value {
  color: #303133;
}

.policy-tables {
  margin-top: 10px;
}
.policy-block {
  margin-top: 12px;
}
.sub-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2d3d;
  background-color: #EEF5FF;
  padding: 6px 8px;
  border-left: 4px solid #409EFF;
  border-radius: 2px;
  margin-bottom: 8px;
}

.org-name {
  font-weight: bold;
  background-color: #FAFAFA;
}

.row-label {
  color: #606266;
}

.total-col {
  font-weight: bold;
  color: #F56C6C;
  background-color: #FEF0F0;
}
.caliber-table tr.highlight-green td {
  background-color: #E8F5E9;
}
.avg-qty-strong {
  color: #2E7D32;
  font-weight: 700;
}

/* Print Specific Styles */
@media print {
  @page {
    size: A4;
    margin: 0; /* Let the container handle margins */
  }

  body {
    margin: 0;
    padding: 0;
    overflow: visible !important;
  }

  body * {
    visibility: hidden;
  }

  /* Only show the statement container */
  .statement-container, .statement-container * {
    visibility: visible;
  }

  .statement-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    min-height: 100%;
    margin: 0;
    padding: 15mm; /* Ensure padding remains on print */
    box-shadow: none;
    visibility: visible;
    background-color: #fff !important;
    z-index: 9999;
  }

  .no-print {
    display: none !important;
  }
  
  /* Ensure background colors print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}

.statement-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #000;
  font-size: 12px; /* Slightly smaller base font for A4 fit */
}

.statement-table td {
  border: 1px solid #000;
  padding: 6px 8px; /* Tighter padding */
  line-height: 1.4;
}

.header-bg {
  background-color: #FCE4D6;
  text-align: center;
  font-weight: normal;
  padding: 10px;
  font-size: 16px;
}

.title-row {
  text-align: center;
  font-weight: bold;
  font-size: 22px;
  padding: 15px 0;
  border-bottom: 1px solid #000;
}

.intro-text {
  text-align: left;
  text-indent: 2em;
  padding: 15px;
  line-height: 1.8;
  font-size: 13px;
}

.label-cell {
  font-weight: bold;
  width: 100px; /* Reduced width */
  text-align: center;
  background-color: #f8f9fa;
}

.value-cell-center {
  text-align: center;
  font-weight: bold;
  font-size: 14px;
}

.col-header {
  text-align: center;
  padding: 10px 4px;
  font-weight: bold;
  background-color: #E2EFDA;
  font-size: 12px;
  color: #333;
}

.data-cell {
  text-align: center;
  padding: 10px 4px;
  font-size: 13px;
}

.bold {
  font-weight: bold;
}

.red-text {
  color: #d9001b;
}

.label-cell-vertical {
  width: 40px;
  text-align: center;
  vertical-align: middle;
  font-weight: bold;
  background-color: #f8f9fa;
  padding: 10px;
  line-height: 1.2;
}

.content-cell-left {
  text-align: left;
  vertical-align: middle;
  padding: 12px 20px;
}

.info-row {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
}
.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  display: inline-block;
  text-align: right;
  font-weight: normal;
  width: 110px;
  flex-shrink: 0;
  color: #666;
}

.label-cell-center {
  text-align: center;
  vertical-align: middle;
  height: 50px;
  font-weight: bold;
  background-color: #f8f9fa;
}

.signature-area {
  text-align: center;
  vertical-align: middle;
  position: relative;
  height: 150px;
}

.signature-text {
  color: #d9001b;
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 2px;
}
</style>

<style>
/* Global print styles for DOM isolation method */
@media print {
  body.print-mode-active {
    margin: 0;
    padding: 0;
    overflow: visible !important;
  }

  /* Hide all direct children of body */
  body.print-mode-active > * {
    display: none !important;
  }

  /* Only show the moved statement container */
  body.print-mode-active > .statement-container {
    display: block !important;
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    visibility: visible !important;
  }
  
  /* Ensure children are visible */
  body.print-mode-active > .statement-container * {
    visibility: visible !important;
  }
}
</style>
