<template>
  <div ref="scrollEl" class="blog-home">
    <BackToTop :target="scrollEl" />
    <Suspense>
      <template #default>
        <DesktopHome v-if="isDesktop" />
        <MobileHome v-else />
      </template>
      <template #fallback>
        <div class="blog-fallback">Loading Matrix...</div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue'
import { useDevice } from '../../composables/useDevice'
import { useNavHide } from '../../composables/useNavHide'
import BackToTop from './shared/BackToTop.vue'

const scrollEl = ref(null)
useNavHide()

const { isDesktop } = useDevice(768)

// 桌面/移动按树拆分：React 特效只在桌面树（移动端首屏零 React）
const DesktopHome = defineAsyncComponent(() => import('./desktop/DesktopHome.vue'))
const MobileHome = defineAsyncComponent(() => import('./mobile/MobileHome.vue'))
</script>

<style scoped>
/* 全局 main 是 overflow:hidden（音乐页全屏布局），博客页自己当滚动容器 */
.blog-home { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.blog-fallback { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-family: monospace; letter-spacing: 3px; font-size: 12px; }
</style>
