<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterView } from 'vue-router'
import ReactBridge from './components/ReactBridge.vue'
import { CardNav } from './react'
import { uiState } from './stores/uiState'

const router = useRouter()

// 主题检测：跟随系统明暗（白天用 feaglew，黑天用 feagleb）
const isDark = ref(
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
)

let mediaQuery = null
onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = e => {
    isDark.value = e.matches
  }
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handler)
  }
  onBeforeUnmount(() => {
    if (mediaQuery.removeEventListener) {
      mediaQuery.removeEventListener('change', handler)
    }
  })
})

// 导航卡片：label + 背景色 + 子链接
// 菜单保留 博客/音乐/实验室 三张卡片；主页由点击 logo 跳转；登录只走右侧按钮
const cardNavItems = [
  {
    label: '博客',
    bgColor: '#2F293A',
    textColor: '#fff',
    links: [{ label: '博客', href: '/blog', ariaLabel: '访问博客' }]
  },
  {
    label: '音乐',
    bgColor: '#1B1722',
    textColor: '#fff',
    links: [{ label: '音乐', href: '/music', ariaLabel: '进入音乐区' }]
  },
  {
    label: '实验室',
    bgColor: '#2F293A',
    textColor: '#fff',
    links: [{ label: '实验室', href: '/lab', ariaLabel: '进入实验室' }]
  }
]

// 路由跳转（Vue Router，不刷新页面）
const navigate = path => {
  router.push(path)
}

// 根据主题切换 logo 和配色
const cardNavProps = ref({})

function updateNavProps() {
  cardNavProps.value = {
    logo: isDark.value ? '/feagleb.svg' : '/feaglew.svg',
    logoAlt: 'Feagle Logo',
    items: cardNavItems,
    baseColor: isDark.value ? '#1a1a1a' : '#ffffff',
    menuColor: isDark.value ? '#ffffff' : '#000000',
    buttonBgColor: '#111',
    buttonTextColor: '#fff',
    ease: 'power3.out',
    theme: isDark.value ? 'dark' : 'light',
    onNavigate: navigate
  }
}

updateNavProps()

// 主题变化时更新导航 props
watch(isDark, updateNavProps)
</script>

<template>
  <!-- 顶部悬浮导航：下滑自动隐藏、上滑显示（uiState.navHidden 由博客滚动容器驱动） -->
  <div class="nav-holder" :class="{ 'nav-hidden': uiState.navHidden }">
    <ReactBridge :component="CardNav" :component-props="cardNavProps" class="card-nav-bridge" />
  </div>

  <main>
    <RouterView />
  </main>
</template>

<style>
/* 悬浮导航不占文档流，main 占满全屏 */
main {
  height: 100vh;
}

/* 顶部导航显隐：固定定位 + 上滑显示/下滑隐藏的位移过渡 */
/* 注意：holder 自身高度为 0（CardNav 是 fixed 脱离文档流），translateY 用百分比会乘 0 → 必须用固定像素 */
.nav-holder {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  transition: transform 0.35s ease;
}
.nav-hidden {
  transform: translateY(-120px);
}
</style>
