<template>
  <section class="music-page" :style="pageBgStyle">
    <!-- 全页背景层：DomeGallery 铺满整个音乐页（含左侧滚轮区），仅 ACG（第一个流派）显示 -->
    <div v-show="activeRenderIndex === 0" class="dome-bg-layer">
      <ReactBridge :component="DomeGallery" :component-props="domeProps" class="dome-fill" />
    </div>

    <!-- 全页特效层：仅 Nova FM 显示 —— 3D 车舱场景（KeepAlive 缓存：切流派不销毁，避免重载 57MB 车模） -->
    <KeepAlive>
      <PanoramaSphere v-if="activeRenderIndex === 1" class="fx-panorama" />
    </KeepAlive>

    <!-- Nova FM 加载遮罩海报：3D 未就绪时显示，compileAsync 完成后淡出 -->
    <div v-if="activeRenderIndex === 1" class="nova-poster" :class="{ 'is-hidden': novaStatus.ready }">
      <img :src="novaPoster" alt="Nova FM" />
    </div>

    <!-- 全页背景层：未开发流派（index >= 2）显示棱镜背景，滚轮/内容悬浮在上 -->
    <!-- Prism 常驻（display 切换而非 v-if 销毁）：避免反复进出未开发流派时重建 ogl shader/上下文 -->
    <div :class="['underdev-bg-layer', { 'layer-off': activeRenderIndex < 2 }]">
      <ReactBridge :component="Prism" :component-props="prismProps" />
    </div>

    <!-- 左侧：OptionWheel 流派选择器（背景透明，浮在整页统一背景上） -->
    <div class="wheel-wrap">
      <!-- 小毛玻璃块：所有流派都显示，贴合文字区域 -->
      <div class="wheel-glass" />
      <ReactBridge :component="OptionWheel" :component-props="wheelProps" class="wheel-host" />
      <p class="current-label">当前流派：{{ currentGenre.name }}</p>
    </div>

    <!-- 右侧：流派内容层（KeepAlive 缓存 + 淡入淡出过渡，切换零卡顿） -->
    <!-- 注意：KeepAlive 在外、Transition 在内 —— out-in + 外层 KeepAlive 会让离开组件的
         leave-to(opacity:0) 残留在缓存实例上，切回来时内容消失 -->
    <div class="genre-area">
      <KeepAlive>
        <Transition name="genre" mode="out-in">
          <component :is="currentGenreComponent" :key="currentGenre.name" />
        </Transition>
      </KeepAlive>
    </div>

    <!-- 底部 MagicRings 光环（仅 Nova FM 显示；点击触发搓碟；控制走键盘：空格=播放/暂停 F=上一曲 J=下一曲） -->
    <!-- 常驻 + display 切换：休眠而非销毁，避免反复创建/恢复 WebGL 上下文 -->
    <div :class="['magic-ring-host', { 'layer-off': currentIndex !== 1 }]">
      <ReactBridge :component="MagicRings" :component-props="magicRingsProps" />
    </div>
  </section>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import ReactBridge from '../components/ReactBridge.vue'
import { DomeGallery, OptionWheel, MagicRings, Prism } from '../react'
import ACGView from './music/ACGView.vue'
import RadioView from './music/RadioView.vue'
import UnderDevView from './status/UnderDevView.vue' // 待开发占位页（全局状态页）
import acgBg from '../assets/bg/acg.png'
import PanoramaSphere from '../components/PanoramaSphere.vue'
import { player, musicState } from '../music/player'
import { triggerScratch } from '../music/scratch'
import { novaStatus } from '../music/novaStatus'
import novaPoster from '../assets/bg/nova-panorama.png'

// 全局播放动作：调用 player 后尝试刷新 Nova FM 的静态面板（中控/全息，切歌时重绘）
const playerAction = fn => {
  fn()
  if (window.__refreshPanels) window.__refreshPanels()
}

// 未开发流派的全页棱镜背景参数
const prismProps = reactive({
  animationType: 'rotate',
  timeScale: 0.5,
  height: 3.5,
  baseWidth: 5.5,
  scale: 3.6,
  hueShift: 0,
  colorFrequency: 1,
  noise: 0,
  glow: 1,
  transparent: true,
  suspendWhenOffscreen: false,
})

// ===== 搓碟动作（魔环点击触发）：打碟音效 + 流星回溯 + 歌曲回退 3 秒 =====
const scratchAudio = new Audio('/audio/scratch.mp3')
function scratch() {
  if (!musicState.isPlaying) return // 只在播放中触发搓碟（暂停时点击无效）
  scratchAudio.currentTime = 0
  scratchAudio.play().catch(() => {}) // 1 秒打碟音效（用户点击触发，符合自动播放策略）
  triggerScratch(1000) // 流星粒子回溯动画（1 秒）
  player.seek(Math.max(0, musicState.currentTime - 3)) // 歌曲回退 3 秒
}

// MagicRings 光环参数（视觉装饰 + 点击触发搓碟）
// 官方字段表（Basic 预设）全部配置：
// Color #a855f7 / ColorTwo #6366f1 / RingCount 6 / Speed 1 / Attenuation 10 /
// LineThickness 2 / BaseRadius 0.35 / RadiusStep 0.1 / ScaleRate 0.1 / Opacity 1 /
// Blur 0 / NoiseAmount 0.1 / Rotation 0 / RingGap 1.5 / FadeIn 0.7 / FadeOut 0.5 /
// MouseInfluence 0.2 / HoverScale 1.2 / Parallax 0.05 / FollowMouse 开 / ClickBurst 开
const magicRingsProps = reactive({
  color: '#a855f7',
  colorTwo: '#6366f1',
  ringCount: 6,
  speed: 1,
  attenuation: 10,
  lineThickness: 2,
  // 半径缩到容器内（最大 ≈0.475 < 短边 0.5），避免光环被画布边缘裁切露出边框
  baseRadius: 0.2,
  radiusStep: 0.045,
  scaleRate: 0.05,
  opacity: 1,
  blur: 0,
  noiseAmount: 0.1,
  rotation: 0,
  ringGap: 1.5,
  fadeIn: 0.7,
  fadeOut: 0.5,
  followMouse: true, // 开
  mouseInfluence: 0.2,
  hoverScale: 1.2,
  parallax: 0.05,
  clickBurst: true, // 开
  onClick: scratch, // 点击触发搓碟（音效 + 粒子回溯 + 回退 3 秒）
})

// ===== 键盘映射：空格=播放/暂停、F=上一曲、J=下一曲（替换原底部按钮）=====
function onPlayerKey(e) {
  const tag = (e.target && e.target.tagName) || ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return // 输入控件内不响应
  const k = e.key.toLowerCase()
  if (k === ' ') { e.preventDefault(); playerAction(() => player.toggle()) }
  else if (k === 'f') { playerAction(() => player.prev()) }
  else if (k === 'j') { playerAction(() => player.next()) }
}
onMounted(() => { window.addEventListener('keydown', onPlayerKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onPlayerKey) })

// 流派 → 独立页面组件 + 背景
// background: 占位（纯色/渐变），bg: 背景图路径（留空则用占位）
const genres = [
  { name: 'ACG', component: ACGView, background: '#2a1a3a', bg: acgBg },
  { name: 'Nova FM', component: RadioView, background: '#000000', bg: '' },
  // 未开发的流派：待开发占位页（全页棱镜背景 + logo + 此页面待开发）
  { name: 'Techno', component: UnderDevView, background: '#05050f', bg: '' },
  { name: 'Jazz', component: UnderDevView, background: '#05050f', bg: '' },
  { name: 'Lo-Fi', component: UnderDevView, background: '#05050f', bg: '' },
  { name: 'Synthwave', component: UnderDevView, background: '#05050f', bg: '' }
]

// URL 带 ?dash=1 时直接落到 Nova FM（调试仪表盘红色高亮用，省去手动滚轮切换）
const initialIndex = new URLSearchParams(window.location.search).get('dash') === '1' ? 1 : 2
const currentIndex = ref(initialIndex) // 默认选中 Jazz（滚轮 UI 立即响应）
const currentGenre = computed(() => genres[currentIndex.value])

// P0 防抖：滚轮快速划过时只更新 currentIndex（轻量 UI），
// 重型背景（3D 车舱/棱镜/封面墙）用 activeRenderIndex 延迟 350ms 激活——
// 停在 Nova FM 超过 350ms 才挂载 PanoramaSphere，避免划过即触发 25MB 模型 + 89MB HDR 加载
const activeRenderIndex = ref(initialIndex)
let settleTimer = null
watch(currentIndex, v => {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => { activeRenderIndex.value = v }, 350)
})
onBeforeUnmount(() => { clearTimeout(settleTimer) })

// 切歌（含自动进下一首）时刷新 3D 静态面板（中控/全息，切歌才重绘）——从 RadioView 上提
watch(
  () => musicState.index,
  () => { if (window.__refreshPanels) window.__refreshPanels() },
)
const currentGenreComponent = computed(() => currentGenre.value.component)

// 页面背景：有背景图（bg 字段）则用图 + 轻微暗色遮罩（保证文字可读），没有则用占位纯色/渐变
const pageBgStyle = computed(() => {
  const g = currentGenre.value
  if (g.bg) {
    return {
      backgroundImage: `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url(${g.bg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }
  }
  return { background: g.background }
})

// ACG 专属背景：DomeGallery（铺满全页）
// 封面从后端 /api/songs?genre=ACG 拉取（真实封面）
const acgSongs = ref([])
const domeProps = ref({
  images: [],
  fit: 0.9,
  minRadius: 600,
  maxVerticalRotationDeg: 5,
  segments: 30,
  dragDampening: 2,
  grayscale: false, // ACG 彩色封面，不用灰度
  overlayBlurColor: '#2a1a3a'
})

// Nova FM 粒子参数已整合进 PanoramaSphere 的 Three.js 场景（不再用 Lightspeed 组件）

onMounted(async () => {
  player.init() // 播放器初始化（载入第一首，不自动播放）——逻辑从 RadioView 上提
  try {
    const res = await fetch('/api/songs?genre=ACG')
    const data = await res.json()
    acgSongs.value = data.songs || []
    domeProps.value = {
      ...domeProps.value,
      images: acgSongs.value.map(s => ({ src: s.cover, alt: s.title }))
    }
  } catch (e) {
    console.error('[MusicView] 加载 ACG 歌曲失败:', e)
  }
})

// OptionWheel：切换流派 → 更新索引（右侧内容层自动切换）
const wheelProps = {
  items: genres.map(g => g.name),
  defaultSelected: initialIndex,
  textColor: 'rgba(255,255,255,0.45)',
  activeColor: '#ffffff',
  side: 'left',
  fontSize: 3,
  spacing: 1.4,
  curve: 1,
  tilt: 6,
  blur: 2,
  fade: 0.25,
  smoothing: 200,
  inset: 80,
  loop: false,
  draggable: true,
  // soundUrl: '/assets/sounds/click-soft.mp3', // 之后有音频资源再启用
  onChange: index => {
    currentIndex.value = index
  }
}
</script>

<style scoped>
.music-page {
  position: relative;
  height: 100%; /* 占满内容区（flex 布局已扣除导航高度） */
  display: flex;
  overflow: hidden;
  transition: background 0.45s ease; /* 整页统一背景渐变过渡 */
}

/* 全页背景层：DomeGallery 铺满左右两侧，位于最底层。
   不透明（opacity 1），画廊完全覆盖背景图 */
.dome-bg-layer {
  will-change: transform;
  transform: translateZ(0); /* 独立合成层，避免与内容层过渡联动重绘 */
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: auto; /* 画廊可拖拽 */
  opacity: 1;
}

.dome-fill {
  width: 100%;
  height: 100%;
}

/* Nova FM 加载遮罩海报：3D 未就绪时铺满盖住加载过程，就绪后淡出 */
.nova-poster {
  position: absolute;
  inset: 0;
  z-index: 0;
  transition: opacity 0.6s ease;
}
.nova-poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nova-poster.is-hidden {
  opacity: 0;
  pointer-events: none;
}

/* 未开发流派的全页棱镜背景层（置于内容层/滚轮之下） */
.underdev-bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.underdev-bg-layer.layer-off {
  display: none; /* 常驻但隐藏：不销毁 ogl 实例，避免反复重建 shader */
}
.underdev-bg-layer > div {
  width: 100%;
  height: 100%;
}

/* 全景球：Nova FM 3D 车舱场景铺满（KeepAlive 缓存，置于内容层之下）。
   独立合成层（will-change + translateZ(0)）：切流派 Transition 时不触发 3D 画布重排重绘 */
.fx-panorama {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
  transform: translateZ(0);
}

/* 左侧：滚轮区（浮在画廊之上） */
.wheel-wrap {
  position: relative;
  width: 20%; /* 再缩小滚轮区（原 26%），右侧内容区更宽 */
  height: 100%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  z-index: 2;
}

/* 左侧滚轮光晕：矩形光晕从中央向四周扩散渐隐，无边框 */
.wheel-glass {
  position: absolute;
  left: -5%;
  right: -5%; /* 加宽：向两侧延伸出一点 */
  top: 28%; /* 降低高度：上下各留 28%（原 10%） */
  bottom: 28%;
  /* 中央亮、向四周渐隐的光晕 */
  background: radial-gradient(
    ellipse 62% 50% at center,
    rgba(255, 255, 255, 0.14) 0%,
    rgba(255, 255, 255, 0.05) 40%,
    transparent 75%
  );
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  /* 边缘渐隐遮罩：无硬边界，光晕自然融入背景 */
  -webkit-mask-image: radial-gradient(ellipse 72% 60% at center, black 30%, transparent 78%);
  mask-image: radial-gradient(ellipse 72% 60% at center, black 30%, transparent 78%);
  pointer-events: none; /* 不拦截滚轮拖拽 */
}

.wheel-host {
  width: 100%;
  height: 100%;
}

.current-label {
  position: absolute;
  bottom: 8px;
  left: 84px; /* 与 --ow-inset: 80px 对齐 */
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  letter-spacing: 0.5px;
}

/* 右侧：流派内容层（浮在画廊之上） */
.genre-area {
  flex: 1;
  min-width: 0;
  height: 100%;
  position: relative;
  z-index: 1;
}

.genre-area > * {
  height: 100%;
}

/* 切换过渡动画：淡入淡出 + 轻微位移 */
.genre-enter-active,
.genre-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.genre-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.genre-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

/* 底部 MagicRings 光环（fixed 置底居中，纯装饰，不拦截事件） */
.magic-ring-host {
  position: fixed;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 320px;
  height: 160px;
  z-index: 20;
  pointer-events: auto; /* FollowMouse/ClickBurst 需要接收鼠标事件 */
  opacity: 0.9;
}
.magic-ring-host > div {
  width: 100%;
  height: 100%;
}
</style>
