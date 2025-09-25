<template>
  <video controls :style="videoStyle">
    <source :src="url" type="video/mp4" />
    <source :src="url" type="video/webm" />
    <source :src="url" type="video/ogg" />
    <source :src="url" type="video/AVI" />
    <source :src="url" type="video/FLV" />
    <source :src="url" type="video/MOV" />
    <source :src="url" type="video/wmv" />
    <source :src="url" type="video/mkv" />
  </video>
</template>

<script setup>
defineProps({
  url:String,
  videoStyle: {
    type: String,
    default: 'width:100%;height:100%;'
  }
})
</script>

<style scoped>

</style>
