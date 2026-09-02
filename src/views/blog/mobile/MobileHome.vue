<template>
  <div class="mobile-home">
    <!-- ① 顶部：首图 Hero -->
    <header class="hero">
      <img :src="heroImg" alt="Feagle 博客" class="hero-img" />
      <!-- 底部渐变：图片平滑过渡到页面背景 -->
      <div class="hero-fade" aria-hidden="true"></div>
    </header>



    <!-- ② 古典纸面仪表盘（移动端隐藏热力图，六卡堆叠） -->
    <Dashboard :show-heatmap="false" class="blog-dashboard" />

    <!-- ③ 文章区 -->
    <main class="content">
      <div class="sec-head">
        <h2>文章</h2>
        <span class="sec-count">{{ posts.length }} 篇</span>
      </div>

      <router-link
        v-for="p in posts"
        :key="p.id"
        :to="`/blog/posts/${p.slug || p.id}`"
        class="post-row"
      >
        <div class="pr-meta">
          <span>{{ p.date }}</span>
          <span class="pr-tag">{{ p.tag }}</span>
        </div>
        <h3>{{ p.title }}</h3>
        <p class="pr-excerpt">{{ p.excerpt }}</p>
      </router-link>
    </main>

    <!-- ④ 底部大色块 -->
    <footer class="end">
      <div class="end-inner">
        <span class="end-mark">■</span>
        <span class="end-text">FEAGLE · 2026</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { filteredPosts } from '../../../stores/blogState'
import blogHero from '../../../assets/bg/blog-hero.png'
import Dashboard from '../../../components/blog/Dashboard.vue'

const posts = filteredPosts
const heroImg = blogHero
</script>

<style scoped>
.mobile-home {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* ============ ① 首图 Hero ============ */
.hero {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.hero-img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10; /* 图片原生比例（2880×1800），像朋友圈单图按原比例展示 */
  object-fit: cover;
  object-position: 50% 0%;
}
.hero-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 42%;
  background: linear-gradient(to bottom, transparent 0%, var(--bg-primary) 100%);
  pointer-events: none;
}

/* ============ ② 古典纸面仪表盘（Dashboard.vue，压缝定位） ============ */
.blog-dashboard {
  position: relative;
  z-index: 2;
  margin: -244px auto 0; /* 再提 100px */
  padding: 0 16px;
}



/* ============ ③ 文章区 ============ */
.content { padding: 260px 20px 64px; /* 顶部留白：让开堆叠的仪表盘（精简后变矮） */ }
.sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 22px;
}
.sec-head h2 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 2px; }
.sec-count { font-size: 12px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }

.post-row {
  display: block;
  padding: 18px 16px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-emboss);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, border-color 0.2s;
}
.post-row:active { transform: scale(0.98); }
.pr-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.pr-tag {
  padding: 2px 8px;
  border-radius: 99px;
  border: 1px solid var(--border-color);
  font-size: 10px;
}
.post-row h3 { margin: 0 0 6px; font-size: 16px; font-weight: 700; line-height: 1.45; }
.pr-excerpt {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ============ ③ 底部色块 ============ */
.end {
  background: linear-gradient(180deg, #16181d 0%, #0b0c0f 55%, #050507 100%);
  color: rgba(255, 255, 255, 0.28);
  min-height: 30vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-inner { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.end-mark { font-size: 22px; color: rgba(139, 92, 246, 0.8); text-shadow: 0 0 20px rgba(139, 92, 246, 0.6); }
.end-text { font-family: 'JetBrains Mono', monospace; letter-spacing: 5px; font-size: 11px; }
</style>
