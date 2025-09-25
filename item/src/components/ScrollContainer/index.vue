<template>
  <div
    ref="scrollContainer"
    class="scroll-container"
    @scroll="handleScroll"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  bottomThreshold: {
    type: Number,
    default: 50
  },
  topThreshold: {
    type: Number,
    default: 50
  }
})

const emit = defineEmits(['scroll', 'scrollBottom', 'scrollTop'])

const scrollContainer = ref(null)
const lastScrollTop = ref(0) // 记录上一次滚动位置
const isScrollingDown = ref(false) // 当前是否在向下滚动
const isBottom=ref(true);
const isTop=ref(true);


const handleScroll = (e) => {
  const { scrollTop, scrollHeight, clientHeight } = e.target
  
  // 判断滚动方向
  isScrollingDown.value = scrollTop > lastScrollTop.value
  lastScrollTop.value = scrollTop
  
  // 触发普通滚动事件
  emit('scroll', {
    scrollTop,
    scrollHeight,
    clientHeight,
    direction: isScrollingDown.value ? 'down' : 'up'
  })
  
  // 检查是否触底（只有向下滚动时才检查）
  if (isBottom.value&&isScrollingDown.value &&
    scrollHeight - (scrollTop + clientHeight) <= props.bottomThreshold) {
    setIsBottom(false)
    emit('scrollBottom',()=>{
      setIsBottom(true)
    })
  }
  
  // 检查是否触顶（只有向上滚动时才检查）
  if (isTop.value&&!isScrollingDown.value && scrollTop <= props.topThreshold) {
    setIsTop(false)
    emit('scrollTop',()=>{
      setIsTop(true)
    })
  }
}

//滚动到顶部
const setScrollTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

//滚动到底部
const setScrollBottom = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

// 滚动到指定位置
const setScrollKm = (px) => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = px
  }
}

// 滚动到指定子元素
const setScrollItem = (index) => {
  if (scrollContainer.value && scrollContainer.value.children.length > index) {
    const child = scrollContainer.value.children[index]
    scrollContainer.value.scrollTop = child.offsetTop
  }
}

// 设置是否可底部加载
const setIsBottom=(val)=>{
  isBottom.value=val
}

// 设置是否可顶部加载
const setIsTop=(val)=>{
  isTop.value=val
}



defineExpose({
  setScrollTop,
  setScrollBottom,
  setScrollKm,
  setScrollItem,
  setIsBottom,
  setIsTop
})

onMounted(() => {
  if (scrollContainer.value) {
    // 初始化记录初始位置
    lastScrollTop.value = scrollContainer.value.scrollTop
  }
})
</script>

<style scoped>
.scroll-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /*scroll-behavior: smooth;*/
}
</style>