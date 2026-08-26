// 滚动容器导航显隐：下滑即隐藏、上滑显示
// 关键：scroll 事件不冒泡，但用 document 捕获阶段能抓到任意元素的滚动 —— 不依赖具体滚动容器
import { onMounted, onBeforeUnmount } from 'vue'
import { setNavHidden, uiState } from '../stores/uiState'

export function useNavHide(threshold = 4) {
  let lastY = 0
  const onScroll = e => {
    const el = e.target === document ? document.scrollingElement : e.target
    if (!el || typeof el.scrollTop !== 'number') return
    uiState.scrollEl = el
    const y = el.scrollTop
    const d = y - lastY
    if (d > threshold) setNavHidden(true)
    else if (d < -threshold) setNavHidden(false)
    lastY = y
  }
  onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }))
  onBeforeUnmount(() => document.removeEventListener('scroll', onScroll, { capture: true }))
}