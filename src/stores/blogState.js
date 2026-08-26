// 博客共享状态（reactive 单例，不引 Pinia）—— MVP 用 Mock 数据，后续接 SQLite API
import { reactive, computed } from 'vue'

// ===== 分类常量（一级领域 / 二级标签）=====
export const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'psychology', label: '🧠 心理与随想' },
  { id: 'engineering', label: '💻 代码与工程' },
]

export const ENGINEERING_TAGS = ['Vue', 'WebGL', 'Tools']

// ===== Mock 数据（6 篇）=====
const mockPosts = [
  { id: 1, title: '从零搭建 Three.js 车舱场景', excerpt: '25MB Draco 模型、89MB HDR、三块 CanvasTexture 屏幕的实战记录与踩坑。', date: '2026-08-18', category: 'engineering', tag: 'WebGL', isFeatured: true },
  { id: 2, title: 'Vue 3 KeepAlive 与 Transition 的嵌套陷阱', excerpt: 'out-in 模式下 leave-to 样式残留在缓存实例上，切回来内容消失——以及正确写法。', date: '2026-08-12', category: 'engineering', tag: 'Vue', isFeatured: true },
  { id: 3, title: '把 Notion 当 CMS 的实践', excerpt: '写作面不变，还是你天天用的 Notion。写完点一下发布，网站就有了。', date: '2026-07-30', category: 'engineering', tag: 'Tools', isFeatured: false },
  { id: 4, title: '为什么人总是拖延', excerpt: '拖延不是懒，是情绪调节的问题。聊聊背后的心理机制。', date: '2026-08-20', category: 'psychology', tag: '随想', isFeatured: true },
  { id: 5, title: '深夜写作的意义', excerpt: '白天的噪声退去之后，剩下来的才是自己真正想说的。', date: '2026-06-15', category: 'psychology', tag: '随笔', isFeatured: false },
  { id: 6, title: 'WebGL 性能优化清单', excerpt: '矩阵冻结、Raycaster 收窄、DPR 控制、上下文休眠——让 3D 页面跑满 60fps。', date: '2026-05-28', category: 'engineering', tag: 'WebGL', isFeatured: false },
]

export const blogState = reactive({
  theme: 'light', // 'light' | 'dark'
  currentCategory: 'all',
  currentSubTag: 'all', // engineering 下的二级标签
  posts: mockPosts,
})

// ===== 主题 ======
export function applyTheme(t) {
  blogState.theme = t
  const root = document.documentElement
  root.classList.toggle('light', t === 'light')
  root.classList.toggle('dark', t === 'dark')
  try { localStorage.setItem('blog-theme', t) } catch {}
}

export function toggleTheme() {
  applyTheme(blogState.theme === 'light' ? 'dark' : 'light')
}

// ===== 分类切换（切一级时重置二级）=====
export function setCategory(cat) {
  blogState.currentCategory = cat
  blogState.currentSubTag = 'all'
}

export function setSubTag(tag) {
  blogState.currentSubTag = tag
}

// ===== Getters ======
export const filteredPosts = computed(() => {
  const { currentCategory: cat, currentSubTag: tag, posts } = blogState
  return posts.filter(p => {
    if (cat !== 'all' && p.category !== cat) return false
    if (cat === 'engineering' && tag !== 'all' && p.tag !== tag) return false
    return true
  })
})

export const featuredPosts = computed(() => filteredPosts.value.filter(p => p.isFeatured).slice(0, 2))

// 归档分组：按 YYYY-MM 倒序
export const archivedGroups = computed(() => {
  const groups = {}
  for (const p of filteredPosts.value) {
    const ym = p.date.slice(0, 7)
    ;(groups[ym] ||= []).push(p)
  }
  return Object.entries(groups)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([ym, list]) => ({ ym, list }))
})

// ===== 初始化 ======
export function initBlog() {
  const saved = (() => { try { return localStorage.getItem('blog-theme') } catch { return null } })()
  applyTheme(saved === 'dark' ? 'dark' : 'light')
}