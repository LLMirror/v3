<template>
  <section class="app-main" id="app-main">
    <router-view v-slot="{ Component, route }">
      <transition name="fade-transform" mode="out-in">
        <keep-alive :include="tagsViewStore.cachedViews">
          <component v-if="!route.meta.link" :is="Component" :key="route.path"/>
        </keep-alive>
      </transition>
    </router-view>
    <iframe-toggle />
  </section>
</template>

<script setup>
import useTagsViewStore from '@/store/modules/tagsView'

const tagsViewStore = useTagsViewStore()
</script>

<style lang="scss" scoped>
.app-main {
  height: calc(100vh - 50px);
  width: 100%;
  position: relative;
  //overflow: hidden;
}

.fixed-header + .app-main {
  padding-top: 50px;
}

//固定 Header
.fixedHeader{
  .app-main{
    height: calc(100vh);
  }
}

//开启 Tags-Views
.hasTagsView {
  .app-main {
    height: calc(100vh - 50px - 35px);
  }
  //固定 Header
  .fixed-header + .app-main {
    padding-top: 84px;
    height: calc(100vh);
  }
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 6px;
  }
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background-color: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background-color: #c0c0c0;
  border-radius: 3px;
}
</style>

