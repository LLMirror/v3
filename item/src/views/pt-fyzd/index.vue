<template>
  <div class="page-container">
    <!-- Toolbar (Hidden when printing) -->
    <div class="toolbar no-print">
      <el-button type="primary" @click="handlePrint">打印</el-button>
      <el-button type="success" @click="handleDownloadPDF">下载 PDF</el-button>
    </div>

    <!-- Printable Area -->
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
</template>

<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const statementData = reactive({
  companyName: '四川沛途快行科技有限公司',
  period: '2025-12-01至2025-12-31',
  amount: '4.73'
});

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
  align-items: center;
  background-color: #f0f2f5; /* Light gray background for the viewing area */
  min-height: 100vh;
  padding: 20px;
}

.toolbar {
  margin-bottom: 20px;
  width: 210mm; /* Match A4 width for alignment */
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.statement-container {
  /* A4 Dimensions */
  width: 210mm;
  min-height: 297mm;
  padding: 15mm; /* Print margins */
  background-color: #fff;
  font-family: 'SimSun', 'Songti SC', serif;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); /* Drop shadow for paper effect */
  box-sizing: border-box;
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
