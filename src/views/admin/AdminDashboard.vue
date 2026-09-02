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

    <!-- 2. 已登录：全功能文章增删查改管理工作台 -->
    <div v-else class="console-wrapper">
      <header class="console-header">
        <div class="header-left">
          <span class="stele-badge">🏛️ ATHENA STELE CONSOLE</span>
          <h1>铭文管理工作台</h1>
          <p class="welcome-text">欢迎归来，守护者 <strong>{{ authState.user?.username }}</strong></p>
        </div>
        <div class="header-actions">
          <router-link to="/blog" class="btn-secondary">查看前台</router-link>
          <button @click="openCreateModal" class="btn-primary">+ 撰写新铭文</button>
          <button @click="handleLogout" class="btn-danger-outline">退出登录</button>
        </div>
      </header>

      <!-- 文章统计与筛选 -->
      <section class="stats-bar">
        <div class="stat-item">
          <span class="stat-num">{{ posts.length }}</span>
          <span class="stat-label">已收录铭文</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ featuredCount }}</span>
          <span class="stat-label">精选置顶</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ uniqueCategories.length }}</span>
          <span class="stat-label">活跃领域</span>
        </div>
      </section>

      <!-- 文章列表表格 -->
      <div class="table-card">
        <table class="post-table">
          <thead>
            <tr>
              <th>标题 / 摘要</th>
              <th>分类</th>
              <th>标签</th>
              <th>发布日期</th>
              <th>置顶</th>
              <th style="text-align: right;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoadingList">
              <td colspan="6" class="empty-cell">正在拉取神庙铭文列表...</td>
            </tr>
            <tr v-else-if="posts.length === 0">
              <td colspan="6" class="empty-cell">暂无收录文章，点击右上角开始撰写第一篇</td>
            </tr>
            <tr v-for="p in posts" :key="p.id" class="post-row">
              <td class="col-title">
                <div class="post-title">{{ p.title }}</div>
                <div class="post-slug">{{ p.slug }}</div>
              </td>
              <td><span class="category-pill">{{ p.category || 'dev' }}</span></td>
              <td>
                <div class="tag-list">
                  <span v-for="t in (p.tags || [])" :key="t" class="tag-pill">#{{ t }}</span>
                </div>
              </td>
              <td class="col-date">{{ p.date }}</td>
              <td>
                <span v-if="p.isFeatured" class="featured-badge">★ 置顶</span>
                <span v-else class="normal-badge">-</span>
              </td>
              <td class="col-actions">
                <button @click="openEditModal(p)" class="btn-edit">编辑</button>
                <button @click="confirmDelete(p)" class="btn-del">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. 新建 / 编辑文章模态框 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑文章: ' + editorForm.title : '撰写新铭文' }}</h3>
          <button @click="closeModal" class="btn-close">×</button>
        </div>

        <form @submit.prevent="savePost" class="editor-form">
          <div class="form-row">
            <div class="form-group flex-2">
              <label>文章标题 (Title) *</label>
              <input v-model="editorForm.title" type="text" required placeholder="如：从零搭建 Three.js 全景车舱" />
            </div>
            <div class="form-group flex-1">
              <label>URL 标识符 (Slug) *</label>
              <input v-model="editorForm.slug" type="text" required placeholder="如：threejs-car-cockpit" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-1">
              <label>分类领域 (Category)</label>
              <input v-model="editorForm.category" type="text" placeholder="如：dev / mind / thoughts" />
            </div>
            <div class="form-group flex-1">
              <label>发布日期 (Date)</label>
              <input v-model="editorForm.date" type="date" required />
            </div>
            <div class="form-group flex-1">
              <label>标签 (逗号分隔)</label>
              <input v-model="editorForm.tagsInput" type="text" placeholder="WebGL, Three.js, Vue" />
            </div>
            <div class="form-group-checkbox">
              <label>
                <input v-model="editorForm.isFeatured" type="checkbox" />
                精选置顶 (Featured)
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>文章摘要 (Excerpt)</label>
            <textarea v-model="editorForm.excerpt" rows="2" placeholder="简短摘要，用于列表卡片展示..."></textarea>
          </div>

          <div class="form-group">
            <label>Markdown 正文内容 (Content)</label>
            <textarea v-model="editorForm.content" rows="12" class="code-textarea" placeholder="# 一级标题&#10;&#10;正文 Markdown 内容..."></textarea>
          </div>

          <div v-if="saveError" class="error-banner">
            ⚠️ {{ saveError }}
          </div>

          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary">取消</button>
            <button type="submit" class="btn-primary" :disabled="isSaving">
              {{ isSaving ? '正在保存...' : (isEditing ? '保存修改' : '立即发布') }}
            </button>
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
  showModal.value = true

  // 先用列表简要信息填表
  Object.assign(editorForm, {
    title: post.title,
    slug: post.slug,
    category: post.category || 'dev',
    date: post.date,
    tagsInput: (post.tags || []).join(', '),
    excerpt: post.excerpt || '',
    content: '',
    isFeatured: Boolean(post.isFeatured)
  })

  // 异步获取完整正文
  try {
    const full = await adminApi.getPostDetail(post.slug)
    editorForm.content = full.content || ''
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

  const tags = editorForm.tagsInput
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean)

  const payload = {
    title: editorForm.title,
    slug: editorForm.slug,
    category: editorForm.category,
    date: editorForm.date,
    tags,
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

/* 登录卡 */
.login-wrapper {
  max-width: 440px;
  margin: 100px auto 0;
  position: relative;
  z-index: 10;
}
.login-card {
  background: rgba(22, 27, 34, 0.85);
  border: 1px solid rgba(212, 163, 89, 0.25);
  backdrop-filter: blur(16px);
  border-radius: 12px;
  padding: 36px 32px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}
.stele-header {
  text-align: center;
  margin-bottom: 28px;
}
.stele-badge {
  display: inline-block;
  font-size: 11px;
  letter-spacing: 2px;
  color: #d4a359;
  text-transform: uppercase;
  margin-bottom: 8px;
  font-weight: 600;
}
.stele-header h2 {
  font-size: 22px;
  color: #f8fafc;
  margin: 0 0 6px;
  font-weight: 600;
}
.subtitle {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
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

/* 工作台布局 */
.console-wrapper {
  max-width: 1100px;
  margin: 0 auto;
  position: relative;
  z-index: 10;
}
.console-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.console-header h1 {
  font-size: 28px;
  color: #f8fafc;
  margin: 4px 0 6px;
}
.welcome-text {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.header-actions .btn-primary { width: auto; }

/* 状态条 */
.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-item {
  background: rgba(22, 27, 34, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 16px 20px;
}
.stat-num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #d4a359;
}
.stat-label {
  font-size: 12px;
  color: #94a3b8;
}

/* 表格 */
.table-card {
  background: rgba(22, 27, 34, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
}
.post-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.post-table th {
  background: rgba(13, 17, 23, 0.9);
  padding: 12px 16px;
  font-size: 12px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.post-table td {
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 13px;
}
.post-title {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 14px;
}
.post-slug {
  font-size: 12px;
  color: #64748b;
  font-family: monospace;
}
.category-pill {
  background: rgba(212, 163, 89, 0.12);
  color: #d4a359;
  border: 1px solid rgba(212, 163, 89, 0.25);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
}
.tag-pill {
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  margin-right: 4px;
}
.featured-badge {
  color: #fbbf24;
  font-size: 12px;
  font-weight: 600;
}
.col-actions { text-align: right; }
.empty-cell {
  text-align: center;
  padding: 40px !important;
  color: #64748b;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-card {
  background: #161b22;
  border: 1px solid rgba(212, 163, 89, 0.3);
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 28px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.6);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.modal-header h3 {
  color: #f8fafc;
  margin: 0;
  font-size: 18px;
}
.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 24px;
  cursor: pointer;
}
.form-row {
  display: flex;
  gap: 16px;
}
.flex-1 { flex: 1; }
.flex-2 { flex: 2; }
.form-group-checkbox {
  display: flex;
  align-items: center;
  padding-top: 24px;
}
.form-group-checkbox label {
  font-size: 13px;
  color: #cbd5e1;
  cursor: pointer;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.modal-footer .btn-primary { width: auto; }
</style>
