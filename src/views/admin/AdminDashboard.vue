<template>
  <div class="admin-page">
    <div class="ambient-glow"></div>

    <!-- 1. 未登录：古希腊古典石碑登录卡 -->
    <div v-if="!authState.isLoggedIn" class="login-wrapper">
      <div class="login-card">
        <div class="stele-header">
          <span class="stele-badge">🏛️ TEMPLE GATE · 神庙关口</span>
          <h2>管理员铭刻准入</h2>
          <p class="subtitle">请输入雅典娜神庙守护者凭证</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>守护者账号 (Citizen ID)</label>
            <input
              v-model="loginForm.username"
              type="text"
              placeholder="请输入管理员账号"
              required
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label>神谕密码 (Passphrase)</label>
            <input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入管理员密码"
              required
              autocomplete="current-password"
            />
          </div>

          <div v-if="loginError" class="error-banner">
            ⚠️ {{ loginError }}
          </div>

          <button type="submit" class="btn-primary" :disabled="authState.state.isLoading">
            {{ authState.state.isLoading ? '正在验证神谕...' : '推开神庙之门 ➔' }}
          </button>
        </form>

        <div class="login-footer">
          <router-link to="/blog" class="back-link">◄ 返回公开数字花园</router-link>
        </div>
      </div>
    </div>

    <!-- 2. 已登录：雅典娜神庙 · 铭文圣所 (去模块化 · 古典极简长卷) -->
    <div v-else class="console-wrapper">
      <!-- 圣所顶部典雅仪式区 -->
      <header class="sanctum-hero">
        <div class="sanctum-crest">
          <span class="stele-glyph">🏛️</span>
          <span class="sanctum-sub">ATHENA SANCTUM · 铭文法典台</span>
        </div>
        <h1 class="sanctum-title">雅典娜的智慧之卷</h1>
        <p class="sanctum-motto">“于石碑之上镌刻思绪，于岁月之中见证真理。”</p>

        <!-- 极简轻量指标行 (无生硬盒子 · 纯粹流式信息) -->
        <div class="sanctum-meta-strip">
          <span class="meta-leaf">📜 <strong>{{ posts.length }}</strong> 篇铭文</span>
          <span class="meta-dot">·</span>
          <span class="meta-leaf">★ <strong>{{ featuredCount }}</strong> 篇置顶</span>
          <span class="meta-dot">·</span>
          <span class="meta-leaf">🏛️ <strong>{{ uniqueCategories.length }}</strong> 大领域</span>
          <span class="meta-dot">·</span>
          <span class="meta-leaf user-leaf">守护者: <strong>{{ authState.user?.username }}</strong></span>
        </div>

        <div class="sanctum-actions">
          <button @click="openCreateModal" class="btn-sanctum-primary">+ 镌刻新铭文</button>
          <router-link to="/blog" class="btn-sanctum-ghost">浏览公开神庙 ➔</router-link>
          <button @click="handleLogout" class="btn-sanctum-text">退出圣所</button>
        </div>
      </header>

      <!-- 铭文石刻长卷流 (去表格化 · 古典杂志排版) -->
      <div class="stele-stream-container">
        <div class="stream-head">
          <span>📜 存世铭文编年录</span>
          <span class="stream-count">共 {{ posts.length }} 卷</span>
        </div>

        <div v-if="isLoadingList" class="stream-loading">
          正在自神庙深处调取铭文碑记...
        </div>

        <div v-else-if="posts.length === 0" class="stream-empty">
          神庙碑座尚无铭文，点击上方「+ 镌刻新铭文」开启第一卷智慧。
        </div>

        <div v-else class="stream-list">
          <div
            v-for="p in posts"
            :key="p.id"
            class="stream-item"
          >
            <!-- 左侧：古典日期与置顶徽章 -->
            <div class="item-time-col">
              <span class="item-date">{{ p.date }}</span>
              <span v-if="p.isFeatured" class="featured-star" title="神庙精选置顶">★ 精选</span>
            </div>

            <!-- 中间：铭文核心信息 -->
            <div class="item-body-col">
              <div class="item-title-row">
                <span class="item-title" @click="openEditModal(p)">{{ p.title }}</span>
                <span class="item-cat-tag">{{ p.category || 'dev' }}</span>
              </div>
              <div class="item-slug-row">
                <span class="item-slug">/blog/posts/{{ p.slug }}</span>
                <div v-if="p.tags && p.tags.length" class="item-tags-wrap">
                  <span v-for="t in p.tags" :key="t" class="item-tag-pill">#{{ t }}</span>
                </div>
              </div>
            </div>

            <!-- 右侧：悬浮隐现极简操作 -->
            <div class="item-action-col">
              <button @click="openEditModal(p)" class="btn-item-edit" title="修葺铭文">
                <span>✎ 编辑</span>
              </button>
              <button @click="confirmDelete(p)" class="btn-item-del" title="自石碑抹除">
                <span>✕ 抹除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 新建 / 编辑文章沉浸式模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card immersive-card">
        <form @submit.prevent="savePost" class="immersive-form">
          <!-- 顶部极简操作栏 -->
          <div class="immersive-header">
            <div class="header-left-tag">
              <span class="stele-glyph">🏛️</span>
              <span class="stele-mode">{{ isEditing ? '编辑铭文' : '撰写新铭文' }}</span>
            </div>
            <div class="header-actions">
              <label class="tag-checkbox-pill">
                <input v-model="editorForm.isFeatured" type="checkbox" />
                <span>★ 精选置顶</span>
              </label>
              <button type="button" @click="closeModal" class="btn-secondary-sm">取消</button>
              <button type="submit" class="btn-primary-sm" :disabled="isSaving">
                {{ isSaving ? '保存中...' : (isEditing ? '保存修改' : '立即发布') }}
              </button>
            </div>
          </div>

          <!-- 极简大标题输入 -->
          <div class="title-wrap">
            <input
              v-model="editorForm.title"
              type="text"
              required
              class="immersive-title-input"
              placeholder="在此镌刻文章标题..."
            />
          </div>

          <!-- 交互式单行胶囊元数据栏 (对齐整洁 · 分区明确 · 不折行错位) -->
          <div class="capsule-meta-bar">
            <!-- 左侧：分类选择胶囊 -->
            <div class="capsule-section cat-sec">
              <span class="capsule-label">📁 分类</span>
              <div class="cat-pill-group">
                <button
                  v-for="cat in commonCategories"
                  :key="cat.key"
                  type="button"
                  class="cat-chip-btn"
                  :class="{ active: editorForm.category === cat.key }"
                  @click="editorForm.category = cat.key"
                >
                  {{ cat.label }}
                </button>
                <input
                  v-model="editorForm.category"
                  type="text"
                  placeholder="自定..."
                  class="cat-custom-input"
                />
              </div>
            </div>

            <div class="capsule-divider"></div>

            <!-- 中间：路径 Slug 与 发布日期 -->
            <div class="capsule-section meta-slug-date">
              <div class="capsule-item">
                <span class="capsule-label">🔗</span>
                <input v-model="editorForm.slug" type="text" required placeholder="url-slug" class="capsule-input slug-input" />
              </div>
              <div class="capsule-item">
                <span class="capsule-label">📅</span>
                <input v-model="editorForm.date" type="date" required class="capsule-input date-input" />
              </div>
            </div>

            <div class="capsule-divider"></div>

            <!-- 右侧：动态 Tag Chip 胶囊输入盒 (自动填充剩余空间) -->
            <div class="capsule-section tags-sec">
              <span class="capsule-label">🏷️</span>
              <div class="tags-chip-container">
                <span
                  v-for="(t, i) in tagsList"
                  :key="i"
                  class="tag-pill-badge"
                >
                  {{ t }}
                  <button type="button" class="tag-del-btn" @click.stop="removeTag(i)">×</button>
                </span>
                <input
                  v-model="tagInputVal"
                  type="text"
                  placeholder="+标签(回车)"
                  class="tag-live-input"
                  @keydown="handleTagKeydown"
                  @blur="addTag"
                />
              </div>
            </div>
          </div>

          <!-- 极简单行摘要 -->
          <div class="excerpt-wrap">
            <input
              v-model="editorForm.excerpt"
              type="text"
              class="immersive-excerpt-input"
              placeholder="📝 摘要（选填，展示在列表卡片上）..."
            />
          </div>

          <!-- 巨大化 Markdown 正文编辑区 (占据屏幕绝对主体) -->
          <div class="body-editor-wrap">
            <textarea
              v-model="editorForm.content"
              class="immersive-textarea"
              placeholder="在此撰写正文 Markdown 内容... (支持标题、列表、代码块、引用等)"
            ></textarea>
          </div>

          <div v-if="saveError" class="error-banner">
            ⚠️ {{ saveError }}
          </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { authState } from '../../stores/authState.js'
import { adminApi } from '../../api/admin.js'
import { blogState } from '../../stores/blogState.js'

// 登录表单
const loginForm = reactive({ username: '', password: '' })
const loginError = ref('')

async function handleLogin() {
  loginError.value = ''
  try {
    await authState.login(loginForm.username, loginForm.password)
    await loadPosts()
  } catch (err) {
    loginError.value = err.message
  }
}

function handleLogout() {
  authState.logout()
}

// 管理列表
const posts = ref([])
const isLoadingList = ref(false)

const featuredCount = computed(() => posts.value.filter(p => p.isFeatured).length)
const uniqueCategories = computed(() => [...new Set(posts.value.map(p => p.category).filter(Boolean))])

async function loadPosts() {
  if (!authState.isLoggedIn) return
  isLoadingList.value = true
  try {
    const res = await adminApi.getPosts()
    posts.value = res.items || []
  } catch (err) {
    console.error('拉取文章列表失败:', err)
  } finally {
    isLoadingList.value = false
  }
}

// 新建 / 编辑弹窗
const showModal = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const saveError = ref('')
const currentEditSlug = ref('')

const commonCategories = [
  { key: 'dev', label: '💻 编程工程' },
  { key: 'mind', label: '🧠 认知心理' },
  { key: 'thoughts', label: '💡 沉思杂谈' },
  { key: 'history', label: '🏛️ 古典史诗' }
]

const tagInputVal = ref('')
const tagsList = ref([])

function addTag() {
  const val = tagInputVal.value.trim().replace(/^,+|,+$/g, '')
  if (val && !tagsList.value.includes(val)) {
    tagsList.value.push(val)
  }
  tagInputVal.value = ''
}

function removeTag(index) {
  tagsList.value.splice(index, 1)
}

function handleTagKeydown(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  } else if (e.key === 'Backspace' && !tagInputVal.value && tagsList.value.length > 0) {
    tagsList.value.pop()
  }
}

const editorForm = reactive({
  title: '',
  slug: '',
  category: 'dev',
  date: new Date().toISOString().slice(0, 10),
  tagsInput: '',
  excerpt: '',
  content: '',
  isFeatured: false
})

function openCreateModal() {
  isEditing.value = false
  saveError.value = ''
  currentEditSlug.value = ''
  tagInputVal.value = ''
  tagsList.value = []
  Object.assign(editorForm, {
    title: '',
    slug: '',
    category: 'dev',
    date: new Date().toISOString().slice(0, 10),
    tagsInput: '',
    excerpt: '',
    content: '',
    isFeatured: false
  })
  showModal.value = true
}

async function openEditModal(post) {
  isEditing.value = true
  saveError.value = ''
  currentEditSlug.value = post.slug
  tagInputVal.value = ''
  tagsList.value = Array.isArray(post.tags) ? [...post.tags] : (post.tags ? String(post.tags).split(/[,，]/).map(s => s.trim()).filter(Boolean) : [])
  showModal.value = true

  // 先用列表简要信息填表
  Object.assign(editorForm, {
    title: post.title,
    slug: post.slug,
    category: post.category || 'dev',
    date: post.date,
    tagsInput: '',
    excerpt: post.excerpt || '',
    content: '',
    isFeatured: Boolean(post.is_featured || post.isFeatured)
  })

  // 异步获取完整正文
  try {
    const full = await adminApi.getPostDetail(post.slug)
    editorForm.content = full.content || ''
    if (Array.isArray(full.tags) && full.tags.length > 0) {
      tagsList.value = [...full.tags]
    }
  } catch (err) {
    console.error('拉取正文失败:', err)
  }
}

function closeModal() {
  showModal.value = false
}

async function savePost() {
  saveError.value = ''
  isSaving.value = true

  // 如果输入框还有没按回车的标签，自动收纳
  if (tagInputVal.value.trim()) {
    addTag()
  }

  const payload = {
    title: editorForm.title,
    slug: editorForm.slug,
    category: editorForm.category,
    date: editorForm.date,
    tags: tagsList.value,
    excerpt: editorForm.excerpt,
    content: editorForm.content,
    isFeatured: editorForm.isFeatured
  }

  try {
    if (isEditing.value) {
      await adminApi.updatePost(currentEditSlug.value, { ...payload, newSlug: editorForm.slug })
    } else {
      await adminApi.createPost(payload)
    }
    showModal.value = false
    await loadPosts()
    blogState.fetchPosts() // 刷新前台 Store 缓存
  } catch (err) {
    saveError.value = err.message
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete(post) {
  if (!confirm(`确定要永久删除铭文《${post.title}》吗？`)) return
  try {
    await adminApi.deletePost(post.slug)
    await loadPosts()
    blogState.fetchPosts()
  } catch (err) {
    alert('删除失败: ' + err.message)
  }
}

onMounted(() => {
  if (authState.isLoggedIn) {
    loadPosts()
  }
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #0d0f12;
  color: #e2e8f0;
  padding: 40px 24px 80px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  position: relative;
}

.ambient-glow {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 350px;
  background: radial-gradient(circle, rgba(212, 163, 89, 0.08) 0%, rgba(0,0,0,0) 70%);
  pointer-events: none;
}

/* 登录卡 (古希腊神庙准入石门) */
.login-wrapper {
  max-width: 420px;
  margin: 120px auto 0;
  position: relative;
  z-index: 10;
}
.login-card {
  background: rgba(15, 20, 28, 0.75);
  border: 1px solid rgba(212, 163, 89, 0.3);
  backdrop-filter: blur(24px);
  border-radius: 16px;
  padding: 44px 36px;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212, 163, 89, 0.06);
}
.stele-header {
  text-align: center;
  margin-bottom: 32px;
}
.stele-badge {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 3px;
  color: #d4a359;
  text-transform: uppercase;
  margin-bottom: 10px;
  font-weight: 600;
}
.stele-header h2 {
  font-size: 24px;
  color: #f8fafc;
  margin: 0 0 8px;
  font-weight: 400;
  font-family: var(--font-serif, "Cinzel", "Noto Serif SC", serif);
  letter-spacing: 1px;
}
.subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  font-style: italic;
}

/* 表单通用 */
.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #cbd5e1;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.form-group input,
.form-group textarea {
  width: 100%;
  box-sizing: border-box;
  background: rgba(13, 17, 23, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 10px 12px;
  color: #f1f5f9;
  font-size: 14px;
  transition: all 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #d4a359;
  box-shadow: 0 0 0 2px rgba(212, 163, 89, 0.2);
}
.code-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px !important;
  line-height: 1.6;
}

/* 按钮体系 */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #d4a359, #b8860b);
  color: #0f172a;
  font-weight: 600;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}
.btn-danger-outline {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}
.btn-edit {
  background: rgba(212, 163, 89, 0.15);
  border: 1px solid rgba(212, 163, 89, 0.3);
  color: #d4a359;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  margin-right: 6px;
}
.btn-del {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  margin-bottom: 16px;
}
.login-footer {
  text-align: center;
  margin-top: 20px;
}
.back-link {
  color: #94a3b8;
  font-size: 13px;
  text-decoration: none;
}
.back-link:hover { color: #d4a359; }

/* 工作台布局 (古希腊神庙圣所 · 去模块化) */
.console-wrapper {
  max-width: 960px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  padding-bottom: 80px;
}

/* 顶部典雅仪式区 */
.sanctum-hero {
  text-align: center;
  padding: 40px 20px 32px;
  margin-bottom: 28px;
  border-bottom: 1px solid rgba(212, 163, 89, 0.15);
}
.sanctum-crest {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}
.stele-glyph {
  font-size: 18px;
}
.sanctum-sub {
  font-size: 11px;
  letter-spacing: 3px;
  color: #d4a359;
  text-transform: uppercase;
  font-weight: 600;
}
.sanctum-title {
  font-size: 32px;
  color: #f8fafc;
  margin: 0 0 8px;
  font-weight: 400;
  letter-spacing: 1px;
  font-family: var(--font-serif, "Cinzel", "Noto Serif SC", serif);
}
.sanctum-motto {
  font-size: 13px;
  color: #94a3b8;
  font-style: italic;
  margin: 0 0 20px;
}

/* 极简轻量指标行 (去盒子化) */
.sanctum-meta-strip {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px 18px;
  border-radius: 20px;
  margin-bottom: 24px;
}
.meta-leaf {
  font-size: 12px;
  color: #cbd5e1;
}
.meta-leaf strong {
  color: #d4a359;
  font-weight: 600;
}
.meta-leaf.user-leaf strong {
  color: #f1c40f;
}
.meta-dot {
  color: rgba(255, 255, 255, 0.2);
}

/* 圣所核心操作按钮 */
.sanctum-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.btn-sanctum-primary {
  background: linear-gradient(135deg, #d4a359, #b8860b);
  color: #0f172a;
  border: none;
  font-weight: 600;
  font-size: 13px;
  padding: 8px 22px;
  border-radius: 20px;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(212, 163, 89, 0.25);
  transition: all 0.2s;
}
.btn-sanctum-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(212, 163, 89, 0.35);
}
.btn-sanctum-ghost {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 13px;
  padding: 8px 18px;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-sanctum-ghost:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(212, 163, 89, 0.4);
  color: #f8fafc;
}
.btn-sanctum-text {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 8px 12px;
  transition: color 0.2s;
}
.btn-sanctum-text:hover {
  color: #ef4444;
}

/* 铭文石刻长卷流 (去表格化) */
.stele-stream-container {
  background: rgba(15, 20, 28, 0.6);
  border: 1px solid rgba(212, 163, 89, 0.2);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  padding: 24px 30px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}
.stream-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  letter-spacing: 0.5px;
}
.stream-count {
  font-size: 11px;
  color: #64748b;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: 10px;
}
.stream-loading,
.stream-empty {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  font-size: 14px;
}

/* 铭文行条目 */
.stream-item {
  display: flex;
  align-items: center;
  padding: 16px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
  gap: 16px;
}
.stream-item:last-child {
  border-bottom: none;
}
.stream-item:hover {
  background: rgba(212, 163, 89, 0.03);
  padding-left: 14px;
  border-radius: 6px;
}

/* 日期与置顶 */
.item-time-col {
  width: 110px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.item-date {
  font-size: 12px;
  color: #64748b;
  font-family: ui-monospace, monospace;
}
.featured-star {
  font-size: 10px;
  color: #fbbf24;
  font-weight: 600;
}

/* 铭文内容 */
.item-body-col {
  flex: 1;
  min-width: 0;
}
.item-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}
.item-title {
  font-size: 15px;
  font-weight: 600;
  color: #f1f5f9;
  cursor: pointer;
  transition: color 0.15s;
}
.item-title:hover {
  color: #d4a359;
}
.item-cat-tag {
  background: rgba(212, 163, 89, 0.12);
  border: 1px solid rgba(212, 163, 89, 0.25);
  color: #d4a359;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.item-slug-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.item-slug {
  font-size: 11px;
  color: #475569;
  font-family: ui-monospace, monospace;
}
.item-tags-wrap {
  display: flex;
  gap: 4px;
}
.item-tag-pill {
  font-size: 10px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.08);
  padding: 1px 5px;
  border-radius: 3px;
}

/* 操作按钮 */
.item-action-col {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  transition: opacity 0.2s;
}
.stream-item:hover .item-action-col {
  opacity: 1;
}
.btn-item-edit {
  background: rgba(212, 163, 89, 0.1);
  border: 1px solid rgba(212, 163, 89, 0.25);
  color: #d4a359;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-item-edit:hover {
  background: rgba(212, 163, 89, 0.25);
  color: #f1c40f;
}
.btn-item-del {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #f87171;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-item-del:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* 沉浸式写作模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.immersive-card {
  background: #0f141c;
  border: 1px solid rgba(212, 163, 89, 0.35);
  border-radius: 14px;
  width: 100%;
  max-width: 1100px;
  height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 163, 89, 0.08);
  overflow: hidden;
  padding: 0;
}
.immersive-form {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 28px 16px;
  gap: 12px;
}

/* 顶部极简操作栏 */
.immersive-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.header-left-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #d4a359;
}
.stele-mode {
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tag-checkbox-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  padding: 4px 10px;
  border-radius: 20px;
  cursor: pointer;
  user-select: none;
}
.btn-secondary-sm {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  padding: 5px 14px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.btn-primary-sm {
  background: linear-gradient(135deg, #d4a359, #b8860b);
  border: none;
  color: #0d1117;
  font-weight: 700;
  padding: 5px 18px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

/* 极简大标题输入框 */
.title-wrap {
  width: 100%;
}
.immersive-title-input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  color: #f8fafc;
  font-size: 24px;
  font-weight: 700;
  padding: 4px 0;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}
.immersive-title-input:focus {
  border-bottom-color: rgba(212, 163, 89, 0.4);
}
.immersive-title-input::placeholder {
  color: #475569;
}

/* 单行胶囊元数据栏 (弹性分区 · 严禁折行错位) */
.capsule-meta-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 5px 12px;
  gap: 12px;
  width: 100%;
  box-sizing: border-box;
}

.capsule-section {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.capsule-section.meta-slug-date {
  display: flex;
  align-items: center;
  gap: 8px;
}
.capsule-section.tags-sec {
  flex: 1;
  min-width: 0;
}

.capsule-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.capsule-label {
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

/* 分类胶囊按钮组 */
.cat-pill-group {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cat-chip-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.cat-chip-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
}
.cat-chip-btn.active {
  background: rgba(212, 163, 89, 0.2);
  border-color: rgba(212, 163, 89, 0.6);
  color: #f1c40f;
  font-weight: 600;
}
.cat-custom-input {
  background: transparent;
  border: none;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
  font-size: 11px;
  width: 46px;
  padding: 1px 2px;
  outline: none;
}

.capsule-input {
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.capsule-input.slug-input {
  width: 100px;
}
.capsule-input.date-input {
  width: 100px;
  color-scheme: dark;
}
.capsule-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

/* 动态 Tag Chip 容器 */
.tags-chip-container {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.tags-chip-container::-webkit-scrollbar {
  display: none;
}
.tag-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}
.tag-del-btn {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 12px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  opacity: 0.7;
}
.tag-del-btn:hover {
  opacity: 1;
}
.tag-live-input {
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 11px;
  outline: none;
  flex: 1;
  min-width: 60px;
}

/* 极简单行摘要 */
.excerpt-wrap {
  width: 100%;
}
.immersive-excerpt-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 12px;
  padding: 6px 12px;
  outline: none;
  font-family: inherit;
}
.immersive-excerpt-input:focus {
  border-color: rgba(212, 163, 89, 0.3);
  color: #cbd5e1;
}

/* 巨大化 Markdown 正文编辑区 */
.body-editor-wrap {
  flex: 1;
  display: flex;
  min-height: 0;
  margin-top: 4px;
}
.immersive-textarea {
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
  color: #f1f5f9;
  font-family: "JetBrains Mono", Consolas, "Fira Code", monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}
.immersive-textarea:focus {
  border-color: rgba(212, 163, 89, 0.5);
  background: rgba(0, 0, 0, 0.45);
}
.immersive-textarea::placeholder {
  color: #475569;
}
</style>
