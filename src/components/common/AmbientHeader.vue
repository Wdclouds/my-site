<template>
  <header class="ambient-header" :class="{ 'header-hidden': isHidden, transparent: isTransparent, 'blog-gradient': isBlogGradient }">
    <div class="header-container">
      <!-- 左：FEagle logo（白天黑版 / 夜间白版） -->
      <RouterLink to="/" class="brand-logo" aria-label="回到主页">
        <img :src="logoSrc" alt="FEagle" class="logo-img" />
      </RouterLink>

      <!-- 中：主站导航（纯文字） -->
      <nav class="nav-links">
        <RouterLink
          v-for="link in links"
          :key="link.path"
          :to="link.path"
          class="nav-link"
          :class="{ active: isActive(link.path) }"
        >{{ link.label }}</RouterLink>
      </nav>

      <!-- 右：昼夜切换小按钮（只有博客页保留白天黑夜） -->
      <button
        v-if="canToggleTheme"
        class="theme-toggle"
        :aria-label="blogState.theme === 'dark' ? '切换到亮色' : '切换到暗色'"
        :title="blogState.theme === 'dark' ? '切换到亮色' : '切换到暗色'"
        @click="toggleThemeAnimated"
      >
        <span class="theme-icon">{{ blogState.theme === 'dark' ? '🌙' : '☀️' }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { blogState, toggleTheme } from '../../stores/blogState'

// ===== 主站导航：主页 / 博客 / 音乐 / 实验室 =====
const links = [
  { label: '主页', path: '/' },
  { label: '博客', path: '/blog' },
  { label: '音乐', path: '/music' },
  { label: '实验室', path: '/lab' },
]
const route = useRoute()
const isActive = p => (p === '/' ? route.path === '/' : route.path.startsWith(p))
// 只有博客页保留白天黑夜切换
const canToggleTheme = computed(() => route.path.startsWith('/blog'))

// 音乐页沉浸式：导航栏完全透明，不套毛玻璃
const isTransparent = computed(() => route.path.startsWith('/music'))

// 博客页：导航栏用渐变背景（顶部页面底色 → 向下渐隐），呼应首图底部渐变
const isBlogGradient = computed(() => route.path.startsWith('/blog'))

// ===== 昼夜 logo：按内容颜色选用（public 文件名与颜色相反——
// feaglew.svg 是黑色路径，feagleb.svg 是白色路径）=====
const logoSrc = computed(() => (blogState.theme === 'dark' ? '/feagleb.svg' : '/feaglew.svg'))

// ===== 滚动感知：智能隐藏 / 回弹（项目全局 overflow:hidden，滚动在各页内部容器，
// scroll 事件不冒泡 → document 捕获阶段抓任意滚动元素，同 useNavHide/BackToTop 机制）=====
const isHidden = ref(false)
// 顶部静止区 = 导航栏自身高度：滚动距离没超过导航栏时始终显示，
// 超出后向下滚动才隐藏、向上滚动呼出
const navH = () => (typeof window !== 'undefined' && window.innerWidth <= 767 ? 56 : 64)
const TOP_REST = navH()
const THRESHOLD = 10   // 方向灵敏度：向上/向下超过 10px 才响应
let lastY = 0

const onScroll = e => {
  const el = e.target === document ? document.scrollingElement : e.target
  if (!el || typeof el.scrollTop !== 'number') return
  const y = el.scrollTop
  if (y <= TOP_REST) {
    isHidden.value = false
    lastY = y
    return
  }
  if (y > lastY + THRESHOLD) isHidden.value = true        // 向下阅读 → 让出空间
  else if (y < lastY - THRESHOLD) isHidden.value = false  // 向上回滚 → 呼出
  lastY = y
}

// ===== 昼夜切换（复用 store 的 toggleTheme，带 :root 平滑过渡）=====
let animTimer = null
function toggleThemeAnimated() {
  document.documentElement.classList.add('theme-anim')
  toggleTheme()
  clearTimeout(animTimer)
  animTimer = setTimeout(() => document.documentElement.classList.remove('theme-anim'), 450)
}

onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }))
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll, { capture: true })
  clearTimeout(animTimer)
})
</script>

<style scoped>
/* 无框流：纯透明、无边框、无毛玻璃 */
.ambient-header {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  height: 64px;
  /* 亚克力模糊半透明：跟随主题色调（浅色白 / 深色深），内容滚过时透出毛玻璃。
     不透明度由 --nav-frost-alpha 控制（浅色主题更透） */
  background: color-mix(in srgb, var(--bg-card) var(--nav-frost-alpha, 68%), transparent);
  -webkit-backdrop-filter: blur(16px) saturate(1.5);
  backdrop-filter: blur(16px) saturate(1.5);
  border-bottom: 1px solid var(--border-color);
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform;
}
.ambient-header.header-hidden {
  transform: translateY(-100%);
}

/* 沉浸式页面（音乐页）：导航栏完全透明 */
.ambient-header.transparent {
  background: transparent;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-bottom: none;
}

/* 博客页：渐变导航（顶部=页面底色，向下渐隐到透明） */
.ambient-header.blog-gradient {
  background: linear-gradient(to bottom, var(--bg-primary) 0%, transparent 100%);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border-bottom: none;
}

.header-container {
  position: relative;
  max-width: 1152px; /* 对应 max-w-6xl */
  margin: 0 auto;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6, 24px); /* 对应 px-6 */
}

/* 左：logo */
.brand-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
}
.logo-img {
  display: block;
  height: 30px;
  width: auto;
  opacity: 0.92;
  transition: opacity 0.2s ease;
}
.brand-logo:hover .logo-img { opacity: 1; }

/* 中：纯文字导航（绝对居中于容器） */
.nav-links {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-6, 24px);
}
.nav-link {
  text-decoration: none;
  font-size: 0.95rem;
  color: var(--text-secondary);
  padding: 4px 2px;
  transition: color 0.2s ease;
}
.nav-link:hover { color: var(--text-primary); }
.nav-link.active { color: var(--text-primary); font-weight: 600; }

/* 右：昼夜切换小按钮 */
.theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 6px);
  color: var(--text-secondary);
  transition: color 0.2s ease, background-color 0.2s ease;
}
.theme-toggle:hover {
  color: var(--text-primary);
  background-color: color-mix(in srgb, var(--text-primary) 6%, transparent);
}
.theme-icon {
  display: inline-block;
  font-size: 1.1rem;
  line-height: 1;
  transition: transform 0.2s ease;
}
.theme-toggle:hover .theme-icon { transform: scale(1.15) rotate(8deg); }

/* 移动端：高度/内边距收敛，元素全部保留，只收紧间距 */
@media (max-width: 767px) {
  .ambient-header { height: 56px; }
  .header-container { padding: 0 var(--space-4, 16px); } /* 对应 px-4 */
  .logo-img { height: 24px; }
  .nav-links { gap: var(--space-4, 16px); }
  .nav-link { font-size: 0.9rem; }
  .theme-toggle { width: 32px; height: 32px; }
}
</style>
