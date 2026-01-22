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
          <span>缩放: {{ Math.round(scale * 100) }}%</span>
          <el-button-group>
            <el-button size="small" @click="scale = Math.max(0.5, scale - 0.1)">-</el-button>
            <el-button size="small" @click="scale = Math.min(1.5, scale + 0.1)">+</el-button>
          </el-button-group>
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
              <td colspan="9" class="header-bg">四川畅行九州运力科技有限公司</td>
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
              <td class="col-header">分佣基数（元）</td>
              <td class="col-header">基础分佣比率（%）</td>
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
              <td class="data-cell">94.60</td>
              <td class="data-cell">5.00%</td>
              <td class="data-cell">4.73</td>
              <td class="data-cell">-</td>
              <td class="data-cell">0.00</td>
              <td class="data-cell">0.00</td>
              <td class="data-cell">0.00</td>
              <td class="data-cell red-text bold">{{ statementData.amount }}</td>
            </tr>
            
            <!-- Invoice Information -->
            <tr>
              <td class="label-cell-vertical">发票信息：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">单位名称：</span>{{ statementData.companyName }}</div>
                <div class="info-row"><span class="info-label">信用代码：</span>91510107MAC46XL84H</div>
                <div class="info-row"><span class="info-label">地址：</span>四川省成都市武侯区二环路南四段69号2栋1层2号</div>
              </td>
            </tr>
            
            <!-- Bank Information -->
            <tr>
              <td class="label-cell-vertical">银行信息：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">银行账户名称：</span>四川畅行九州运力科技有限公司</div>
                <div class="info-row"><span class="info-label">银行收款账号：</span>8000 4000 0000 2038 65</div>
                <div class="info-row"><span class="info-label">支付信息：</span>四川银行股份有限公司</div>
              </td>
            </tr>
            
            <!-- Mailing Address -->
            <tr>
              <td class="label-cell-vertical">发票收件地址：</td>
              <td colspan="8" class="content-cell-left">
                <div class="info-row"><span class="info-label">收件地址：</span>四川省成都市金牛区迎宾大道318号（信泰集团财务室）</div>
                <div class="info-row"><span class="info-label">收件人：</span>刘磊</div>
                <div class="info-row"><span class="info-label">收件人电话：</span>18696916911</div>
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
        <div class="panel-header">
          <h3>口径数据参考</h3>
        </div>
        
        <!-- Driver Side Table -->
        <div class="caliber-section">
          <div class="section-title">司机端数据</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th></th>
                  <th>分类</th>
                  <th>SP活动免佣</th>
                  <th>不免佣</th>
                  <th>减佣卡减佣</th>
                  <th>免佣卡</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(item, index) in driverData" :key="'driver-'+index">
                  <tr>
                    <td rowspan="2" class="org-name">{{ item.name }}</td>
                    <td class="row-label">数量</td>
                    <td>{{ item.spQty }}</td>
                    <td>{{ item.normalQty }}</td>
                    <td>{{ item.reducedQty }}</td>
                    <td>{{ item.freeQty }}</td>
                    <td class="total-col">{{ item.totalQty }}</td>
                  </tr>
                  <tr>
                    <td class="row-label">金额</td>
                    <td>{{ item.spAmt }}</td>
                    <td>{{ item.normalAmt }}</td>
                    <td>{{ item.reducedAmt }}</td>
                    <td>{{ item.freeAmt }}</td>
                    <td class="total-col">{{ item.totalAmt }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Client Side Table -->
        <div class="caliber-section">
          <div class="section-title">客户端数据</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th></th>
                  <th>分类</th>
                  <th>SP活动免佣</th>
                  <th>不免佣</th>
                  <th>减佣卡减佣</th>
                  <th>免佣卡</th>
                  <th>合计</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(item, index) in clientData" :key="'client-'+index">
                  <tr>
                    <td rowspan="2" class="org-name">{{ item.name }}</td>
                    <td class="row-label">数量</td>
                    <td>{{ item.spQty }}</td>
                    <td>{{ item.normalQty }}</td>
                    <td>{{ item.reducedQty }}</td>
                    <td>{{ item.freeQty }}</td>
                    <td class="total-col">{{ item.totalQty }}</td>
                  </tr>
                  <tr>
                    <td class="row-label">金额</td>
                    <td>{{ item.spAmt }}</td>
                    <td>{{ item.normalAmt }}</td>
                    <td>{{ item.reducedAmt }}</td>
                    <td>{{ item.freeAmt }}</td>
                    <td class="total-col">{{ item.totalAmt }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Driver Transaction Flow Table -->
        <div class="caliber-section">
          <div class="section-title">司机流水详情</div>
          <div class="table-scroll-container">
            <table class="caliber-table">
              <thead>
                <tr>
                  <th>司机</th>
                  <th>订单量</th>
                  <th>流水收入</th>
                  <th>奖励收入</th>
                  <th>总收入</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in driverTransactionData" :key="'trans-'+index">
                  <td>{{ item.name }}</td>
                  <td>{{ item.orderQty }}</td>
                  <td>{{ item.flowIncome }}</td>
                  <td>{{ item.rewardIncome }}</td>
                  <td class="total-col">{{ item.totalIncome }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Business Rules -->
        <div class="caliber-section">
          <div class="section-title">商务规则</div>
          <div class="rules-container">
            <div v-for="(rule, index) in businessRules" :key="'rule-'+index" class="rule-item">
              <span class="rule-label">{{ rule.label }}：</span>
              <span class="rule-value">{{ rule.value }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import dayjs from 'dayjs';

const filters = reactive({
  company: '四川沛途快行科技有限公司',
  month: '2025-12'
});

const companyOptions = [
  { label: '四川沛途快行科技有限公司', value: '四川沛途快行科技有限公司' },
  { label: '成都通行安科技有限公司', value: '成都通行安科技有限公司' },
  { label: '四川畅行九州运力科技有限公司', value: '四川畅行九州运力科技有限公司' }
];

const statementData = reactive({
  companyName: '四川沛途快行科技有限公司',
  period: '2025-12-01至2025-12-31',
  amount: '4.73'
});

watch(() => filters.company, (val) => {
  statementData.companyName = val;
  ElMessage.success(`已切换至: ${val}`);
});

watch(() => filters.month, (val) => {
  if (val) {
    const start = dayjs(val).startOf('month').format('YYYY-MM-DD');
    const end = dayjs(val).endOf('month').format('YYYY-MM-DD');
    statementData.period = `${start}至${end}`;
    ElMessage.success(`已切换账期: ${val}`);
  }
});

const driverData = reactive([
  {
    name: '不分车队司机端',
    spQty: 0, normalQty: 159, reducedQty: 45, freeQty: 0, totalQty: 204,
    spAmt: 0, normalAmt: 3267.81, reducedAmt: 997.27, freeAmt: 0, totalAmt: 4265.08
  },
  {
    name: '成都通行安科技有限公司（粒粒车队）',
    spQty: 0, normalQty: 76, reducedQty: 13, freeQty: 0, totalQty: 89,
    spAmt: 0, normalAmt: 1592.89, reducedAmt: 275.24, freeAmt: 0, totalAmt: 1868.13
  },
  {
    name: '成都通行安科技有限公司（罗罗车队）',
    spQty: 0, normalQty: 83, reducedQty: 32, freeQty: 0, totalQty: 115,
    spAmt: 0, normalAmt: 1674.92, reducedAmt: 722.03, freeAmt: 0, totalAmt: 2396.95
  }
]);

const clientData = reactive([
  {
    name: '不分车队客户端',
    spQty: 0, normalQty: 150, reducedQty: 40, freeQty: 0, totalQty: 190,
    spAmt: 0, normalAmt: 3100.00, reducedAmt: 900.00, freeAmt: 0, totalAmt: 4000.00
  },
  {
    name: '成都通行安科技有限公司（粒粒车队）',
    spQty: 0, normalQty: 70, reducedQty: 10, freeQty: 0, totalQty: 80,
    spAmt: 0, normalAmt: 1500.00, reducedAmt: 250.00, freeAmt: 0, totalAmt: 1750.00
  }
]);

const driverTransactionData = reactive([
  {
    name: '张三',
    orderQty: 100,
    flowIncome: '2000.00',
    rewardIncome: '100.00',
    totalIncome: '2100.00'
  },
  {
    name: '李四',
    orderQty: 150,
    flowIncome: '3000.00',
    rewardIncome: '200.00',
    totalIncome: '3200.00'
  },
  {
    name: '王五',
    orderQty: 80,
    flowIncome: '1600.00',
    rewardIncome: '50.00',
    totalIncome: '1650.00'
  },
  {
    name: '赵六',
    orderQty: 120,
    flowIncome: '2400.00',
    rewardIncome: '120.00',
    totalIncome: '2520.00'
  },
  {
    name: '孙七',
    orderQty: 90,
    flowIncome: '1800.00',
    rewardIncome: '80.00',
    totalIncome: '1880.00'
  }
]);

const businessRules = reactive([
  { label: '基础分佣比率', value: '5.00%' },
  { label: '阶梯奖励', value: '无' },
  { label: '司机奖励策略', value: '月单量>100单，每单奖励1元' },
  { label: '特殊说明', value: '以上数据基于2025-12月账期统计' }
]);

const scale = ref(0.7);

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
    const canvas = await html2canvas(element, {
      scale: 2, // Improve resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // A4 dimensions in mm
    const pdfWidth = 210;
    const pdfHeight = 297;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Calculate image dimensions to fit A4 width
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // Construct filename: Company + Period + 结算金额： + Amount
    const filename = `${statementData.companyName} ${statementData.period} 结算金额：${statementData.amount}.pdf`;
    pdf.save(filename);
    
    ElMessage.success('PDF 下载成功');
  } catch (error) {
    console.error('PDF generation error:', error);
    ElMessage.error('PDF 下载失败');
  }
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
  padding: 40px;
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
  width: 650px; /* Increased width to prevent wrapping */
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
  font-weight: bold;
  margin-bottom: 10px;
  font-size: 16px;
  color: #409EFF;
  border-left: 4px solid #409EFF;
  padding-left: 10px;
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
  color: #606266;
  border: 1px solid #EBEEF5; /* Keep borders for cells */
  box-shadow: 0 1px 0 #EBEEF5; /* Fix bottom border visibility on sticky */
}

.caliber-table td {
  border: 1px solid #EBEEF5;
  padding: 8px;
  text-align: center;
  white-space: nowrap; /* Prevent text wrapping */
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
