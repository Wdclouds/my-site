<template>
  <div ref="scrollEl" class="blog-post">
    <BackToTop :target="scrollEl" />
    <Suspense>
      <template #default>
        <DesktopPost v-if="isDesktop" :slug="slug" />
        <MobilePost v-else :slug="slug" />
      </template>
      <template #fallback>
        <div class="p-fallback">Loading Matrix...</div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { useDevice } from '../../composables/useDevice'
import { useNavHide } from '../../composables/useNavHide'
import BackToTop from './shared/BackToTop.vue'

const scrollEl = ref(null)
useNavHide()

const route = useRoute()
const slug = computed(() => route.params.slug)
const { isDesktop } = useDevice(768)

const DesktopPost = defineAsyncComponent(() => import('./desktop/DesktopPost.vue'))
const MobilePost = defineAsyncComponent(() => import('./mobile/MobilePost.vue'))
</script>

<style scoped>
/* 博客详情也自己当滚动容器（全局 main 是 overflow:hidden） */
.blog-post { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.p-fallback { min-height: 100vh; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-family: monospace; letter-spacing: 3px; font-size: 12px; }
</style>
