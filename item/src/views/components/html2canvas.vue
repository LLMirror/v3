<template>
  <div class="app-container">
    <div class="box" v-loading="loading" ref="allRef">
      <div >
        <div class="share-h5" ref="shareH5Ref">
          <img crossorigin="anonymous" src="@/assets/images/share_h5.png" alt="手机分享">
          <div class="user">
            <img crossorigin="anonymous" :src="avatar" alt="头像">
            <div>{{ name }}</div>
          </div>
          <img crossorigin="anonymous" class="code-img" :src="codeImg" alt="二维码">
        </div>
        <el-button class="btn" type="success" @click="shareH5Start">生成分享图</el-button>
      </div>
      <div>
        <div class="share-pc" ref="sharePcRef">
          <img crossorigin="anonymous" src="@/assets/images/share_pc.png" alt="">
          <div class="user">
            <img crossorigin="anonymous" :src="avatar" alt="头像">
            <div>{{ name }}</div>
          </div>
          <img crossorigin="anonymous" class="code-img" :src="codeImg" alt="二维码">
        </div>
        <el-button class="btn" type="primary" @click="sharePcStart">生成分享图</el-button>
      </div>
    </div>
    <div class="name">
      <el-input
          v-model="name"
          style="max-width: 500px"
          placeholder="请输入名称！"
          maxlength="10"
      >
        <template #prepend>动态合成名称</template>
      </el-input>
      <div><el-button class="btn" type="danger" @click="startAll">两张一起合成！</el-button></div>
    </div>
  </div>
</template>

<script name="Html2canvas" setup>
import useUserStore from '@/store/modules/user.js';
//https://html2canvas.hertzen.com/
import html2canvas from 'html2canvas';
//https://npm.io/package/qrcode
import QRCode from 'qrcode';

const { proxy } = getCurrentInstance();
  const userState=useUserStore()
  const name=ref(userState.name);
  const avatar=ref(proxy.fileHost+userState.avatar);
  const codeImg=ref("");
  const shareH5Ref=ref(null);
  const sharePcRef=ref(null);
  const allRef=ref(null);
  const loading=ref(false);
  //h5图片合成
  async function shareH5Start(){
    loading.value=true;
    try {
      const res=await html2canvas(shareH5Ref.value, {
        //允许图片跨域
        useCORS: true,
        taintTest: false,
        logging: true,
        //背景颜色
        backgroundColor: "#fff",
      });
      const imgRes = res.toDataURL('image/png');
      downloadImg(imgRes)
    }finally {
      loading.value=false;
    }
  }
  //PC图片合成
  async function sharePcStart(){
    loading.value=true;
    try {
      const res=await html2canvas(sharePcRef.value, {
        //允许图片跨域
        useCORS: true,
        taintTest: false,
        logging: true,
        //背景颜色
        backgroundColor: "#fff",
      });
      const imgRes = res.toDataURL('image/png');
      downloadImg(imgRes)
    }finally {
      loading.value=false;
    }
  }
  async function startAll(){
    loading.value=true;
    try {
      const res=await html2canvas(allRef.value, {
        //允许图片跨域
        useCORS: true,
        taintTest: false,
        logging: true,
        //背景颜色
        backgroundColor: "#fff",
      });
      const imgRes = res.toDataURL('image/png');
      downloadImg(imgRes)
    }finally {
      loading.value=false;
    }
  }
  //下载图片
  function downloadImg(base64Url){
    const link = document.createElement('a');
    // 为 a 标签设置 href 属性，并将其转换为 base64 数据
    link.download=new Date().getTime()+'.png'
    link.href = base64Url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    proxy.$modal.msgSuccess("下载成功，请查看浏览器下载内容获取图片！");
  }
  onMounted(async ()=>{
    codeImg.value=await QRCode.toDataURL('https://qm.qq.com/q/JDnjavOL0u', {errorCorrectionLevel: 'H', margin: 2});
  });
</script>

<style scoped lang="scss">
  .box{
    display: flex;
    justify-content: space-between;
    width: 1000px;
    margin: 10px auto;
    border: 2px solid #dedede;
    padding: 20px;
    border-radius: 10px;
    .share-h5{
      width: 250px;
      height: 444px;
      position: relative;
      img{
        width: 100%;
        height: 100%;
      }
      .user{
        position: absolute;
        top: 90px;
        right: 0px;
        text-align: center;
        max-width: 100px;
        width: 80px;
        img{
          width: 30px;
          height: 30px;
          object-fit: cover;
          border-radius: 50%;
          border: 1.5px solid #fff;
          box-shadow: 0 0 8px #666;
        }
        div{
          font-size: 12px;
          font-weight: 700;
          color: #f36c16;
          transform: scale(0.8);
          word-wrap: break-word;
        }
      }
      .code-img{
        width: 50px;
        height: 50px;
        position: absolute;
        bottom: 30px;
        left: 24px;
      }
    }
    .share-pc{
      width: 640px;
      height: 360px;
      position: relative;
      img{
        width: 100%;
        height: 100%;
      }
      .user{
        position: absolute;
        top: 25px;
        left: 245px;
        text-align: center;
        max-width: 100px;
        width: 100px;
        img{
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 50%;
          border: 1.5px solid #fff;
          box-shadow: 0 0 8px #666;
        }
        div{
          font-size: 12px;
          font-weight: 700;
          color: #f36c16;
          transform: scale(0.8);
          word-wrap: break-word;
        }
      }
      .code-img{
        width: 60px;
        height: 60px;
        position: absolute;
        bottom: 28px;
        left: 42px;
      }
    }
    .btn{
      width: 100%;
      margin-top: 10px;
    }
  }

  .name{
    text-align: center;
    .btn{
      width: 500px;
      margin-top: 20px;
    }
  }
</style>
