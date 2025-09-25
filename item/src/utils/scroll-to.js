Math.easeInOutQuad = function(t, b, c, d) {
  t /= d / 2
  if (t < 1) {
    return c / 2 * t * t + b
  }
  t--
  return -c / 2 * (t * (t - 2) - 1) + b
}

// requestAnimationFrame for Smart Animating http://goo.gl/sx5sts
var requestAnimFrame = (function() {
  return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) { window.setTimeout(callback, 1000 / 60) }
})()

/**
 * Because it's so fucking difficult to detect the scrolling element, just move them all
 * @param {number} amount
 */
function move(amount) {
  document.documentElement.scrollTop = amount
  document.body.parentNode.scrollTop = amount
  document.body.scrollTop = amount
}

function position() {
  return document.documentElement.scrollTop || document.body.parentNode.scrollTop || document.body.scrollTop
}

/**
 * @param {number} to
 * @param {number} duration
 * @param {Function} callback
 */
export function scrollTo(to, duration, callback) {
  const start = position()
  const change = to - start
  const increment = 20
  let currentTime = 0
  duration = (typeof (duration) === 'undefined') ? 500 : duration
  var animateScroll = function() {
    // increment the time
    currentTime += increment
    // find the value with the quadratic in-out easing function
    var val = Math.easeInOutQuad(currentTime, start, change, duration)
    // move the document.body
    move(val)
    // do the animation unless its over
    if (currentTime < duration) {
      requestAnimFrame(animateScroll)
    } else {
      if (callback && typeof (callback) === 'function') {
        // the animation is done so lets callback
        callback()
      }
    }
  }
  animateScroll()
}

/**
 * 设置表格溢出滚动距离
 * @param {number} scrollTop 设置滚动距离
 * @param {string} tableClassName 如果页面出现多个表格需要用class区分，为空默认只有一个表格
 * 如：<table class="my-scroll"> 
 *   <pagination tableClassName="my-scroll">
 *     两个传入相同参数即可指定
* */
export function setScrollTop(scrollTop=0,tableClassName='') {
  try {
    let scrollDom;
    if(tableClassName){
      scrollDom=document.querySelector(`.${tableClassName}`).querySelector('.el-table__body-wrapper').querySelector('.el-scrollbar__wrap');
    }else{
      scrollDom=document.querySelector('.el-table__body-wrapper').querySelector('.el-scrollbar__wrap');
    }
    scrollDom.scrollTop=scrollTop;
  }catch (e) {
    console.error('表格滚动错误',e)
  }
  
}