<template>
  <div class="desktop-home">
    <!-- ① 顶部：首图 Hero -->
    <header class="hero">
      <img :src="heroImg" alt="Feagle 博客" class="hero-img" />
      <!-- 底部渐变：图片平滑过渡到页面背景（浅色=白，跟随主题） -->
      <div class="hero-fade" aria-hidden="true"></div>
    </header>



    <!-- ② 古典纸面仪表盘 -->
    <Dashboard class="blog-dashboard" />

    <!-- ③ 中间：文章区 -->
    <main class="content">
      <div class="sec-head">
        <h2>ARTICLES&nbsp;<em>/&nbsp;文章</em></h2>
        <span class="sec-count">{{ posts.length }}&nbsp;篇</span>
      </div>

      <!-- 精选两篇 -->
      <div v-if="featured.length" class="featured-grid">
        <router-link
          v-for="p in featured"
          :key="p.id"
          :to="`/blog/posts/${p.slug || p.id}`"
          class="post-card"
        >
          <div class="pc-meta">
            <span>{{ p.date }}</span>
            <span class="pc-tag">{{ p.tag }}</span>
          </div>
          <h3>{{ p.title }}</h3>
          <p class="pc-excerpt">{{ p.excerpt }}</p>
          <span class="pc-more">阅读全文 →</span>
        </router-link>
      </div>

      <!-- 其余按年月归档 -->
      <div v-for="g in groups" :key="g.ym" class="archive">
        <h4 class="arch-ym">{{ g.ym }}</h4>
        <router-link
          v-for="p in g.list"
          :key="p.id"
          :to="`/blog/posts/${p.slug || p.id}`"
          class="arch-row"
        >
          <span class="row-date">{{ p.date.slice(5) }}</span>
          <span class="row-title">{{ p.title }}</span>
          <span class="row-tag">{{ p.tag }}</span>
          <span class="row-arrow">→</span>
        </router-link>
      </div>
    </main>

    <!-- ④ 底部：大色块收尾 -->
    <footer class="end">
      <div class="end-inner">
        <span class="end-mark">■</span>
        <span class="end-text">FEAGLE&nbsp;·&nbsp;2026</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { filteredPosts, featuredPosts, archivedGroups } from '../../../stores/blogState'
import blogHero from '../../../assets/bg/blog-hero.png'
import Dashboard from '../../../components/blog/Dashboard.vue'

const posts = filteredPosts
const featured = featuredPosts
const groups = archivedGroups
const heroImg = blogHero
</script>

<style scoped>
.desktop-home {
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
  height: clamp(640px, 85vh, 1020px); /* 再加高：露出更多图片内容 */
  object-fit: cover;
  object-position: 50% 0%; /* 贴顶：让图片顶部完整露出来 */
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
  margin: -60px auto 0; /* 顶部热力图已移入站台弹窗，压缝量回调 */
  max-width: 1080px;
  padding: 0 7%;
}



/* ============ ③ 文章区 ============ */
.content {
  max-width: 1080px;
  margin: 0 auto;
  padding: 170px 7% 96px; /* 顶部留白：让开仪表盘（精简后变矮） */
}

.sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 36px;
}
.sec-head h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 3px;
}
.sec-head em { font-style: normal; color: var(--text-secondary); font-weight: 400; letter-spacing: 1px; }
.sec-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 2px;
}

/* 精选大卡片 */
.featured-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 64px;
}
.post-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 28px 30px;
  border-radius: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-emboss);
  text-decoration: none;
  color: inherit;
  transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
}
.post-card:hover {
  transform: translateY(-4px);
  border-color: rgba(139, 92, 246, 0.45);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.1);
}
.pc-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1px;
}
.pc-tag {
  padding: 2px 10px;
  border-radius: 99px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  font-size: 11px;
}
.post-card h3 {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  line-height: 1.4;
}
.pc-excerpt {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.pc-more {
  margin-top: auto;
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
}

/* 归档列表 */
.archive { margin-bottom: 40px; }
.arch-ym {
  margin: 0 0 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  letter-spacing: 4px;
  color: var(--text-secondary);
  font-weight: 600;
}
.arch-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 8px;
  border-bottom: 1px solid var(--border-color);
  text-decoration: none;
  color: inherit;
  transition: padding-left 0.2s, background 0.2s;
}
.arch-row:hover {
  padding-left: 18px;
  background: rgba(139, 92, 246, 0.05);
}
.row-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  width: 34px;
  flex-shrink: 0;
}
.row-title { flex: 1; font-size: 15px; font-weight: 500; }
.row-tag {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  flex-shrink: 0;
}
.row-arrow { color: var(--accent); opacity: 0; transition: opacity 0.2s, transform 0.2s; flex-shrink: 0; }
.arch-row:hover .row-arrow { opacity: 1; transform: translateX(3px); }

/* ============ ③ 底部大色块收尾 ============ */
.end {
  background: linear-gradient(180deg, #16181d 0%, #0b0c0f 55%, #050507 100%);
  color: rgba(255, 255, 255, 0.28);
  min-height: 46vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.end-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}
.end-mark {
  font-size: 26px;
  color: rgba(139, 92, 246, 0.8);
  text-shadow: 0 0 24px rgba(139, 92, 246, 0.6);
}
.end-text {
  font-family: 'JetBrains Mono', monospace;
  letter-spacing: 6px;
  font-size: 12px;
}
</style>
