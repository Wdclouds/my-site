<script setup>
import { onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { applyTheme, initBlog, blogState } from './stores/blogState'
import AmbientHeader from './components/common/AmbientHeader.vue'

const route = useRoute()

// 全站深色场景：主页（装修中）/ 音乐页（沉浸暗色）→ 固定夜间模式；
// 其余页面（主要是博客）恢复 localStorage 里的用户偏好。
// 强制夜间只切视觉、不写 localStorage，避免覆盖博客的白天/黑夜偏好。
function syncThemeToRoute() {
  const p = route.path
  const forcedDark = p === '/' || p.startsWith('/music') || p.startsWith('/lab')
  if (forcedDark) {
    blogState.theme = 'dark'
    document.documentElement.classList.toggle('light', false)
    document.documentElement.classList.toggle('dark', true)
  } else {
    const saved = (() => { try { return localStorage.getItem('blog-theme') } catch { return null } })()
    applyTheme(saved === 'dark' ? 'dark' : 'light')
  }
}

onMounted(() => {
  initBlog() // 恢复偏好后再按当前路由校正（首屏为 / 或 /music 时强制夜间）
  syncThemeToRoute()
})
watch(() => route.path, syncThemeToRoute)
</script>

<template>
  <!-- 无框流顶部导航：全站常驻 -->
  <AmbientHeader />
  <main>
    <RouterView />
  </main>
</template>

<style>
/* main 占满全屏 */
main {
  height: 100vh;
}
</style>
