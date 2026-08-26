// 全局 UI 共享状态：顶部悬浮导航的显隐（博客滚动时自动隐藏）
import { reactive } from 'vue'

export const uiState = reactive({
  navHidden: false,
  scrollEl: null, // 实际发生滚动的元素（document 捕获监听抓到）
})

export function setNavHidden(v) { uiState.navHidden = !!v }