<template>
  <div class="app-container">
    <el-text size="large" type="primary" class="title">el 默 认 图 标</el-text>
    <div class="list">
      <div class="item" >
        <el-icon color="#f00" size="30px"><Plus /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Minus /></el-icon>
      </div>
      <div class="item" >
        <el-icon><CirclePlus /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Search /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Female /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Male /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Aim /></el-icon>
      </div>
      <div class="item" >
        <el-icon><House /></el-icon>
      </div>
      <div class="item" >
        <el-icon><FullScreen /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Loading /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Link /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Service /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Pointer /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Star /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Notification /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Connection /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatDotRound /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Setting /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Clock /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Position /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Discount /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Odometer /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatSquare /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatRound /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatLineRound /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatLineSquare /></el-icon>
      </div>
      <div class="item" >
        <el-icon><ChatDotSquare /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Hide /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Unlock /></el-icon>
      </div>
      <div class="item" >
        <el-icon><Lock /></el-icon>
      </div>
      <div class="item" >
        <el-icon><RefreshRight /></el-icon>
      </div>
      <div class="item" >
        <el-icon><RefreshLeft /></el-icon>
      </div>
    </div>
    <div  class="link" ><el-link style="font-size: 18px" type="danger" href="https://element-plus.org/zh-CN/component/icon.html" target="_blank">点击获取：el图标使用方法和更多图标选择!!!</el-link></div>
    <hr>
    <el-text size="large" type="primary" class="title">svg 自 定 义 图 标</el-text>
    <div class="list">
      <div class="item" >
        <svg-icon icon-class="404" color="#f00" size="30px"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="bug"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="build"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="button"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="cascader"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="chart"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="checkbox"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="clipboard"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="code"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="color"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="component"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="dashboard"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="date"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="date-range"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="dict"></svg-icon>
      </div>
      <div class="item" >
        <svg-icon icon-class="documentation"></svg-icon>
      </div>
    </div>
    <div class="list"><el-text size="large" type="warning" >svg图标 的icon-class参数对应文件中src/assets/icons/svg（文件名称）</el-text></div>
    <div  class="link" ><el-link style="font-size: 18px" type="danger" href="https://www.iconfont.cn/?spm=a313x.home_index.i3.d4d0a486a.11e83a81ntTJ9n" target="_blank">点击下载：svg自定义图标，请下载到 src/assets/icons/svg</el-link></div>
  </div>
</template>

<script name="Icons" setup>

</script>

<style scoped lang="scss">
  .title{
    text-align: center;
    display: block;
    margin: 20px 0;
    font-weight: 700;
  }
  .list{
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    width: 1000px;
    margin: 0 auto;
    .item{
      width: 120px;
      height: 80px;
      border: 1px solid #dedede;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  .link{
    text-align: center;
    margin-top: 20px;
  }
</style>