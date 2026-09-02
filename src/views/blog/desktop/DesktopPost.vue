<template>
  <div class="desktop-post">
    <!-- 文章不存在兜底 -->
    <div v-if="!post" class="missing">
      <p>文章不存在或已删除</p>
      <router-link to="/blog" class="back-link">← 返回博客</router-link>
    </div>

    <template v-else>
      <!-- ① 文章头：深色面板 -->
      <header class="post-head">
        <div class="ph-grid"></div>
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
          后续把文章正文渲染到这里，并带上标题层级、代码块、引用等排版样式。
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
import { computed } from 'vue'
import { blogState } from '../../../stores/blogState'

const props = defineProps({ slug: { type: String, default: '' } })

const post = computed(() =>
  blogState.posts.find(p => String(p.id) === String(props.slug))
)
</script>

<style scoped>
.desktop-post {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.missing {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--text-secondary);
}
.back-link { color: var(--accent); text-decoration: none; }

/* ============ ① 文章头 ============ */
.post-head {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(900px 450px at 80% -10%, rgba(139, 92, 246, 0.25), transparent 60%),
    radial-gradient(700px 400px at 5% 115%, rgba(56, 189, 248, 0.12), transparent 55%),
    linear-gradient(180deg, #0e1116 0%, #151a22 100%);
  color: #e7e9ee;
  padding: 84px 7% 72px;
}
.ph-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.045) 1px, transparent 1px);
  background-size: 46px 46px;
  mask-image: radial-gradient(900px 500px at 50% 0%, #000 30%, transparent 80%);
  -webkit-mask-image: radial-gradient(900px 500px at 50% 0%, #000 30%, transparent 80%);
  pointer-events: none;
}
.ph-glow {
  position: absolute;
  width: 380px;
  height: 380px;
  right: -100px;
  top: -140px;
  border-radius: 50%;
  background: rgba(139, 92, 246, 0.3);
  filter: blur(90px);
  pointer-events: none;
}
.ph-inner { position: relative; z-index: 1; max-width: 860px; margin: 0 auto; }

.ph-back {
  display: inline-block;
  margin-bottom: 32px;
  font-size: 13px;
  color: rgba(231, 233, 238, 0.6);
  text-decoration: none;
  letter-spacing: 1px;
  transition: color 0.2s;
}
.ph-back:hover { color: #fff; }

.ph-meta {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  letter-spacing: 1.5px;
  color: rgba(231, 233, 238, 0.55);
}
.ph-tag {
  padding: 3px 12px;
  border-radius: 99px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: #c4b5fd;
  font-size: 11px;
}

.ph-title {
  margin: 0 0 18px;
  font-size: clamp(28px, 3.6vw, 44px);
  font-weight: 800;
  line-height: 1.35;
  color: #f3f4f6;
  text-shadow: 0 0 36px rgba(139, 92, 246, 0.3);
}
.ph-excerpt {
  margin: 0;
  font-size: 15px;
  color: rgba(231, 233, 238, 0.66);
  line-height: 1.8;
  max-width: 640px;
}

/* ============ ② 正文区 ============ */
.article {
  max-width: 720px;
  margin: 0 auto;
  padding: 64px 7% 88px;
  font-size: 16px;
  line-height: 2;
  color: var(--text-primary);
}
.lead {
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 32px;
}
.placeholder {
  color: var(--text-secondary);
  padding: 28px 30px;
  border-radius: 16px;
  border: 1px dashed var(--border-color);
  background: var(--bg-card);
}

/* ============ ③ 底部色块 ============ */
.end {
  background: linear-gradient(180deg, #16181d 0%, #0b0c0f 55%, #050507 100%);
  color: rgba(255, 255, 255, 0.28);
  min-height: 36vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-inner { display: flex; flex-direction: column; align-items: center; gap: 18px; }
.end-mark { font-size: 26px; color: rgba(139, 92, 246, 0.8); text-shadow: 0 0 24px rgba(139, 92, 246, 0.6); }
.end-text { font-family: 'JetBrains Mono', monospace; letter-spacing: 6px; font-size: 12px; }
</style>
