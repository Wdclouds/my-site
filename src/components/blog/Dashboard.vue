<template>
  <section class="dashboard">
    <!-- ══════════ 古希腊神庙风格：三块神谕与石刻卡片 ══════════ -->
    <div class="dash-grid">
      <!-- 1 号位：石碑自传入口 -->
      <article class="dash-card card-info" :ref="el => setCardRef('about', el)" @click="openCard('about')">
        <span class="card-expand" aria-hidden="true">⤢</span>
        <div class="card-badge">🏛️ STELE · 守夜人铭文</div>
        <div class="info-user">
          <div class="user-name">{{ name }}</div>
          <div class="user-role">雅典娜神庙的工匠与思考者</div>
        </div>
        <div class="user-links" @click.stop>
          <a href="https://github.com/Wdclouds" target="_blank" rel="noopener" title="GitHub">GitHub</a>
          <span class="sep">/</span>
          <a href="/rss.xml" title="RSS">RSS</a>
          <span class="sep">/</span>
          <a href="mailto:hello@feagle.site" title="信件传递">信件</a>
        </div>
      </article>

      <!-- 2 号位：雅典学宫专栏典籍 -->
      <article class="dash-card card-info" :ref="el => setCardRef('index', el)" @click="openCard('index')">
        <span class="card-expand" aria-hidden="true">⤢</span>
        <div class="card-badge">📜 SCROLLS · 雅典典籍</div>
        <ul class="topic-list">
          <li><span class="dot"></span> Three.js 3D 全景实战</li>
          <li><span class="dot"></span> 认知心理与行为设计</li>
        </ul>
        <div class="card-footer-tip">翻阅 2 卷智慧画廊 <span class="arr">→</span></div>
      </article>

      <!-- 3 号位：卫城集市与演进脉搏 -->
      <article class="dash-card card-info" :ref="el => setCardRef('stats', el)" @click="openCard('stats')">
        <span class="card-expand" aria-hidden="true">⤢</span>
        <div class="card-badge">🕊️ AGORA · 卫城站台</div>
        <div class="stats-metrics">
          <div class="metric-row">
            <span class="m-val">3</span><span class="m-label">篇铭文</span>
            <span class="m-sep">·</span>
            <span class="m-val">2</span><span class="m-label">卷典籍</span>
          </div>
          <div class="metric-date">最近镌刻 · 2026-09-01</div>
        </div>
        <div class="card-footer-tip">观测卫城编年史 <span class="arr">→</span></div>
      </article>
    </div>

    <!-- ══════════ 三卡放大弹窗（GSAP 共享布局动画） ══════════ -->
    <Transition name="morph-fade">
      <div v-if="expanded" class="morph-overlay" @wheel.prevent @click.self="closeCard">
        <div ref="panelRef" class="morph-panel" :class="expanded">
          <!-- 关于我：纯图片，无框 -->
          <template v-if="expanded === 'about'">
            <div class="morph-wire">
              <img :src="aboutDesignImg" alt="关于我设计稿" class="morph-wire-img" />
              <!-- 真实头像（压在头像虚线框位置） -->
              <img :src="avatarSrc" alt="头像" class="avatar-real" />
              <!-- 石碑刻蚀文字效果 -->
              <h1 class="engraved-text">{{ name }}</h1>
              <!-- 真实 Slogan（Slogan 放置区位置） -->
              <p class="slogan-real">{{ slogan }}</p>
              <!-- 石碑内部：虚线元素放置区（可调） -->
              <div class="wire-zone z-avatar"><span>头像</span></div>
              <!-- 社交图标并排：RSS + GitHub -->
              <div class="stone-row">
              <a href="/rss.xml" class="stone-icon" aria-label="RSS 订阅" title="RSS 订阅">
                <svg viewBox="0 0 640 640" width="40" height="40" aria-hidden="true">
                  <defs>
                    <filter id="rss-grit-stone" x="-25%" y="-25%" width="150%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" stitchTiles="stitch" result="noise"/>
                      <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.6 0" in="noise" result="grain"/>
                      <feComposite operator="in" in="grain" in2="SourceGraphic" result="clipped"/>
                      <feBlend mode="multiply" in="clipped" in2="SourceGraphic" result="textured"/>
                      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#FFF4D6" flood-opacity="var(--stone-hi, 0.35)" result="hi"/>
                      <feDropShadow dx="-1" dy="-1" stdDeviation="1" flood-color="#4A3418" flood-opacity="var(--stone-lo, 0.55)" result="lo"/>
                      <feMerge>
                        <feMergeNode in="lo"/>
                        <feMergeNode in="hi"/>
                        <feMergeNode in="textured"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M85.206 469.305C38.197 469.305 0 507.632 0 554.345c0 46.95 38.197 84.876 85.206 84.876 47.15 0 85.324-37.926 85.324-84.876 0-46.713-38.162-85.04-85.324-85.04zM.083 217.42v122.683c79.89 0 154.963 31.24 211.514 87.84 56.492 56.434 87.686 131.872 87.686 212.07h123.202c0-232.987-189.57-422.556-422.403-422.556v-.036zM.236-.012v122.706c284.885 0 516.727 232.078 516.727 517.282l123.037.012C640 287.188 352.953 0 .248 0L.236-.012z" filter="url(#rss-grit-stone)"/>
                </svg>
              </a>
              <a href="https://github.com/Wdclouds" target="_blank" rel="noopener" class="stone-icon" aria-label="GitHub · Wdclouds" title="GitHub · Wdclouds">
                <svg viewBox="0 0 98 96" width="46" height="46" aria-hidden="true">
                  <defs>
                    <filter id="github-grit-stone" x="-25%" y="-25%" width="150%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" result="noise"/>
                      <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.6 0" in="noise" result="grain"/>
                      <feComposite operator="in" in="grain" in2="SourceGraphic" result="clipped"/>
                      <feBlend mode="multiply" in="clipped" in2="SourceGraphic" result="textured"/>
                      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#FFF4D6" flood-opacity="var(--stone-hi, 0.35)" result="hi"/>
                      <feDropShadow dx="-1" dy="-1" stdDeviation="1" flood-color="#4A3418" flood-opacity="var(--stone-lo, 0.55)" result="lo"/>
                      <feMerge>
                        <feMergeNode in="lo"/>
                        <feMergeNode in="hi"/>
                        <feMergeNode in="textured"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <path d="M41.4395 69.3848C28.8066 67.8535 19.9062 58.7617 19.9062 46.9902C19.9062 42.2051 21.6289 37.0371 24.5 33.5918C23.2559 30.4336 23.4473 23.7344 24.8828 20.959C28.7109 20.4805 33.8789 22.4902 36.9414 25.2656C40.5781 24.1172 44.4062 23.543 49.0957 23.543C53.7852 23.543 57.6133 24.1172 61.0586 25.1699C64.0254 22.4902 69.2891 20.4805 73.1172 20.959C74.457 23.543 74.6484 30.2422 73.4043 33.4961C76.4668 37.1328 78.0937 42.0137 78.0937 46.9902C78.0937 58.7617 69.1934 67.6621 56.3691 69.2891C59.623 71.3945 61.8242 75.9883 61.8242 81.252L61.8242 91.2051C61.8242 94.0762 64.2168 95.7031 67.0879 94.5547C84.4102 87.9512 98 70.6289 98 49.1914C98 22.1074 75.9883 6.69539e-07 48.9043 4.309e-07C21.8203 1.92261e-07 -1.9479e-07 22.1074 -4.3343e-07 49.1914C-6.20631e-07 70.4375 13.4941 88.0469 31.6777 94.6504C34.2617 95.6074 36.75 93.8848 36.75 91.3008L36.75 83.6445C35.4102 84.2188 33.6875 84.6016 32.1562 84.6016C25.8398 84.6016 22.1074 81.1563 19.4277 74.7441C18.375 72.1602 17.2266 70.6289 15.0254 70.3418C13.877 70.2461 13.4941 69.7676 13.4941 69.1934C13.4941 68.0449 15.4082 67.1836 17.3223 67.1836C20.0977 67.1836 22.4902 68.9063 24.9785 72.4473C26.8926 75.2227 28.9023 76.4668 31.2949 76.4668C33.6875 76.4668 35.2187 75.6055 37.4199 73.4043C39.0469 71.7773 40.291 70.3418 41.4395 69.3848Z" filter="url(#github-grit-stone)"/>
                </svg>
              </a>
              <!-- ProtonMail 图标（仅信封，无字母） -->
              <a href="mailto:hello@proton.me" class="stone-icon" aria-label="ProtonMail" title="ProtonMail">
                <svg viewBox="0 0 106 86" width="40" height="33" aria-hidden="true">
                  <defs>
                    <filter id="proton-grit-stone" x="-25%" y="-25%" width="150%" height="150%">
                      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="23" stitchTiles="stitch" result="noise"/>
                      <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0.6 0" in="noise" result="grain"/>
                      <feComposite operator="in" in="grain" in2="SourceGraphic" result="clipped"/>
                      <feBlend mode="multiply" in="clipped" in2="SourceGraphic" result="textured"/>
                      <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#FFF4D6" flood-opacity="var(--stone-hi, 0.35)" result="hi"/>
                      <feDropShadow dx="-1" dy="-1" stdDeviation="1" flood-color="#4A3418" flood-opacity="var(--stone-lo, 0.55)" result="lo"/>
                      <feMerge>
                        <feMergeNode in="lo"/>
                        <feMergeNode in="hi"/>
                        <feMergeNode in="textured"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M83.4613 16.1551V86H95.0393C101.094 86 106 81.026 106 74.9015V2.47101C106 0.378398 103.596 -0.761032 102.003 0.575608L83.4613 16.1551Z" filter="url(#proton-grit-stone)"/>
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M67.3128 29.7407L46.1604 48.6618C42.5538 51.8829 37.1709 51.9596 33.4777 48.848L0 20.6691V2.482C0 0.38939 2.40441 -0.760996 3.99653 0.575643L45.998 35.8761C50.0595 39.2944 55.9514 39.2944 60.0129 35.8761L67.3128 29.7407Z" filter="url(#proton-grit-stone)"/>
                  <path d="M83.4613 16.1661L67.3128 29.7407L67.3236 29.7406L46.1604 48.6618C42.5538 51.8829 37.1709 51.9596 33.4777 48.848L0 20.6691V74.9015C0 81.0259 4.9063 86 10.9607 86L83.4613 86V16.1661Z" filter="url(#proton-grit-stone)"/>
                </svg>
              </a>
              </div>
              <button class="morph-close floating" @click="closeCard" aria-label="关闭">✕</button>
            </div>
          </template>

          <!-- 知识库：物理阻尼动效卷轴列表 (AnimatedList) -->
          <template v-else-if="expanded === 'index'">
            <div class="morph-head">
              <span class="morph-icon">📜</span>
              <h3 class="morph-title">雅典学宫 · 典籍卷轴</h3>
              <span class="morph-tag">ACADEMY SCROLLS</span>
              <button class="morph-close" @click="closeCard" aria-label="关闭">✕</button>
            </div>
            <div class="morph-stage list-stage">
              <ReactBridge :component="AnimatedList" :component-props="animatedListProps" />
            </div>
          </template>

          <!-- 站台：上面数据，下面 GitHub 贡献热力图 -->
          <template v-else-if="expanded === 'stats'">
            <div class="morph-head">
              <span class="en">Stats</span>
              <span class="cn">站台</span>
              <button class="morph-close" @click="closeCard" aria-label="关闭">✕</button>
            </div>
            <div class="morph-stats-wrap">
              <div class="morph-stats">
                <div v-for="s in stats" :key="s.label" class="morph-stat">
                  <span class="morph-num serif" :class="{ 'stat-date': s.small }">{{ s.value }}</span>
                  <span class="morph-stat-label">{{ s.label }}</span>
                </div>
              </div>
              <div class="morph-heat">
                <div class="heat-head">
                  <span class="en heat-en">Activity</span>
                  <span class="cn">提交印迹</span>
                  <span class="heat-src">GitHub · {{ GITHUB_USER }}</span>
                </div>
                <img
                  v-if="!ghError"
                  :src="ghChartUrl"
                  alt="GitHub 贡献热力图"
                  class="gh-chart-img"
                  loading="lazy"
                  @error="ghError = true"
                />
                <div v-else class="gh-fallback">GitHub 贡献热力图加载失败</div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { blogState } from '../../stores/blogState'
import ReactBridge from '../../components/ReactBridge.vue'
import { AnimatedList } from '../../react'

const props = defineProps({
  showHeatmap: { type: Boolean, default: true },
  /* 1 号位 DIY 配置 */
  name: { type: String, default: 'Wdclouds' },
  slogan: { type: String, default: 'Γένοιο οἷος ἐσσὶ μαθών' }, // 学会你所是，成为你所是（品达）
  avatarSrc: { type: String, default: '/img/avatar.png' }, // 头像图片地址
  avatarText: { type: String, default: 'F' }, // 无图片时显示的文字/SVG（可选）
})

/* ══════════ 顶部 · GitHub 贡献热力图（ghchart 真实数据，墨水赭色 7A583A） ══════════ */
const GITHUB_USER = 'Wdclouds'
const ghError = ref(false)
const ghChartUrl = 'https://ghchart.rshah.org/7A583A/' + GITHUB_USER

/* ══════════ 卡片图片 ══════════ */
const aboutDesignImg = '/img/about-design.png'
const indexCardImg = '/img/index-card.png'
const statsCardImg = '/img/stats-card.png'

/* ══════════ 专题知识库动效列表（AnimatedList） ══════════ */
const animatedListProps = computed(() => {
  const list = blogState.wikiTopics && blogState.wikiTopics.length > 0
    ? blogState.wikiTopics
    : [
        {
          title: 'Hermes Agent 架构与自主智能体体系',
          description: 'Nous Research 顶尖自主智能体框架实战：三级记忆宫殿、工具链编排与自动化闭环。',
          category: 'agent',
          icon: '/icons/nousresearch.svg',
          article_count: 2
        },
        {
          title: 'Three.js 3D 全景与交互开发实战',
          description: '从 WebGL 基础到车舱 3D 全景模型渲染、CanvasTexture 交互与着色器实战体系化梳理。',
          category: 'dev',
          icon: 'Box',
          article_count: 2
        },
        {
          title: '认知心理学与行为设计手册',
          description: '围绕注意机制、多巴胺回路与心智模型，建立一套可执行的日常精力与习惯管理系统。',
          category: 'mind',
          icon: 'Brain',
          article_count: 2
        }
      ]

  return {
    items: list,
    showGradients: true,
    enableArrowNavigation: true,
    displayScrollbar: false,
    initialSelectedIndex: 0,
    onItemSelect: (item) => {
      console.log('选中专栏:', item)
    }
  }
})

/* ══════════ 三卡放大弹窗（GSAP 共享布局 FLIP 动效） ══════════ */
const expanded = ref(null) // 'about' | 'index' | 'stats' | null
const panelRef = ref(null)
const cardRefs = {}
function setCardRef(key, el) { if (el) cardRefs[key] = el }

function openCard(key) {
  if (expanded.value) return
  const src = cardRefs[key] && cardRefs[key].getBoundingClientRect()
  expanded.value = key
  nextTick(() => {
    const panel = panelRef.value
    if (!panel || !src) return
    const t = panel.getBoundingClientRect()
    gsap.fromTo(
      panel,
      {
        x: src.left - t.left,
        y: src.top - t.top,
        scaleX: src.width / t.width,
        scaleY: src.height / t.height,
        transformOrigin: 'top left',
      },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.45, ease: 'power3.out' }
    )
  })
}
function closeCard() {
  if (!expanded.value) return
  const key = expanded.value
  const src = cardRefs[key] && cardRefs[key].getBoundingClientRect()
  const panel = panelRef.value
  if (!panel || !src) { expanded.value = null; return }
  const t = panel.getBoundingClientRect()
  gsap.to(panel, {
    x: src.left - t.left,
    y: src.top - t.top,
    scaleX: src.width / t.width,
    scaleY: src.height / t.height,
    duration: 0.32,
    ease: 'power3.inOut',
    onComplete: () => {
      expanded.value = null
      gsap.set(panel, { clearProps: 'transform' })
    },
  })
}
function onEsc(e) {
  if (e.key === 'Escape' && expanded.value) closeCard()
}
watch(expanded, open => {
  if (open) window.addEventListener('keydown', onEsc)
  else window.removeEventListener('keydown', onEsc)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))

/* ══════════ 4 号位 · 站点数据（不含累计字数） ══════════ */
const stats = computed(() => {
  const sorted = [...blogState.posts].sort((a, b) => (a.date < b.date ? 1 : -1))
  const days = Math.max(1, Math.floor((Date.now() - new Date('2026-08-20').getTime()) / 86400000))
  return [
    { label: '总文章', value: blogState.posts.length },
    { label: '建站天数', value: days },
    { label: '标签数', value: new Set(blogState.posts.map(p => p.tag)).size },
    { label: '最后更新', value: (sorted[0] ? sorted[0].date : '--').slice(5), small: true },
  ]
})
</script>

<style scoped>
/* ═══════════════ 古典纸面 · 现代杂志字体 ═══════════════ */
.dashboard {
  --paper-1: #F7F2E7;
  --paper-2: #EFE8D8;
  --ink-line: rgba(180, 160, 130, 0.35);
  --ink-soft: rgba(120, 100, 70, 0.62);
  --ink-deep: #3D2B1F;
  --ink-body: #3A3530; /* 温润焦炭深灰 */
  /* 现代中文黑体 + 古典英文衬线 */
  --font-cn: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif;
  --font-en: Georgia, 'Times New Roman', 'Songti SC', serif;
  --font-mono: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
  font-family: var(--font-cn);
  font-weight: 400;
  color: var(--ink-body);
}

/* 英文展示：大字号 / 小型大写 / 加宽字距 */
.en {
  font-family: var(--font-en);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
}
/* 古典衬线数字（6 号位保留） */
.serif { font-family: var(--font-en); }

/* ───────── 热力图头（站台弹窗内用） ───────── */
.heat-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.heat-en { font-size: 1.15rem; color: var(--ink-deep); line-height: 1; }
.cn {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.32em;
  color: var(--ink-soft);
}
.heat-src {
  font-size: 11px;
  color: var(--ink-soft);
  font-family: var(--font-mono);
}
.gh-chart-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 8px;
  background: rgba(255, 252, 246, 0.6);
  padding: 10px;
  box-sizing: border-box;
}
.gh-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 180px;
  border-radius: 8px;
  border: 1px dashed var(--ink-line);
  color: var(--ink-soft);
  font-size: 12px;
}

/* ───────── 网格：三列等高 ───────── */
.dash-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 1fr; /* 每行卡片等高齐平 */
  gap: 16px;
}
.dash-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 允许内部滚动容器收缩 */
  background:
    radial-gradient(rgba(120, 100, 70, 0.04) 1px, transparent 1px) 0 0 / 24px 24px,
    linear-gradient(180deg, var(--paper-1), var(--paper-2));
  border: 1px solid var(--ink-line);
  border-radius: 10px;
  box-shadow:
    0 4px 12px rgba(90, 70, 50, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  padding: 20px 20px 18px;
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}
.dash-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 20px rgba(90, 70, 50, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  border-color: rgba(160, 135, 100, 0.5);
}
.card-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 16px;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--ink-line);
  flex-shrink: 0;
}
.card-title .en { font-size: 1.15rem; color: var(--ink-deep); line-height: 1; }

/* ───────── 真实轻量数据卡（现代杂志排版 · 呼吸感 · 无废话） ───────── */
.card-info {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 18px 20px;
  cursor: pointer;
  min-height: 145px;
  text-align: left;
}
.card-badge {
  font-family: var(--font-en);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--ink-deep);
  opacity: 0.85;
}
.info-user {
  margin: 10px 0 8px;
}
.user-name {
  font-family: var(--font-en);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--ink-deep);
  line-height: 1.2;
}
.user-role {
  font-size: 12px;
  color: var(--ink-soft);
  margin-top: 4px;
}
.user-links {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.user-links a {
  color: var(--ink-deep);
  text-decoration: none;
  font-weight: 500;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.user-links a:hover { opacity: 1; text-decoration: underline; }
.user-links .sep { color: var(--ink-line); font-size: 10px; }

/* 知识库专题列表 */
.topic-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.topic-list li {
  font-size: 13px;
  color: var(--ink-body);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topic-list .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink-soft);
  opacity: 0.6;
}

/* 活跃统计指标 */
.stats-metrics {
  margin: 10px 0 8px;
}
.metric-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.m-val {
  font-family: var(--font-en);
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink-deep);
  line-height: 1;
}
.m-label {
  font-size: 12px;
  color: var(--ink-soft);
}
.m-sep {
  color: var(--ink-line);
  margin: 0 4px;
}
.metric-date {
  font-size: 11px;
  color: var(--ink-soft);
  margin-top: 6px;
  font-family: var(--font-mono);
}

/* 底部引导探索提示 */
.card-footer-tip {
  font-size: 11px;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.75;
  transition: opacity 0.2s, transform 0.2s;
}
.card-info:hover .card-footer-tip {
  opacity: 1;
  color: var(--ink-deep);
}
.card-info:hover .card-footer-tip .arr {
  transform: translateX(3px);
}
.about-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}
.avatar {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(160deg, #fdfaf2, #e9dfc9);
  border: 2px solid rgba(180, 160, 130, 0.4); /* 双圆环外圈 */
  outline: 1px solid rgba(255, 255, 255, 0.75); /* 双圆环内圈微光 */
  outline-offset: 3px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text {
  font-family: var(--font-en);
  font-size: 30px;
  font-weight: 700;
  color: var(--ink-deep);
  line-height: 1;
}
.name-en {
  margin: 0;
  font-family: var(--font-en);
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.05em; /* 收紧：不再过度拉伸 */
  text-transform: uppercase;
  color: var(--ink-deep);
  line-height: 1.1;
  white-space: nowrap;
}
.slogan { margin: 0; font-size: 12px; font-weight: 400; color: var(--ink-soft); }
.socials { display: flex; gap: 10px; }
.socials a {
  width: 34px;
  height: 34px;
  border-radius: 50%; /* 圆钮，填充感更强 */
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-deep);
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid var(--ink-line);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.socials a:hover {
  transform: translateY(-2px);
  background: #fff;
  box-shadow: 0 4px 10px rgba(90, 70, 50, 0.12);
}
.about-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: var(--ink-deep);
  text-decoration: none;
}
.about-link:hover { text-decoration: underline; }
.arr { transition: transform 0.15s ease; }
.about-link:hover .arr { transform: translateX(3px); }



/* 2 号位：知识库（画廊入口，点击展开） */
.card-index { cursor: pointer; }
.gallery-hint {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ink-soft);
  text-align: center;
  border: 1px dashed var(--ink-line);
  border-radius: 8px;
  padding: 20px 12px;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}
.card-index:hover .gallery-hint {
  background: rgba(255, 255, 255, 0.4);
  border-color: rgba(160, 135, 100, 0.5);
  transform: translateY(-1px);
}
.gallery-hint p { margin: 0; font-size: 13px; font-weight: 500; line-height: 1.6; color: var(--ink-deep); }
.hint-arr { font-size: 14px; color: var(--ink-soft); }

/* ══════════ 三卡放大弹窗（共享布局动画） ══════════ */
.card-expand {
  position: absolute;
  top: 14px;
  right: 16px;
  font-size: 13px;
  color: var(--ink-soft);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.dash-card:hover .card-expand { opacity: 0.9; transform: translate(1px, -1px); }

.morph-overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  background: rgba(18, 14, 10, 0.38);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.morph-panel {
  width: min(880px, 92vw);
  height: min(560px, 82vh);
  background:
    radial-gradient(rgba(120, 100, 70, 0.05) 1px, transparent 1px) 0 0 / 22px 22px,
    linear-gradient(180deg, #F7F2E7, #EFE8D8);
  border: 1px solid rgba(180, 160, 130, 0.4);
  border-radius: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  transform-origin: top left; /* GSAP 从卡片位置放大 */
}
.morph-panel.about {
  width: min(560px, 88vw);
  height: min(820px, 90vh);
  border: none;        /* 无框 */
  background: none;    /* 无底色 */
  box-shadow: none;
  padding: 0;
  border-radius: 0;
}
.morph-close.floating {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 3;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(20, 15, 10, 0.35);
  color: #F7F2E7;
  backdrop-filter: blur(4px);
}
.morph-close.floating:hover { background: rgba(20, 15, 10, 0.55); }
.morph-panel.about .morph-wire { border-radius: 0; background: transparent; }

/* ══════════ 石碑刻蚀文字（凹陷光影） ══════════ */
.engraved-text {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translateX(-50%);
  z-index: 2;
  margin: 0;
  font-family: 'Cinzel', 'Trajan Pro', 'Noto Serif SC', 'Songti SC', serif;
  font-size: clamp(2rem, 6vw, 3.2rem);
  font-weight: 700;
  letter-spacing: 6px;
  text-transform: uppercase;
  text-align: center;
  white-space: nowrap;
  /* 凹陷光影：上缘暖棕暗影（背光）+ 下缘暖光（受光切面） */
  color: #B39B62; /* 土黄赭石色 */
  text-shadow:
    0 -1px 2px rgba(74, 52, 24, 0.55),
    0 1px 1px rgba(255, 244, 214, 0.35);
  /* 与石纹融为一体 */
  mix-blend-mode: multiply;
  opacity: 0.95;
  pointer-events: none;
}
.morph-panel.index {
  width: min(720px, 94vw);
  height: min(600px, 84vh);
  display: flex;
  flex-direction: column;
}

.morph-panel.index .list-stage {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 420px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.morph-panel.stats {
  width: min(900px, 94vw);
  height: auto;          /* 高度随内容收缩，不留空白 */
  max-height: 88vh;
  overflow-y: auto;
}

.morph-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px dashed var(--ink-line);
  flex-shrink: 0;
}
.morph-head .en { font-size: 1.3rem; color: var(--ink-deep); }
.morph-close {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--ink-line);
  background: rgba(255, 255, 255, 0.5);
  color: var(--ink-deep);
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.2s ease;
}
.morph-close:hover { background: #fff; transform: rotate(90deg); }

/* 关于我 内容：设计稿 + 虚线放置区 */
.morph-wire {
  position: relative;
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 252, 246, 0.5);
}
.morph-wire-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
/* 石刻图标行（RSS + GitHub 并排） */
.stone-row {
  position: absolute;
  left: 50%;
  bottom: 6%;
  transform: translateX(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
}
.stone-icon {
  /* 石刻光影强度（供 SVG feDropShadow 使用，悬停时变化）——与刻蚀名字同款 */
  --stone-hi: 0.35; /* 底部受光（暖米光） */
  --stone-lo: 0.55; /* 顶部背光（暖棕） */
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: --stone-hi 0.3s ease, --stone-lo 0.3s ease;
}
.stone-icon svg path {
  /* 土黄赭石：比名字略深一档，视觉上对齐 */
  fill: #A69055;
  mix-blend-mode: multiply;
  opacity: 0.95;
  transition: opacity 0.3s ease;
}
/* 悬停：石缝受光，底部高光亮起 */
.stone-icon:hover {
  --stone-hi: 0.55;
  --stone-lo: 0.35;
}
.stone-icon:hover svg path { opacity: 0.95; }


/* 真实 Slogan（与 z-slogan 虚线框同位） */
.slogan-real {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 66%;
  transform: translateX(-50%);
  z-index: 2;
  margin: 0;
  font-family: Georgia, 'Times New Roman', 'Songti SC', serif;
  font-style: italic;
  font-size: clamp(0.95rem, 2.4vw, 1.3rem);
  line-height: 1.5;
  text-align: center;
  color: #A58E5C; /* 土黄 */
  text-shadow:
    0 -1px 1px rgba(74, 52, 24, 0.45),
    0 1px 1px rgba(255, 244, 214, 0.3);
  mix-blend-mode: multiply;
  opacity: 0.92;
  pointer-events: none;
}

/* 真实头像（与 z-avatar 虚线框同位） */
.avatar-real {
  position: absolute;
  left: 50%;
  top: 5%;
  width: 24%;
  aspect-ratio: 1;
  transform: translate(calc(-50% + 5px), 10px);
  border-radius: 50%;
  object-fit: cover;
  z-index: 2;
  border: 2px solid rgba(247, 242, 231, 0.7);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

/* 石碑内部虚线放置区 */
.wire-zone {
  position: absolute;
  border: 2px dashed rgba(122, 88, 58, 0.85);
  border-radius: 10px;
  background: rgba(247, 242, 231, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.wire-zone span {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: #7A583A;
  background: rgba(247, 242, 231, 0.85);
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
}
.z-avatar {
  left: 50%;
  top: 5%;
  width: 24%;
  aspect-ratio: 1;
  transform: translate(calc(-50% + 5px), 10px); /* 下移 10px、右移 5px */
  border-radius: 50%;
}
.z-socials {
  left: 50%;
  top: 56%;
  width: 56%;
  height: 9%;
  transform: translateX(-50%);
}

/* 知识库 内容（画廊） */
.morph-stage {
  flex: 1;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(255, 252, 246, 0.5);
}
.morph-stage :deep(> div) { width: 100%; height: 100%; }
.morph-tip {
  margin: 12px 0 0;
  text-align: center;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

/* 站台 内容：上面数据 + 下面热力图 */
.morph-stats-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px; /* 紧密布局 */
}
.morph-stats {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 个数据一排 */
  align-items: center;
  gap: 8px;
  padding: 6px 0 12px;
  border-bottom: 1px dashed var(--ink-line);
}
.morph-stat { display: flex; flex-direction: column; align-items: center; gap: 8px; white-space: nowrap; }
.morph-num {
  font-size: clamp(26px, 3.4vw, 40px); /* 一排 4 个，字号收敛 */
  font-weight: 700;
  line-height: 1;
  color: var(--ink-deep);
  letter-spacing: 0.04em;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
.morph-num.stat-date { font-size: clamp(20px, 2.6vw, 30px); letter-spacing: 0.08em; }
.morph-stat-label { font-size: 12px; font-weight: 500; letter-spacing: 0.18em; color: var(--ink-soft); }

/* 站台弹窗内热力图：无框，直接融入窗口 */
.morph-heat {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.morph-heat .gh-chart-img {
  width: 100%;
  height: auto;
  background: transparent; /* 去底衬 */
  padding: 0;
  border-radius: 0;
}
.morph-heat .gh-fallback {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 弹窗淡入 */
.morph-fade-enter-active,
.morph-fade-leave-active { transition: opacity 0.25s ease; }
.morph-fade-enter-from,
.morph-fade-leave-to { opacity: 0; }

/* 3-5 号位已精简：只保留 关于我 / 知识库 / 站台 三卡（一行三列） */

/* 6 号位：站点数据（古典衬线数字保留） */
.stat-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: 1fr; /* 两行严格等分 */
  align-items: center;
  gap: 14px 8px;
  margin-top: 4px;
}
.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  white-space: nowrap; /* 严禁折行 */
}
.stat-num {
  font-size: clamp(22px, 2.6vw, 32px);
  font-weight: 700;
  line-height: 1;
  color: var(--ink-deep);
  letter-spacing: 0.04em;
  white-space: nowrap;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
/* 「最后更新」日期项：单独缩小字号，保证 08-20 单行完整 */
.stat-date {
  font-size: clamp(17px, 1.9vw, 23px);
  letter-spacing: 0.08em;
}
.stat-label {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--ink-soft);
  letter-spacing: 0.18em;
  white-space: nowrap;
}

/* ───────── 响应式：移动端自动堆叠 ───────── */
@media (max-width: 767px) {
  .dash-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
  .kb-list { max-height: 300px; }
}
</style>
