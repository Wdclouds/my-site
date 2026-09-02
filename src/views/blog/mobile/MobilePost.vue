<template>
  <div class="mobile-post">
    <div v-if="!post" class="missing">
      <p>文章不存在或已删除</p>
      <router-link to="/blog" class="back-link">← 返回博客</router-link>
    </div>

    <template v-else>
      <!-- ① 文章头 -->
      <header class="post-head">
        <div class="ph-glow"></div>
        <div class="ph-inner">
          <router-link to="/blog" class="ph-back">← 返回博客</router-link>
          <div class="ph-meta">
            <span class="ph-tag">{{ post.tag }}</span>
            <span class="ph-date">{{ post.date }}</span>
          </div>
          <h1 class="ph-title">{{ post.title }}</h1>
          <p class="ph-excerpt">{{ post.excerpt }}</p>
        </div>
      </header>

      <!-- ② 正文区 -->
      <article class="article">
        <p class="lead">{{ post.excerpt }}</p>
        <p class="placeholder">
          正文内容待接入（Markdown / Notion CMS）。目前为布局占位，
          后续把文章正文渲染到这里。
        </p>
      </article>

      <!-- ③ 底部大色块 -->
      <footer class="end">
        <div class="end-inner">
          <span class="end-mark">■</span>
          <span class="end-text">FEAGLE · 2026</span>
        </div>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { blogState } from '../../../stores/blogState'

const props = defineProps({ slug: { type: String, default: '' } })

const fetchedPost = ref(null)
const isLoading = ref(false)

const post = computed(() => {
  return blogState.posts.find(p => p.slug === props.slug || String(p.id) === String(props.slug)) || fetchedPost.value
})

async function fetchCurrentPost() {
  if (!props.slug) return
  isLoading.value = true
  try {
    const res = await fetch(`/api/posts/${props.slug}`)
    if (res.ok) {
      fetchedPost.value = await res.json()
    }
  } catch (err) {
    console.warn('[MobilePost] 获取单篇文章失败:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchCurrentPost)
watch(() => props.slug, fetchCurrentPost)
</script>

<style scoped>
.mobile-post {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.missing {
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: var(--text-secondary);
}
.back-link { color: var(--accent); text-decoration: none; }

/* ============ ① 文章头 ============ */
.post-head {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(500px 260px at 85% -5%, rgba(139, 92, 246, 0.28), transparent 60%),
    linear-gradient(180deg, #0e1116 0%, #161b24 100%);
  color: #e7e9ee;
  padding: 64px 20px 40px;
}
.ph-glow {
  position: absolute;
  width: 260px;
  height: 260px;
  right: -90px;
  top: -60px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.3);
  filter: blur(70px);
  pointer-events: none;
}
.ph-inner { position: relative; z-index: 1; }

.ph-back {
  display: inline-block;
  margin-bottom: 24px;
  font-size: 12px;
  color: rgba(231, 233, 238, 0.6);
  text-decoration: none;
}
.ph-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(231, 233, 238, 0.55);
}
.ph-tag {
  padding: 2px 10px;
  border-radius: 99px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: #c4b5fd;
  font-size: 10px;
}
.ph-title {
  margin: 0 0 14px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.4;
  color: #f3f4f6;
}
.ph-excerpt {
  margin: 0;
  font-size: 14px;
  color: rgba(231, 233, 238, 0.64);
  line-height: 1.8;
}

/* ============ ② 正文区 ============ */
.article {
  padding: 36px 20px 56px;
  font-size: 15px;
  line-height: 2;
}
.lead {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 24px;
}
.placeholder {
  color: var(--text-secondary);
  padding: 20px;
  border-radius: 14px;
  border: 1px dashed var(--border-color);
  background: var(--bg-card);
}

/* ============ ③ 底部色块 ============ */
.end {
  background: linear-gradient(180deg, #16181d 0%, #0b0c0f 55%, #050507 100%);
  color: rgba(255, 255, 255, 0.28);
  min-height: 26vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.end-mark { font-size: 22px; color: rgba(139, 92, 246, 0.8); text-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
.end-text { font-family: 'JetBrains Mono', monospace; letter-spacing: 5px; font-size: 11px; }
</style>
