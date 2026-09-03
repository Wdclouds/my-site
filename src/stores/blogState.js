// 博客共享状态（reactive 单例，不引 Pinia）—— 真实接入 SQLite API
import { reactive, computed } from 'vue'

export const CATEGORIES = [
  { id: 'all', label: '全部' },
  { id: 'engineering', label: '💻 代码与工程' },
  { id: 'architecture', label: '🏛️ 架构与设计' },
  { id: 'thoughts', label: '🧠 认知与思考' },
]

export const blogState = reactive({
  theme: 'light', // 'light' | 'dark'
  currentCategory: 'all',
  currentTag: 'all',
  posts: [],
  categories: [],
  wikiTopics: [
    {
      id: 1,
      slug: 'threejs-journey',
      title: 'Three.js 3D 全景与交互开发实战',
      description: '从 WebGL 基础到车舱 3D 全景模型渲染、CanvasTexture 交互与着色器实战体系化梳理。',
      category: 'engineering',
      article_count: 2
    },
    {
      id: 2,
      slug: 'cognitive-psychology',
      title: '认知心理学与行为设计手册',
      description: '围绕注意机制、多巴胺回路与心智模型，建立一套可执行的日常精力与习惯管理系统。',
      category: 'thoughts',
      article_count: 2
    },
    {
      id: 3,
      slug: 'architecture-mindset',
      title: '复杂系统架构与设计模式典籍',
      description: '从解耦思维、单向数据流到全栈同构设计的工程心法与架构演进沉淀。',
      category: 'architecture',
      article_count: 3
    }
  ],
  isLoading: false,
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

// ===== 分类与标签切换 =====
export function setCategory(cat) {
  blogState.currentCategory = cat
  blogState.currentTag = 'all'
}

export function setTag(tag) {
  blogState.currentTag = tag
}

// ===== 真实 API 请求 =====
export async function loadPosts() {
  blogState.isLoading = true
  try {
    const res = await fetch('/api/posts?limit=50')
    if (res.ok) {
      const data = await res.json()
      blogState.posts = data.items || []
    }
  } catch (err) {
    console.warn('[blogState] 加载真实文章列表失败，保持为空:', err)
  } finally {
    blogState.isLoading = false
  }
}

export async function loadCategories() {
  try {
    const res = await fetch('/api/posts/categories')
    if (res.ok) {
      const data = await res.json()
      blogState.categories = data.categories || []
    }
  } catch (err) {}
}

export async function loadWikiTopics() {
  try {
    const res = await fetch('/api/wiki/topics')
    if (res.ok) {
      const data = await res.json()
      if (data.topics && data.topics.length > 0) {
        blogState.wikiTopics = data.topics
      }
    }
  } catch (err) {}
}

// ===== Getters ======
export const filteredPosts = computed(() => {
  const { currentCategory: cat, currentTag: tag, posts } = blogState
  return posts.filter(p => {
    if (cat !== 'all' && p.category !== cat) return false
    if (tag !== 'all' && !(p.tags && p.tags.includes(tag))) return false
    return true
  })
})

export const featuredPosts = computed(() => filteredPosts.value.filter(p => p.is_featured || p.isFeatured).slice(0, 2))

// 归档分组：按 YYYY-MM 倒序
export const archivedGroups = computed(() => {
  const groups = {}
  for (const p of filteredPosts.value) {
    if (!p.date) continue
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
  loadPosts()
  loadCategories()
  loadWikiTopics()
}
