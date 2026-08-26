<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, onActivated, onDeactivated } from 'vue'
import * as THREE from 'three'
import gsap from 'gsap'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { player, musicState } from '../music/player'
import { NOVA_TRACKS } from '../music/novaTracks'
import { isScratching } from '../music/scratch'
import { novaStatus } from '../music/novaStatus'

/**
 * 车载太空场景（Three.js）
 * 分层（从下到上）：HDR 星云背景 → 兰博基尼车体 → 切换流派层（Vue 层）
 * - 鼠标移到屏幕左右边缘 → 视角向该方向缓转（边缘转头）
 * - 三块屏幕(主驾 HUD / 副驾频谱 / 中控导航) + 全息投屏(可交互) 均用 CanvasTexture
 *   数据源 = player 全局 musicState, 动画循环 30fps 重绘(频谱 60fps)
 */
const mountEl = ref(null)
let renderer = null
let rafId = 0

let camera = null
let mesh = null
let resizeHandler = null
let holoClickHandler = null // 全息面板: 点击交互
let holoEscHandler = null // 全息面板: ESC 关闭
let rafRunning = false
let animateRef = null
let componentActive = true // KeepAlive 激活状态

// 统一注册/注销 window 监听器（幂等：先 remove 再 add，避免重复）
function registerWindow() {
  window.removeEventListener('resize', resizeHandler)
  window.addEventListener('resize', resizeHandler)
  window.removeEventListener('mousemove', onMouseMove)
  window.addEventListener('mousemove', onMouseMove)
  if (holoClickHandler) { window.removeEventListener('click', holoClickHandler); window.addEventListener('click', holoClickHandler) }
  if (holoEscHandler) { window.removeEventListener('keydown', holoEscHandler); window.addEventListener('keydown', holoEscHandler) }
}
function unregisterWindow() {
  window.removeEventListener('resize', resizeHandler)
  window.removeEventListener('mousemove', onMouseMove)
  if (holoClickHandler) window.removeEventListener('click', holoClickHandler)
  if (holoEscHandler) window.removeEventListener('keydown', holoEscHandler)
}
// rAF 启停（KeepAlive 停用时暂停渲染，避免后台空转烧性能）
function startRaf() {
  if (rafRunning || !animateRef) return
  rafRunning = true
  animateRef(performance.now())
}
function stopRaf() {
  rafRunning = false
  cancelAnimationFrame(rafId)
}
let dashCanvasRef = null // 主驾仪表盘 canvas(动画重绘用)
let dashTexRef = null // 主驾仪表盘 CanvasTexture
let centerCanvasRef = null // 中控屏 canvas(点击刷新用)
let centerTexRef = null // 中控屏 CanvasTexture
let lastDashUpdate = 0 // 仪表重绘节流时间戳
// （粒子调试面板已移除，数值已固化；音乐绑定恒启用）
let hologramAnchorRef = null // 全息锚点（静态场景手动更新矩阵用）
let holoRefreshFn = null // 全息面板刷新回调(GL B 回调内设置)

// ===== 视角状态 =====
// 用"目标-当前"平滑模型：目标角度随边缘转头累积，当前角度用 lerp 缓动跟随 → 转头平滑不卡顿
let camYaw = (0.6 * Math.PI) / 180 // 初始主驾朝向（-359.4° 等价于 0.6°，必须规范化）
let camPitch = (1.4 * Math.PI) / 180
let edgeLookDir = 0 // 边缘转头方向：-1 左 / 0 无 / +1 右
let mouseX = 0 // 鼠标 X（归一化 0-1）
let mouseY = 0 // 鼠标 Y（归一化 0-1）

const EDGE_ZONE_R = 0.15 // 右侧转头区（屏幕右 15%）
const EDGE_ZONE_L = 0.04 // 左侧转头区（屏幕最左 4% —— 很窄，避开滚轮条操作区）
const EDGE_ZONE_V = 0.08 // 上下转头区（屏幕上下 8%）
const EDGE_SPEED = 0.6 // 转头速度（弧度/秒，0.6 ≈ 34°/秒）
const LIMIT_Y = (20 * Math.PI) / 180 // 水平 ±20°（左右各 20°，共 40°；小幅转头）
const LIMIT_X = (3 * Math.PI) / 180 // 垂直 ±3°（小幅抬头低头）

// 角度规范化到 [-PI, PI]
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

// ===== 屏幕面板参数(已定位固化)=====
// 定位方法: my-site/scripts/final-fit.mjs + dash-meshes.mjs
//   主驾: Object_85 左段完整面板 = 整车数字仪表盘区域(宽横向布局, 方向盘后方)
//         x -0.513~-0.228, y 0.248~0.350 (宽 0.285 x 高 0.10, 横宽比 2.85)
//         Object_88 块#1(0.089 圆) = 中央大转速表(发光件在其上, 圆心 -0.371, 0.302)
//         块#0/#2(两侧扁条) = 左右小仪表区; UI 内容(左2右1小圆+百分比条+模式指示)在 _2 贴图
//   副驾: 发光件所在右段面板(横向窄条), 用户已确认正确
// offset: 沿法线浮起距离, 避免平面与面板共面被遮挡("嵌入")
// 四元数 = 从 +Z(默认法线)转到面板法线的 setFromUnitVectors 结果
const SCREEN_PANELS = [
  {
    name: '主驾屏',
    cx: -0.371, cy: 0.300, cz: -0.689, // 面板中心(宽横向数字仪表盘)
    w: 0.285, h: 0.102,                // 宽 x 高(宽横向布局)
    shape: 'plane',
    nx: 0.000, ny: 0.078, nz: 0.997,   // 法线(竖直,后仰 4.5°)
    quat: [0.03890, 0.00000, 0.00000, 0.99924],
    offset: 0.004,                     // 浮起 4mm
  },
  {
    name: '中控屏',
    cx: 0.000, cy: 0.180, cz: -0.555,  // 中心(Object_85 中段斜面中心, 用户微调确认)
    w: 0.111, h: 0.176,                // 宽 x 高(用户 dash 微调后固化)
    shape: 'plane',
    nx: 0.000, ny: 0.718, nz: 0.696,   // 法线(后仰 45.9°, 面向驾驶员)
    quat: [0.39015, -0.00000, 0.00000, 0.92075],
    offset: 0.010,                     // 浮起 10mm(斜面共面易遮挡)
  },
]

// 生成屏幕 Mesh: Circle/PlaneGeometry + 四元数旋转 + 沿法线浮起 + 可选 CanvasTexture
function makeScreenMesh(p, texture) {
  const geo = p.shape === 'circle'
    ? new THREE.CircleGeometry(p.w / 2, 48)
    : new THREE.PlaneGeometry(p.w, p.h)
  if (texture) {
    // 纹理质量: SRGB + 各向异性过滤 + 关 toneMapping(避免 ACES 压暗导致灰暗)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  }
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      map: texture || null,
      color: texture ? 0xffffff : 0x00ff88,
      transparent: !texture,
      opacity: texture ? 1 : 0.6, // 纯色模式 60% 不透明(覆盖率检查用)
      side: THREE.DoubleSide,
      depthWrite: !texture ? false : true, // 纯色透明面不写深度, 避免自遮挡
      toneMapped: false, // 屏幕自发光, 不被 ACES toneMapping 压暗
    })
  )
  const n = new THREE.Vector3(p.nx, p.ny, p.nz).normalize()
  mesh.position.set(p.cx, p.cy, p.cz).addScaledVector(n, p.offset || 0) // 沿法线浮起
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
  if (!texture) mesh.renderOrder = 800 // 纯色面渲染顺序: 车模之后, 线框(950)之前
  mesh.name = '__screen_' + p.name + '__'
  return mesh
}
// ===== 主驾仪表动态状态 + 绘制函数（模块级：动画循环与 GLB 回调共用，避免作用域问题）=====
let dashState = {
  displayBpm: musicState.currentTrack?.bpm || 192, altitude: 9342, attitude: { pitch: 0, roll: 0 },
  energy: 68, volume: musicState.volume || 0.68, tick: 0, isPlaying: false, currentTime: 0, duration: 0, modeIndex: 0,
}
// ========== 3D 载具 HUD / 赛博座舱主驾仪表盘(原型 car-screens-prototype 移植) ==========
function drawMainDashboard(ctx, w, h, st) {
  ctx.save()
  ctx.clearRect(0, 0, w, h)
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.1, w * 0.5, h * 0.5, w * 0.6)
  bgGrad.addColorStop(0, '#0a162b'); bgGrad.addColorStop(0.5, '#040913'); bgGrad.addColorStop(1, '#010307')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)
  const cx = w * 0.5, cy = h * 0.52
  const R = h * 0.42
  const bpm = Math.round(st.displayBpm || 0)
  const pct = st.duration ? Math.min(st.currentTime / st.duration, 1) : 0
  const bpmMax = 200
  const NUM_FONT = '"Rajdhani", "Eurostile", "Chakra Petch", "Impact", "Trebuchet MS", sans-serif'
  // 全局 HUD 导轨线
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(w * 0.03, h * 0.12); ctx.lineTo(w * 0.28, h * 0.12); ctx.lineTo(w * 0.35, cy - R * 0.4); ctx.lineTo(w * 0.38, cy - R * 0.4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(w * 0.03, h * 0.88); ctx.lineTo(w * 0.28, h * 0.88); ctx.lineTo(w * 0.35, cy + R * 0.4); ctx.lineTo(w * 0.38, cy + R * 0.4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(w * 0.97, h * 0.12); ctx.lineTo(w * 0.72, h * 0.12); ctx.lineTo(w * 0.65, cy - R * 0.4); ctx.lineTo(w * 0.62, cy - R * 0.4); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(w * 0.97, h * 0.88); ctx.lineTo(w * 0.72, h * 0.88); ctx.lineTo(w * 0.65, cy + R * 0.4); ctx.lineTo(w * 0.62, cy + R * 0.4); ctx.stroke()
  ctx.lineWidth = 1
  for (let i = 0; i < 5; i++) {
    const lx = w * 0.02 + i * 4, rx = w * 0.98 - i * 4, ly = h * 0.35 + i * 8
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.4 - i * 0.07})`
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 8, ly + 6); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(rx, ly); ctx.lineTo(rx - 8, ly + 6); ctx.stroke()
  }
  const drawCornerDeco = (x, y) => {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)'
    ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 5); ctx.stroke()
  }
  drawCornerDeco(w * 0.03, h * 0.12); drawCornerDeco(w * 0.97, h * 0.12); drawCornerDeco(w * 0.03, h * 0.88); drawCornerDeco(w * 0.97, h * 0.88)
  ctx.restore()
  const drawOpenBracket = (x, y, bw, bh, accent = '#00e5ff') => {
    ctx.save()
    ctx.fillStyle = 'rgba(5, 14, 28, 0.55)'
    ctx.beginPath()
    ctx.moveTo(x + 12, y); ctx.lineTo(x + bw, y); ctx.lineTo(x + bw, y + bh - 10); ctx.lineTo(x + bw - 10, y + bh); ctx.lineTo(x, y + bh); ctx.lineTo(x, y + 12)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)'; ctx.lineWidth = 1; ctx.stroke()
    ctx.strokeStyle = accent; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x, y + 12); ctx.lineTo(x + 12, y); ctx.lineTo(x + 28, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x + bw, y + bh - 16); ctx.lineTo(x + bw, y + bh - 10); ctx.lineTo(x + bw - 10, y + bh); ctx.lineTo(x + bw - 24, y + bh); ctx.stroke()
    ctx.restore()
  }
  // 中央仪表盘
  const centerGlow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.15)
  centerGlow.addColorStop(0, 'rgba(0, 229, 255, 0.12)'); centerGlow.addColorStop(0.7, 'rgba(0, 100, 255, 0.03)'); centerGlow.addColorStop(1, 'transparent')
  ctx.fillStyle = centerGlow
  ctx.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6)
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6])
  ctx.beginPath(); ctx.arc(cx, cy, R * 1.08, 0, Math.PI * 2); ctx.stroke()
  ctx.setLineDash([]); ctx.restore()
  const ringW = Math.max(3.5, R * 0.05)
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; ctx.lineWidth = ringW; ctx.stroke()
  if (pct > 0.001) {
    const pGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
    pGrad.addColorStop(0, '#00f2fe'); pGrad.addColorStop(1, '#4facfe')
    ctx.save()
    ctx.shadowColor = '#00f2fe'; ctx.shadowBlur = 10
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
    ctx.strokeStyle = pGrad; ctx.lineWidth = ringW; ctx.lineCap = 'round'; ctx.stroke()
    const endA = -Math.PI / 2 + Math.PI * 2 * pct
    const pulse = st.isPlaying ? 1 + Math.sin(st.tick * 0.25) * 0.2 : 1
    ctx.beginPath(); ctx.arc(cx + Math.cos(endA) * R, cy + Math.sin(endA) * R, R * 0.05 * pulse, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffffff'; ctx.fill()
    ctx.restore()
  }
  const bpmAngle = v => Math.PI / 2 + (v / bpmMax) * (Math.PI * 4 / 3)
  for (let b = 0; b <= bpmMax; b += 10) {
    const a = bpmAngle(b)
    const isMajor = b % 50 === 0, isMid = b % 25 === 0
    const r1 = R * 0.86, r2 = isMajor ? R * 0.70 : isMid ? R * 0.77 : R * 0.81
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
    ctx.strokeStyle = (b >= 160) ? (isMajor ? '#ff3b30' : 'rgba(255, 59, 48, 0.4)') : (isMajor ? '#00f2fe' : 'rgba(0, 242, 254, 0.25)')
    ctx.lineWidth = isMajor ? 2.5 : 1
    ctx.stroke()
    if (isMajor) {
      const lr = R * 0.56
      ctx.save()
      ctx.fillStyle = (b >= 160) ? '#ff4d4f' : 'rgba(255, 255, 255, 0.85)'
      ctx.font = `italic 700 ${Math.round(R * 0.12)}px ${NUM_FONT}`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(String(b), cx + Math.cos(a) * lr, cy + Math.sin(a) * lr)
      ctx.restore()
    }
  }
  const pa = bpmAngle(Math.min(bpm, bpmMax))
  ctx.save()
  ctx.shadowColor = '#00f2fe'; ctx.shadowBlur = 10
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(pa) * R * 0.68, cy + Math.sin(pa) * R * 0.68)
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2.5, R * 0.038); ctx.lineCap = 'round'; ctx.stroke()
  ctx.restore()
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.11, 0, Math.PI * 2); ctx.fillStyle = '#06101e'; ctx.fill()
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.beginPath(); ctx.arc(cx, cy, R * 0.035, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill()
  ctx.save()
  ctx.shadowColor = 'rgba(0, 242, 254, 0.9)'; ctx.shadowBlur = 16
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 900 ${Math.round(R * 0.44)}px ${NUM_FONT}`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(String(bpm).padStart(3, '0'), cx, cy + R * 0.35)
  ctx.restore()
  ctx.fillStyle = 'rgba(0, 229, 255, 0.85)'
  ctx.font = `italic 700 ${Math.round(R * 0.09)}px ${NUM_FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('SPEED // BPM', cx, cy + R * 0.55)
  ctx.fillStyle = st.isPlaying ? '#00e676' : '#607d8b'
  ctx.font = `700 ${Math.round(R * 0.085)}px ${NUM_FONT}`
  ctx.fillText(st.isPlaying ? '● RUNNING' : '❚❚ STANDBY', cx, cy - R * 0.66)
  // 左侧面板
  const LX = w * 0.05, LW = w * 0.22
  const alt = st.altitude || 9000
  drawOpenBracket(LX, h * 0.14, LW, h * 0.34, '#00e676')
  ctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
  ctx.font = `700 ${Math.round(h * 0.045)}px ${NUM_FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('SYS.ALTITUDE', LX + 12, h * 0.21)
  ctx.save()
  ctx.fillStyle = '#00e676'; ctx.shadowColor = 'rgba(0, 230, 118, 0.4)'; ctx.shadowBlur = 8
  ctx.font = `italic 800 ${Math.round(h * 0.13)}px ${NUM_FONT}`
  ctx.fillText(Math.round(alt).toString(), LX + 12, h * 0.32)
  ctx.restore()
  ctx.fillStyle = 'rgba(0, 230, 118, 0.7)'
  ctx.font = `italic 700 ${Math.round(h * 0.055)}px ${NUM_FONT}`
  ctx.fillText('M', LX + LW - 24, h * 0.32)
  const altMin = 7000, altMax = 13000
  const barX = LX + 12, barW = LW - 24, barY = h * 0.37, barH = h * 0.05
  ctx.fillStyle = 'rgba(0, 230, 118, 0.06)'
  ctx.fillRect(barX, barY, barW, barH)
  for (let m = altMin; m <= altMax; m += 1000) {
    const pos = (m - altMin) / (altMax - altMin)
    const x = barX + barW * pos
    const isMajor = m % 5000 === 0
    ctx.strokeStyle = isMajor ? '#00e676' : 'rgba(0, 230, 118, 0.25)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, barY + barH); ctx.lineTo(x, barY + (isMajor ? 0 : barH * 0.5)); ctx.stroke()
  }
  const altPos = Math.max(0, Math.min(1, (alt - altMin) / (altMax - altMin)))
  ctx.fillStyle = '#00e676'; ctx.shadowColor = '#00e676'; ctx.shadowBlur = 6
  ctx.fillRect(barX + barW * altPos - 2, barY - 2, 4, barH + 4)
  ctx.shadowBlur = 0
  const attY = h * 0.52
  drawOpenBracket(LX, attY, LW, h * 0.34, '#00e5ff')
  ctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
  ctx.font = `700 ${Math.round(h * 0.045)}px ${NUM_FONT}`
  ctx.fillText('ATTITUDE // V-STAB', LX + 12, attY + h * 0.08)
  const att = st.attitude || { pitch: 0, roll: 0 }
  ctx.font = `italic 700 ${Math.round(h * 0.08)}px ${NUM_FONT}`
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`PITCH   ${att.pitch >= 0 ? '+' : ''}${att.pitch.toFixed(1)}°`, LX + 12, attY + h * 0.18)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.fillText(`ROLL    ${att.roll >= 0 ? '+' : ''}${att.roll.toFixed(1)}°`, LX + 12, attY + h * 0.27)
  // 右侧面板
  const RX = w * 0.73, RW = w * 0.22
  drawOpenBracket(RX, h * 0.14, RW, h * 0.34, '#ffb300')
  ctx.fillStyle = 'rgba(255, 179, 0, 0.9)'
  ctx.font = `700 ${Math.round(h * 0.045)}px ${NUM_FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('PWR.CELL', RX + 12, h * 0.21)
  const er = h * 0.09
  const ecx = RX + RW * 0.68, ecy = h * 0.30
  const energy = st.energy || 68
  ctx.beginPath(); ctx.arc(ecx, ecy, er, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 179, 0, 0.12)'; ctx.lineWidth = 5; ctx.stroke()
  ctx.save()
  ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 8
  ctx.beginPath(); ctx.arc(ecx, ecy, er, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (energy / 100))
  ctx.strokeStyle = energy > 30 ? '#ffb300' : '#ff3b30'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke()
  ctx.restore()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 800 ${Math.round(er * 0.7)}px ${NUM_FONT}`
  ctx.fillText(Math.round(energy).toString(), ecx, ecy + 3)
  ctx.fillStyle = 'rgba(255, 179, 0, 0.8)'
  ctx.font = `italic 700 ${Math.round(er * 0.28)}px ${NUM_FONT}`
  ctx.fillText('%', ecx, ecy + er * 0.65)
  const vy = h * 0.52
  drawOpenBracket(RX, vy, RW, h * 0.34, '#00e5ff')
  ctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
  ctx.font = `700 ${Math.round(h * 0.045)}px ${NUM_FONT}`
  ctx.textAlign = 'left'
  ctx.fillText('AUDIO.GAIN', RX + 12, vy + h * 0.08)
  const vol = st.volume || 0.68
  const vx = RX + 12, vbarW = RW - 24, vbarY = vy + h * 0.14, vbarH = h * 0.045
  const segments = 14, gap = 2.5
  const segW = (vbarW - (segments - 1) * gap) / segments
  const activeSegments = Math.round(vol * segments)
  for (let i = 0; i < segments; i++) {
    const sx = vx + i * (segW + gap)
    const isActive = i < activeSegments
    ctx.fillStyle = isActive ? (i > 11 ? '#ff3b30' : '#00e5ff') : 'rgba(255, 255, 255, 0.06)'
    ctx.save()
    if (isActive) { ctx.shadowColor = i > 11 ? '#ff3b30' : '#00e5ff'; ctx.shadowBlur = 6 }
    ctx.beginPath()
    ctx.moveTo(sx + 3, vbarY); ctx.lineTo(sx + segW + 3, vbarY); ctx.lineTo(sx + segW, vbarY + vbarH); ctx.lineTo(sx, vbarY + vbarH)
    ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#00e5ff'
  ctx.font = `italic 700 ${Math.round(h * 0.07)}px ${NUM_FONT}`
  ctx.fillText(`${Math.round(vol * 100)}%`, RX + 12, vy + h * 0.27)
  ctx.restore()
}

// 鼠标移动（边缘转头用）
const onMouseMove = e => {
  mouseX = e.clientX / window.innerWidth
  mouseY = e.clientY / window.innerHeight
}
onMounted(() => {
  const container = mountEl.value
  if (!container) return
  novaStatus.ready = false // 全新挂载时重置海报遮罩

  const width = container.clientWidth
  const height = container.clientHeight

  // 场景 + 相机
  const scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(76, width / height, 0.1, 5000)

  // 车模组（固定不动）
  const carGroup = new THREE.Group()
  scene.add(carGroup)

  // 灯光（夜间月光方案）
  // 环境光：0.2（提升基础亮度）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambientLight)
  // 主光：偏冷月光，强度 0.8（更亮，照亮车内）
  const dirLight = new THREE.DirectionalLight(0x9db4ff, 0.8)
  dirLight.position.set(-3, 2, 4) // 左前方
  scene.add(dirLight)
  // （补光 rimLight 已删除 —— 副驾上侧蓝光来源）

  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)) // 性能：4K/Retina 下省 ~40% 片元开销
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2 // 更亮（原 0.9 仍暗；1.2 车内清晰）
  container.appendChild(renderer.domElement)

  // ===== HDR 星云背景（360° 圆柱，两张图拼接）=====
  const R = 1200
  const defaultH = (R * Math.PI * 2) / 2
  const bgGeo = new THREE.CylinderGeometry(R, R, defaultH, 96, 1, true, 0, Math.PI * 2)
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide,
    toneMapped: true
  })
  mesh = new THREE.Mesh(bgGeo, bgMat)
  // 背景垂直偏移：150 - 20 = 130（向下移 20）
  mesh.position.y = 130
  // 背景旋转 +10°（绕 Y 轴）
  mesh.rotation.y = (10 * Math.PI) / 180
  scene.add(mesh)


  scene.add(camera)

  // ===== 粒子：Lightspeed shader（reactbits 视觉）锚定车面前世界原点 =====
  // 每帧把 EMITTER 世界坐标投影到屏幕作为 uCenter，warp 从该点向外射出 →
  // 转头时流光像从车外那个点射出来（世界固定）；深度推到车后 → 车身遮挡、透过车窗可见
  const EMITTER = new THREE.Vector3(-0.2, 0.55, -2.8)
  const projV = new THREE.Vector3() // 投影复用，避免每帧 GC
  const particleUniforms = {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(width * Math.min(window.devicePixelRatio, 1.5), height * Math.min(window.devicePixelRatio, 1.5)) },
    uCenter: { value: new THREE.Vector2(0.5, 0.5) }, // 归一化(0~1)中心，与屏幕尺寸/像素比无关
    uSpeed: { value: 0.05 }, // 固化：速度（BPM 响应更明显的基线）
    uIntensity: { value: 0.85 }, // 固化：亮度（稍提高）
    uOpacity: { value: 0.93 }, // 固化：透明度 0.93
    uColor1: { value: new THREE.Color('#5227FF') }, // 插件原版：同一颗流星三段色
    uColor2: { value: new THREE.Color('#FF9FFC') },
    uColor3: { value: new THREE.Color('#B19EEF') },
    uStreakCount: { value: 112 }, // 官方 Streak Count
    uStretchFactor: { value: 0.02 }, // 官方 Stretch Factor
    uFadePower: { value: 1.55 }, // 固化：淡出强度 1.55
    uRotation: { value: -2.3 }, // 官方 Rotation（弧度）
  }
  const particleVert = `
    void main() {
      // 深度推到车体后方 → 车身遮挡、只透过车窗可见
      gl_Position = vec4(position.xy, 0.985, 1.0);
    }
  `
  const particleFrag = `
    #define PI 3.14159265359
    uniform float iTime;
    uniform vec2 iResolution;
    uniform vec2 uCenter;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    uniform float uStreakCount;
    uniform float uStretchFactor;
    uniform float uIntensity;
    uniform float uSpeed;
    uniform float uRotation;
    uniform float uFadePower;
    uniform float uOpacity;

    float computeStreak(vec2 coord, float timeOffset) {
      coord.x = coord.x * uStreakCount;
      float horizontalPos = fract(coord.x);
      float columnIndex = floor(coord.x);
      coord.y *= uStretchFactor; // 官方字段：控制光轨拉伸长度
      float randomOffset = sin(columnIndex * 215.4);
      // 每列流速随机化（静态）：0.15~1.15 基础，快慢分层。
      // 注意：不能加时间起伏——speedVariation 乘的是累计时间，随时间项会让相位速度变号 → 粒子往回退
      float speedVariation = 0.15 + 1.0 * fract(sin(columnIndex * 127.1) * 43758.5453);
      speedVariation = clamp(speedVariation, 0.1, 1.6);
      float dynamicTrail = mix(95.0, 35.0, speedVariation);
      float animatedY = fract(coord.y + timeOffset * speedVariation + randomOffset);
      float streakValue = animatedY * dynamicTrail;
      streakValue = 1.0 / streakValue;
      streakValue = smoothstep(0.0, 1.0, streakValue * streakValue);
      streakValue = sin(streakValue * PI) * (speedVariation * 5.0);
      float horizontalFalloff = sin(horizontalPos * PI);
      return streakValue * (horizontalFalloff * horizontalFalloff);
    }

    void main() {
      // warp 中心 = 车面前世界原点的屏幕投影（归一化 0~1）→ 世界锚定、与屏幕尺寸无关
      vec2 uv = (gl_FragCoord.xy / iResolution - uCenter) * vec2(iResolution.x / iResolution.y, 1.0);
      float distFromCenter = length(uv) + 0.1;
      float angle = atan(uv.x, uv.y) / PI + uRotation;
      float radius = 2.5 / distFromCenter;
      vec2 polarCoord = vec2(angle, radius);
      // 速度已折进 iTime 累加（JS 侧 iTime += dt*uSpeed），这里不再乘 uSpeed，避免变速时相位跳变
      float animTime = iTime * 0.4;
      vec3 finalColor = vec3(0.0);
      finalColor += uColor1 * computeStreak(polarCoord, animTime);
      finalColor += uColor2 * computeStreak(polarCoord, animTime + 0.33);
      finalColor += uColor3 * computeStreak(polarCoord, animTime + 0.66);
      finalColor *= uIntensity;
      // 距离淡出下限降到 0.05：中心留出更大空心区，光轨从原点周围的环开始发射
      float distanceFade = pow(0.05 + distFromCenter * 0.95, uFadePower);
      finalColor *= distanceFade * uOpacity;
      float alpha = max(max(finalColor.r, finalColor.g), finalColor.b);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `
  const particleMat = new THREE.ShaderMaterial({
    uniforms: particleUniforms,
    vertexShader: particleVert,
    fragmentShader: particleFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: true, // 车体遮挡 → 只透过车窗看到
    depthWrite: false,
  })
  const particleMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), particleMat)
  particleMesh.renderOrder = 10
  particleMesh.frustumCulled = false
  camera.add(particleMesh)
  // ===== 加载车模 =====
  const gltfLoader = new GLTFLoader()
  // Draco 压缩车模运行时解码（public/draco/ 本地解码器，不走 CDN）
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('/draco/')
  gltfLoader.setDRACOLoader(dracoLoader)
  try {
  gltfLoader.load(
    '/lamborghini_revuelto_comp.glb',
    gltf => {
      window.__dashPhase = 'glb-start'
      const car = gltf.scene
      carGroup.add(car)
      const box = new THREE.Box3().setFromObject(car)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      console.log('[car] 尺寸:', size.x.toFixed(2), size.y.toFixed(2), size.z.toFixed(2))
      console.log('[car] 中心:', center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2))

      // 第一人称主驾（用户调试确定）
      carGroup.position.set(0, 0, 0)
      camera.position.set(-0.36, 0.42, -0.14)
      camYaw = (0.6 * Math.PI) / 180 // -359.4° 等价 0.6°，规范化
      camPitch = (1.4 * Math.PI) / 180

      // 打印所有网格节点 + 独立位置（定位倒车镜：倒车镜是独立 mesh，有独特名字）
      const tmpBox = new THREE.Box3()
      const tmpCenter = new THREE.Vector3()
      console.log('[car] 网格清单（mesh 名 + 位置）:')
      let meshCount = 0
      car.traverse(obj => {
        if (!obj.isMesh) return
        meshCount++
        tmpBox.setFromObject(obj)
        tmpBox.getCenter(tmpCenter)
        const matName = obj.material?.name || '(无材质名)'
        console.log(
          `  mesh#${meshCount} 节点名="${obj.name}" | 材质="${matName}" | 位置=(${tmpCenter.x.toFixed(2)}, ${tmpCenter.y.toFixed(2)}, ${tmpCenter.z.toFixed(2)})`
        )
      })
      console.log(`[car] 共 ${meshCount} 个网格`)

      // 材质统一收敛：减少"展厅反光"但保留质感
      // roughness 提到 0.35+、metalness 压到 0.5 以下（之前 0.55/0.4 太哑）
      // 候选镜面材质（盲试）：设为高反射以验证倒车镜
      const mirrorCandidates = [] // 已还原：不再强制改任何材质（避免污染）
      car.traverse(obj => {
        if (!obj.isMesh) return
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(mat => {
          if (!mat) return
          // 如果是候选镜面材质：设为高反射（粗糙度低 + 高金属）
          if (mat.name && mirrorCandidates.includes(mat.name)) {
            mat.roughness = 0.05
            mat.metalness = 1.0
            mat.needsUpdate = true
            console.log(`[car] 镜面候选已启用: ${mat.name}`)
            return
          }
          if ('roughness' in mat) {
            mat.roughness = Math.max(mat.roughness, 0.35)
          }
          if ('metalness' in mat) {
            mat.metalness = Math.min(mat.metalness, 0.5)
          }
          if (mat) mat.needsUpdate = true
        })
      })
      console.log('[car] 材质已收敛（roughness≥0.35, metalness≤0.5）')


      // ===== 车外后视镜：镜面材质（干净版，envMapIntensity 正常值）=====
      const mirrorNodes = ['Object_92', 'Object_104', 'Object_107', 'Object_111', 'Object_123', 'Object_126']
      const mirrorMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.05,
        metalness: 1.0,
        envMapIntensity: 1.0,
        side: THREE.DoubleSide
      })
      car.traverse(obj => {
        if (!obj.isMesh) return
        if (mirrorNodes.includes(obj.name)) {
          obj.material = mirrorMat
        }
      })
      console.log('[后视镜] 6 个网格已设为镜面（干净版）')

      // ===== 屏幕面板固化: CanvasTexture DIY 挂载点 =====
      // SCREEN_PANELS 参数来自 scripts/final-fit.mjs + dash-meshes.mjs
      // makeScreenMesh: Circle/PlaneGeometry + 四元数(from +Z → 面板法线) + 沿法线浮起 + CanvasTexture
      // DIY: 替换 makeScreenTexture() 里的绘制内容即可(频谱/仪表/视频/任意 canvas 内容)
      // 统一音乐状态来自 player 模块(全局单例, 中控屏 + 全息 + 仪表盘共用)

      // ============================================================
      // 中控屏 Canvas 绘制（赛博 HUD 版，UI AI 重构）
      // 静态面板：仅切歌时重绘一次；封面异步加载后自动触发刷新
      // ============================================================
      // 封面图片缓存池（避免切歌时重复创建 Image 导致闪烁）
      const _coverImageCache = new Map()

      function getLoadedCover(url) {
        if (!url) return null
        if (_coverImageCache.has(url)) {
          const cached = _coverImageCache.get(url)
          return cached.complete && cached.naturalWidth !== 0 ? cached : null
        }
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = url
        img.onload = () => {
          // 异步加载完成后通知 Three.js 纹理更新
          if (typeof window.__refreshPanels === 'function') {
            window.__refreshPanels()
          }
        }
        _coverImageCache.set(url, img)
        return null
      }


      // 辅助：绘制倒角/多边形科技线框
      function drawTechPanel(ctx, x, y, width, height, cut = 10) {
        ctx.beginPath()
        ctx.moveTo(x + cut, y)
        ctx.lineTo(x + width - cut, y)
        ctx.lineTo(x + width, y + cut)
        ctx.lineTo(x + width, y + height - cut)
        ctx.lineTo(x + width - cut, y + height)
        ctx.lineTo(x + cut, y + height)
        ctx.lineTo(x, y + height - cut)
        ctx.lineTo(x, y + cut)
        ctx.closePath()
      }

      function drawCenterContent(ctx, w, h) {
        ctx.clearRect(0, 0, w, h)

        // 1. 深邃航天暗底 + 点阵网格
        ctx.fillStyle = '#04070f'
        ctx.fillRect(0, 0, w, h)

        // 点阵背景 (Dot Grid)
        ctx.fillStyle = 'rgba(0, 229, 255, 0.06)'
        const gridStep = Math.round(w * 0.05)
        for (let gx = gridStep; gx < w; gx += gridStep) {
          for (let gy = gridStep; gy < h; gy += gridStep) {
            ctx.fillRect(gx, gy, 1.5, 1.5)
          }
        }

        // 2. 外层机载 HUD 边框与 4 角固定螺栓/支架
        const pad = w * 0.035
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.22)'
        ctx.lineWidth = 1.5
        drawTechPanel(ctx, pad, pad, w - pad * 2, h - pad * 2, 14)
        ctx.stroke()

        // 角标 L 构件
        const bracketL = 16
        ctx.strokeStyle = '#00e5ff'
        ctx.lineWidth = 2.5
        ctx.beginPath(); ctx.moveTo(pad - 2, pad + bracketL); ctx.lineTo(pad - 2, pad - 2); ctx.lineTo(pad + bracketL, pad - 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(w - pad + 2 - bracketL, pad - 2); ctx.lineTo(w - pad + 2, pad - 2); ctx.lineTo(w - pad + 2, pad + bracketL); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(pad - 2, h - pad - bracketL); ctx.lineTo(pad - 2, h - pad + 2); ctx.lineTo(pad + bracketL, h - pad + 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(w - pad + 2 - bracketL, h - pad + 2); ctx.lineTo(w - pad + 2, h - pad + 2); ctx.lineTo(w - pad + 2, h - pad - bracketL); ctx.stroke()

        const t = (typeof musicState !== 'undefined' && musicState.currentTrack) ? musicState.currentTrack : {}
        const trackIdx = (typeof musicState !== 'undefined' && typeof musicState.index === 'number') ? musicState.index + 1 : 1
        const themeColor = t.color || '#00e5ff'

        // ==========================================================
        // 【顶部状态徽章与系统信息】
        // ==========================================================
        ctx.fillStyle = 'rgba(0, 229, 255, 0.08)'
        ctx.fillRect(w * 0.08, h * 0.03, w * 0.84, h * 0.032)
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)'
        ctx.strokeRect(w * 0.08, h * 0.03, w * 0.84, h * 0.032)

        ctx.fillStyle = '#00e5ff'
        ctx.font = '700 ' + Math.round(h * 0.015) + 'px "Courier New", monospace'
        ctx.textAlign = 'left'
        ctx.fillText('NOVA-OS // AV-SYSTEM', w * 0.11, h * 0.052)

        ctx.textAlign = 'right'
        ctx.fillStyle = '#7cf7ff'
        ctx.fillText('GPS LOCK 99.4% [STABLE]', w * 0.89, h * 0.052)

        // ==========================================================
        // 【上部 60%】360° 罗盘星际雷达 HUD
        // ==========================================================
        const navH = h * 0.60
        const ncx = w / 2
        const ncy = navH * 0.50
        const radarR = Math.min(w * 0.38, navH * 0.34)

        // 目的地主标题卡
        ctx.textAlign = 'center'
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 ' + Math.round(h * 0.032) + 'px "Arial Black", "Impact", sans-serif'
        ctx.fillText('DEST : K - P L A N E T', ncx, h * 0.10)

        ctx.fillStyle = 'rgba(0, 229, 255, 0.5)'
        ctx.font = '600 ' + Math.round(h * 0.014) + 'px monospace'
        ctx.fillText('SECTOR 07-B // DEEP SPACE EXPEDITION', ncx, h * 0.122)

        // 罗盘外圈圆环及刻度齿轮
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(ncx, ncy, radarR, 0, Math.PI * 2)
        ctx.stroke()

        // 360 度罗盘刻度线 (共 24 齿，主方位加长)
        for (let a = 0; a < 360; a += 15) {
          const rad = (a * Math.PI) / 180
          const isMajor = a % 90 === 0
          const isSemi = a % 45 === 0
          const tickLen = isMajor ? 8 : (isSemi ? 5 : 3)
          const p1x = ncx + Math.cos(rad) * radarR
          const p1y = ncy + Math.sin(rad) * radarR
          const p2x = ncx + Math.cos(rad) * (radarR - tickLen)
          const p2y = ncy + Math.sin(rad) * (radarR - tickLen)

          ctx.strokeStyle = isMajor ? '#00e5ff' : 'rgba(0, 229, 255, 0.3)'
          ctx.lineWidth = isMajor ? 2 : 1
          ctx.beginPath(); ctx.moveTo(p1x, p1y); ctx.lineTo(p2x, p2y); ctx.stroke()
        }

        // 方位字符 N / E / S / W
        ctx.font = '700 ' + Math.round(h * 0.013) + 'px monospace'
        ctx.fillStyle = '#00e5ff'
        ctx.fillText('N', ncx, ncy - radarR + 15)
        ctx.fillText('S', ncx, ncy + radarR - 7)
        ctx.fillText('E', ncx + radarR - 11, ncy + 4)
        ctx.fillText('W', ncx - radarR + 11, ncy + 4)

        // 内部同心圆与 45° 辅助标线
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'
        ctx.lineWidth = 1
        for (let i = 1; i <= 2; i++) {
          ctx.beginPath()
          ctx.arc(ncx, ncy, (radarR * i) / 3, 0, Math.PI * 2)
          ctx.stroke()
        }

        ctx.save()
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.08)'
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(ncx - radarR * 0.7, ncy - radarR * 0.7); ctx.lineTo(ncx + radarR * 0.7, ncy + radarR * 0.7)
        ctx.moveTo(ncx + radarR * 0.7, ncy - radarR * 0.7); ctx.lineTo(ncx - radarR * 0.7, ncy + radarR * 0.7)
        ctx.stroke()
        ctx.restore()

        // 静态扇区扫描辉光
        const sweep = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, radarR)
        sweep.addColorStop(0, 'rgba(0, 229, 255, 0.22)')
        sweep.addColorStop(0.8, 'rgba(0, 229, 255, 0.04)')
        sweep.addColorStop(1, 'rgba(0, 229, 255, 0)')
        ctx.fillStyle = sweep
        ctx.beginPath()
        ctx.moveTo(ncx, ncy)
        ctx.arc(ncx, ncy, radarR - 1, Math.PI * 0.35, Math.PI * 0.75)
        ctx.closePath()
        ctx.fill()

        // 目标点锁定标记 (红框 + 瞄准括号)
        const targetA = Math.PI * 0.58, targetR = radarR * 0.62
        const tx = ncx + Math.cos(targetA) * targetR, ty = ncy + Math.sin(targetA) * targetR

        // 红色目标点与光晕
        ctx.fillStyle = 'rgba(255, 59, 48, 0.25)'
        ctx.beginPath(); ctx.arc(tx, ty, 9, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = '#ff3b30'
        ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2); ctx.fill()

        // 锁定瞄准角标括号 [ ]
        ctx.strokeStyle = '#ff3b30'
        ctx.lineWidth = 1.5
        const bS = 7
        ctx.beginPath()
        ctx.moveTo(tx - bS, ty - bS + 3); ctx.lineTo(tx - bS, ty - bS); ctx.lineTo(tx - bS + 3, ty - bS)
        ctx.moveTo(tx - bS, ty + bS - 3); ctx.lineTo(tx - bS, ty + bS); ctx.lineTo(tx - bS + 3, ty + bS)
        ctx.moveTo(tx + bS, ty - bS + 3); ctx.lineTo(tx + bS, ty - bS); ctx.lineTo(tx + bS - 3, ty - bS)
        ctx.moveTo(tx + bS, ty + bS - 3); ctx.lineTo(tx + bS, ty + bS); ctx.lineTo(tx + bS - 3, ty + bS)
        ctx.stroke()

        ctx.fillStyle = '#ff6b6b'
        ctx.font = '700 ' + Math.round(h * 0.016) + 'px monospace'
        ctx.textAlign = 'left'
        ctx.fillText('OBJ::LOCKED', tx + 12, ty - 3)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
        ctx.font = '600 ' + Math.round(h * 0.013) + 'px monospace'
        ctx.fillText('14.8 AU', tx + 12, ty + 9)

        // 自身飞船 HUD 航向光标 (极具未来感的折线战机)
        ctx.save()
        ctx.translate(ncx, ncy)
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = '#00e5ff'
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.moveTo(0, -11)
        ctx.lineTo(7, 7)
        ctx.lineTo(0, 3.5)
        ctx.lineTo(-7, 7)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        // 雷达底部遥测数据栏 (复合切角 HUD 条)
        const telY = navH * 0.88
        ctx.fillStyle = 'rgba(0, 229, 255, 0.05)'
        drawTechPanel(ctx, w * 0.08, telY, w * 0.84, h * 0.045, 6)
        ctx.fill()
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)'
        ctx.stroke()

        ctx.fillStyle = '#7cf7ff'
        ctx.font = '700 ' + Math.round(h * 0.015) + 'px monospace'
        ctx.textAlign = 'left'
        ctx.fillText('LAT 42.31°N  LON 87.63°E', w * 0.11, telY + h * 0.028)
        ctx.textAlign = 'right'
        ctx.fillText('HDG 084° // MACH 22', w * 0.89, telY + h * 0.028)

        // 中间分割条 (带发光刻度)
        const sepY = h * 0.63
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(w * 0.08, sepY); ctx.lineTo(w * 0.92, sepY); ctx.stroke()
        ctx.fillStyle = '#00e5ff'
        ctx.fillRect(w * 0.08, sepY - 2, 12, 4)
        ctx.fillRect(w * 0.92 - 12, sepY - 2, 12, 4)

        // ==========================================================
        // 【下部 37%】高级音乐控制中心 (黑胶露出 + HUD 仪表)
        // ==========================================================
        const infoY = h * 0.66
        const artSize = h * 0.165
        const artX = w * 0.08
        const artY = infoY + h * 0.015
        const textX = artX + artSize + w * 0.045
        const maxTextW = w * 0.92 - textX

        // 1. 静态拟态黑胶底座 (从封面右侧探出)
        const discX = artX + artSize * 0.35
        ctx.save()
        ctx.beginPath()
        ctx.arc(discX + artSize / 2, artY + artSize / 2, artSize * 0.46, 0, Math.PI * 2)
        ctx.fillStyle = '#0b0f19'
        ctx.fill()
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // 黑胶同心纹路
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
        ctx.lineWidth = 1
        for (let r = artSize * 0.18; r < artSize * 0.44; r += 5) {
          ctx.beginPath()
          ctx.arc(discX + artSize / 2, artY + artSize / 2, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()

        // 2. 专辑封面 (带切角边框与覆膜)
        const coverImg = getLoadedCover(t.cover)
        ctx.save()
        drawTechPanel(ctx, artX, artY, artSize, artSize, 6)
        ctx.clip()

        if (coverImg) {
          ctx.drawImage(coverImg, artX, artY, artSize, artSize)
        } else {
          // 降级高质感渐变
          const grad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize)
          grad.addColorStop(0, themeColor)
          grad.addColorStop(1, '#09101d')
          ctx.fillStyle = grad
          ctx.fillRect(artX, artY, artSize, artSize)
        }

        // 封面静态高光反光膜 (45° 玻璃质感)
        const gloss = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize)
        gloss.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
        gloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.03)')
        gloss.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
        ctx.fillStyle = gloss
        ctx.fillRect(artX, artY, artSize, artSize)
        ctx.restore()

        // 封面 HUD 切角外边框
        ctx.strokeStyle = '#00e5ff'
        ctx.lineWidth = 1.5
        drawTechPanel(ctx, artX, artY, artSize, artSize, 6)
        ctx.stroke()

        // 3. 右侧歌曲元数据与排版
        // 顶部音轨指示与格式
        ctx.fillStyle = '#00e5ff'
        ctx.font = '700 ' + Math.round(h * 0.014) + 'px monospace'
        ctx.textAlign = 'left'
        const padIdx = String(trackIdx).padStart(2, '0')
        ctx.fillText('TRK // ' + padIdx, textX, artY + h * 0.015)

        ctx.fillStyle = 'rgba(124, 247, 255, 0.6)'
        ctx.font = '600 ' + Math.round(h * 0.013) + 'px monospace'
        ctx.fillText('FLAC 24-BIT/96kHz', textX + w * 0.22, artY + h * 0.015)

        // 歌名 (粗体无衬线科技感)
        ctx.fillStyle = '#ffffff'
        ctx.font = '900 ' + Math.round(h * 0.026) + 'px "Helvetica Neue", "Segoe UI", sans-serif'
        const titleText = t.title || 'NO SIGNAL'
        ctx.fillText(titleText, textX, artY + h * 0.052, maxTextW)

        // 艺术家与专辑
        ctx.fillStyle = '#9cb4c9'
        ctx.font = '600 ' + Math.round(h * 0.019) + 'px sans-serif'
        const artistAlbum = (t.artist || 'UNKNOWN ARTIST') + ' · ' + (t.album || 'SINGLE')
        ctx.fillText(artistAlbum, textX, artY + h * 0.086, maxTextW)

        // 4. 底部微型徽章与静态 12 段均衡器快照
        // BPM 徽章
        if (t.bpm) {
          const bpmBoxY = artY + h * 0.118
          const bpmBoxH = h * 0.028
          const bpmBoxW = w * 0.23

          ctx.fillStyle = 'rgba(0, 229, 255, 0.12)'
          drawTechPanel(ctx, textX, bpmBoxY, bpmBoxW, bpmBoxH, 4)
          ctx.fill()
          ctx.strokeStyle = '#00e5ff'
          ctx.lineWidth = 1
          ctx.stroke()

          ctx.fillStyle = '#00e5ff'
          ctx.font = '800 ' + Math.round(h * 0.016) + 'px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(t.bpm + ' BPM', textX + bpmBoxW / 2, bpmBoxY + bpmBoxH * 0.70)
        }

        // 静态 12 段均衡器快照柱状图 (Equalizer Snapshot)
        const eqX = textX + (t.bpm ? w * 0.26 : 0)
        const eqY = artY + h * 0.118
        const eqW = maxTextW - (t.bpm ? w * 0.26 : 0)
        const barCount = 10
        const barW = Math.max(2, (eqW / barCount) - 3)

        // 伪随机静态高低曲线 (呈现专业频谱感)
        const eqPattern = [0.45, 0.75, 0.6, 0.9, 0.35, 0.8, 0.55, 0.7, 0.4, 0.65]

        ctx.fillStyle = 'rgba(0, 229, 255, 0.45)'
        for (let b = 0; b < barCount; b++) {
          const barH = (h * 0.026) * eqPattern[b % eqPattern.length]
          const bx = eqX + b * (barW + 3)
          const by = eqY + (h * 0.028) - barH
          ctx.fillRect(bx, by, barW, barH)
        }
      }
      function makeScreenTexture(p, index) {
        const cvs = document.createElement('canvas')
        // 主驾高分辨率(面板宽 0.285m, 1024 清晰)
        const res = 512 // 性能：全部屏幕统一 512（主驾物理屏仅 0.285m，够清晰）
        cvs.width = res
        cvs.height = Math.max(64, Math.round(res * p.h / p.w))
        const ctx = cvs.getContext('2d')
        if (p.name === '主驾屏') {
          // 3D 载具 HUD 仪表盘(动画循环每帧重绘)
          drawMainDashboard(ctx, cvs.width, cvs.height, dashState)
        } else {
          drawCenterContent(ctx, cvs.width, cvs.height)
        }
        const tex = new THREE.CanvasTexture(cvs)
        tex.needsUpdate = true
        return tex
      }
      const screenMeshes = []
      let centerScreenMesh = null // 可交互目标：中控屏（Raycaster 收窄用）
      SCREEN_PANELS.forEach((p, i) => {
        const tex = makeScreenTexture(p, i)
        const m = makeScreenMesh(p, tex)
        car.add(m)
        screenMeshes.push(m)
        if (p.name === '主驾屏') {
          dashTexRef = tex
          dashCanvasRef = tex.image // CanvasTexture.image = 源 canvas
        }
        if (p.name === '中控屏') {
          centerTexRef = tex
          centerCanvasRef = tex.image
          centerScreenMesh = m
        }
      })
      console.log('[screen] 3 块屏幕面板已固化（CanvasTexture DIY 挂载点就绪）')

      // ===== 全息投屏系统: 点击中控屏 → 展开全息面板(车体锚点, 内容与中控屏共用) =====
      // 锚点挂 car 子节点: 相机转动时自然透视/遮挡/位移, 不粘屏幕
      // 可调参数(dash 调试按 4 键): 锚点位置/面板尺寸/朝向(rx/ry/rz 三轴旋转)
      // 用户 dash 微调确认: 锚点(-0.040, 0.420, -0.360) 尺寸(0.34x0.20) X6° Y-28° Z4°
      const holoParams = { x: -0.040, y: 0.420, z: -0.360, w: 0.34, h: 0.20, ry: -28, rx: 6, rz: 4 }
      holoParams.init = { x: -0.040, y: 0.420, z: -0.360, w: 0.34, h: 0.20, ry: -28, rx: 6, rz: 4 }
      const hologramAnchor = new THREE.Group()
      hologramAnchorRef = hologramAnchor
      hologramAnchor.position.set(holoParams.x, holoParams.y, holoParams.z)
      car.add(hologramAnchor)
      // 全息面板: 半透明 CanvasTexture + 青色发光边框
      const holoCanvas = document.createElement('canvas')
      holoCanvas.width = 1024
      holoCanvas.height = Math.max(64, Math.round(1024 * holoParams.h / holoParams.w)) // 宽高比匹配面板, 防拉伸
      const holoTex = new THREE.CanvasTexture(holoCanvas)
      holoTex.colorSpace = THREE.SRGBColorSpace
      const holoPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(holoParams.w, holoParams.h),
        new THREE.MeshBasicMaterial({ map: holoTex, transparent: true, opacity: 0.68, side: THREE.DoubleSide, depthWrite: false }) // 透明度调透
      )
      holoPanel.renderOrder = 800
      // 四角点缀：只画面板四角的 L 型支架（不再整圈绿框）
      function makeCornerBrackets(w, h) {
        const b = Math.min(w, h) * 0.22
        const hw = w / 2, hh = h / 2
        const pts = [
          -hw + b, hh, 0,  -hw, hh, 0,  -hw, hh, 0,  -hw, hh - b, 0,
          hw - b, hh, 0,   hw, hh, 0,   hw, hh, 0,   hw, hh - b, 0,
          -hw + b, -hh, 0, -hw, -hh, 0, -hw, -hh, 0, -hw, -hh + b, 0,
          hw - b, -hh, 0,  hw, -hh, 0,  hw, -hh, 0,  hw, -hh + b, 0,
        ]
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
        return geo
      }
      const holoBorder = new THREE.LineSegments(
        makeCornerBrackets(holoParams.w, holoParams.h),
        new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.9 })
      )
      holoBorder.renderOrder = 801
      const hologramGroup = new THREE.Group()
      hologramGroup.add(holoPanel)
      hologramGroup.add(holoBorder)
      hologramGroup.visible = false
      hologramGroup.scale.set(0.01, 0.01, 0.01)
      hologramAnchor.add(hologramGroup)
      // 应用全息参数(位置/尺寸/朝向)
      function applyHoloParams() {
        hologramAnchor.position.set(holoParams.x, holoParams.y, holoParams.z)
        hologramAnchor.rotation.set((holoParams.rx * Math.PI) / 180, (holoParams.ry * Math.PI) / 180, (holoParams.rz * Math.PI) / 180)
        const geo = new THREE.PlaneGeometry(holoParams.w, holoParams.h)
        holoPanel.geometry.dispose()
        holoPanel.geometry = geo
        holoBorder.geometry.dispose()
        holoBorder.geometry = makeCornerBrackets(holoParams.w, holoParams.h)
        // 同步 canvas 宽高比到面板比例, 防止内容拉伸
        const targetH = Math.max(64, Math.round(holoCanvas.width * holoParams.h / holoParams.w))
        if (targetH !== holoCanvas.height) {
          holoCanvas.height = targetH
          if (holoOpen) drawHologram()
        }
      }
      // 全息可点击按钮区域(每次绘制更新, Raycaster UV 映射后检测)
      const holoButtons = []
      const drawHologram = () => {
        if (!holoCanvas || !holoTex) return
        const hctx = holoCanvas.getContext('2d')
        const W = holoCanvas.width
        const H = holoCanvas.height

        // 清空并重新收集交互碰撞区域（仅保留右侧播放列表）
        holoButtons.length = 0

        // 1. 全息半透明深邃底色 + 极细光栅
        hctx.clearRect(0, 0, W, H)
        hctx.fillStyle = 'rgba(3, 7, 15, 0.72)' // 底色更透
        hctx.fillRect(0, 0, W, H)

        // 全息水平微光栅线条
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.035)'
        hctx.lineWidth = 1
        for (let y = 0; y < H; y += 4) {
          hctx.beginPath()
          hctx.moveTo(0, y)
          hctx.lineTo(W, y)
          hctx.stroke()
        }

        // 全息外层倒角外框（极淡，绿色点缀只留四角支架）
        const pad = W * 0.015
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.06)'
        hctx.lineWidth = 1
        drawTechPanel(hctx, pad, pad, W - pad * 2, H - pad * 2, 10)
        hctx.stroke()

        // 顶部极简状态栏
        hctx.fillStyle = '#00e5ff'
        hctx.font = '700 ' + Math.round(H * 0.024) + 'px "Courier New", monospace'
        hctx.textAlign = 'left'
        hctx.fillText('NOVA FM // PHOTONIC HOLOGRAM', W * 0.04, H * 0.055)

        hctx.textAlign = 'right'
        hctx.fillStyle = 'rgba(124, 247, 255, 0.7)'
        hctx.fillText('HOLO-FIELD: 98.2% COHERENCE', W * 0.96, H * 0.055)

        const t = (typeof musicState !== 'undefined' && musicState.currentTrack) ? musicState.currentTrack : {}
        const trackIdx = (typeof musicState !== 'undefined' && typeof musicState.index === 'number') ? musicState.index : 0
        const themeColor = t.color || '#00e5ff'

        // 三栏通用布局参数
        const colW = (W - pad * 2) / 3
        const col1X = pad
        const col2X = pad + colW
        const col3X = pad + colW * 2
        const bodyY = H * 0.085
        const bodyH = H * 0.885

        // 栏目垂直全息光带分割线
        ;[col2X, col3X].forEach(sx => {
          const sepGrad = hctx.createLinearGradient(sx, bodyY, sx, bodyY + bodyH)
          sepGrad.addColorStop(0, 'rgba(0, 229, 255, 0)')
          sepGrad.addColorStop(0.2, 'rgba(0, 229, 255, 0.35)')
          sepGrad.addColorStop(0.8, 'rgba(0, 229, 255, 0.35)')
          sepGrad.addColorStop(1, 'rgba(0, 229, 255, 0)')
          hctx.strokeStyle = sepGrad
          hctx.lineWidth = 1
          hctx.beginPath(); hctx.moveTo(sx, bodyY); hctx.lineTo(sx, bodyY + bodyH); hctx.stroke()
        })

        // ==========================================================
        // 【左 1/3】深空雷达导航 HUD
        // ==========================================================
        hctx.save()
        hctx.beginPath(); hctx.rect(col1X, bodyY, colW, bodyH); hctx.clip()

        const lcx = col1X + colW / 2
        const lcy = bodyY + bodyH * 0.44
        const lr = Math.min(colW * 0.38, bodyH * 0.32)

        hctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
        hctx.font = '700 ' + Math.round(H * 0.022) + 'px monospace'
        hctx.textAlign = 'left'
        hctx.fillText('01 // NAVIGATION', col1X + colW * 0.08, bodyY + H * 0.035)

        hctx.textAlign = 'center'
        hctx.fillStyle = '#ffffff'
        hctx.font = '900 ' + Math.round(H * 0.038) + 'px "Arial Black", sans-serif'
        hctx.fillText('DEST: K-PLANET', lcx, bodyY + H * 0.08)

        // 罗盘刻度圈与刻度
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.25)'
        hctx.beginPath(); hctx.arc(lcx, lcy, lr, 0, Math.PI * 2); hctx.stroke()
        for (let a = 0; a < 360; a += 30) {
          const rad = (a * Math.PI) / 180
          const isMajor = a % 90 === 0
          const tickLen = isMajor ? 6 : 3
          const p1x = lcx + Math.cos(rad) * lr, p1y = lcy + Math.sin(rad) * lr
          const p2x = lcx + Math.cos(rad) * (lr - tickLen), p2y = lcy + Math.sin(rad) * (lr - tickLen)
          hctx.strokeStyle = isMajor ? '#00e5ff' : 'rgba(0, 229, 255, 0.25)'
          hctx.beginPath(); hctx.moveTo(p1x, p1y); hctx.lineTo(p2x, p2y); hctx.stroke()
        }

        // 扫描扇区
        const lSweep = hctx.createRadialGradient(lcx, lcy, 0, lcx, lcy, lr)
        lSweep.addColorStop(0, 'rgba(0, 229, 255, 0.22)')
        lSweep.addColorStop(1, 'rgba(0, 229, 255, 0)')
        hctx.fillStyle = lSweep
        hctx.beginPath(); hctx.moveTo(lcx, lcy); hctx.arc(lcx, lcy, lr - 1, Math.PI * 0.4, Math.PI * 0.75); hctx.closePath(); hctx.fill()

        // 目标点锁定标记
        const ta = Math.PI * 0.58, tr = lr * 0.62
        const tx = lcx + Math.cos(ta) * tr, ty = lcy + Math.sin(ta) * tr
        hctx.fillStyle = '#ff3b30'
        hctx.beginPath(); hctx.arc(tx, ty, 3.5, 0, Math.PI * 2); hctx.fill()

        // 锁定角标 [ ]
        hctx.strokeStyle = '#ff3b30'
        hctx.lineWidth = 1.5
        const bS = 6
        hctx.beginPath()
        hctx.moveTo(tx - bS, ty - bS + 2); hctx.lineTo(tx - bS, ty - bS); hctx.lineTo(tx - bS + 2, ty - bS)
        hctx.moveTo(tx + bS, ty - bS + 2); hctx.lineTo(tx + bS, ty - bS); hctx.lineTo(tx + bS - 2, ty - bS)
        hctx.moveTo(tx - bS, ty + bS - 2); hctx.lineTo(tx - bS, ty + bS); hctx.lineTo(tx - bS + 2, ty + bS)
        hctx.moveTo(tx + bS, ty + bS - 2); hctx.lineTo(tx + bS, ty + bS); hctx.lineTo(tx + bS - 2, ty + bS)
        hctx.stroke()

        hctx.fillStyle = '#ff6b6b'
        hctx.font = '700 ' + Math.round(H * 0.022) + 'px monospace'
        hctx.textAlign = 'left'
        hctx.fillText('TARGET: K-PLANET', tx + 9, ty + 2)

        // 战机光标
        hctx.save()
        hctx.translate(lcx, lcy)
        hctx.fillStyle = '#00e5ff'
        hctx.beginPath(); hctx.moveTo(0, -8); hctx.lineTo(5, 5); hctx.lineTo(0, 2); hctx.lineTo(-5, 5); hctx.closePath(); hctx.fill()
        hctx.restore()

        // 左栏底部遥测状态卡
        const lStatY = bodyY + bodyH * 0.84
        drawTechPanel(hctx, col1X + colW * 0.08, lStatY, colW * 0.84, H * 0.085, 5)
        hctx.fillStyle = 'rgba(0, 229, 255, 0.06)'; hctx.fill()
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.2)'; hctx.stroke()
        hctx.fillStyle = '#7cf7ff'
        hctx.font = '600 ' + Math.round(H * 0.022) + 'px monospace'
        hctx.textAlign = 'center'
        hctx.fillText('LAT 42.31°N // LON 87.63°E', lcx, lStatY + H * 0.036)
        hctx.fillText('VELOCITY: 7.4 km/s (ORBIT)', lcx, lStatY + H * 0.068)
        hctx.restore()

        // ==========================================================
        // 【中 1/3】大画幅纯粹全息音频光球 (仅封面 + 歌名 + 作者)
        // ==========================================================
        hctx.save()
        hctx.beginPath(); hctx.rect(col2X, bodyY, colW, bodyH); hctx.clip()

        const mcx = col2X + colW / 2
        // 尺寸放大，居中呈现大画幅悬浮
        const artSize = Math.min(colW * 0.62, H * 0.38)
        const artX = mcx - artSize / 2
        const artY = bodyY + H * 0.08

        // 1. 顶部小标 (TRK 序列)
        const padIdx = String(trackIdx + 1).padStart(2, '0')
        hctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
        hctx.font = '700 ' + Math.round(H * 0.022) + 'px monospace'
        hctx.textAlign = 'center'
        hctx.fillText('02 // CURRENT TRACK [' + padIdx + '/20]', mcx, bodyY + H * 0.038)

        // 2. 向上全息光束底座 (Holographic Cone)
        const emitY = artY + artSize + H * 0.04
        const coneGrad = hctx.createLinearGradient(mcx, emitY, mcx, artY)
        coneGrad.addColorStop(0, 'rgba(0, 229, 255, 0.35)')
        coneGrad.addColorStop(0.35, 'rgba(0, 229, 255, 0.08)')
        coneGrad.addColorStop(1, 'rgba(0, 229, 255, 0)')
        hctx.fillStyle = coneGrad
        hctx.beginPath()
        hctx.moveTo(mcx - artSize * 0.58, artY + artSize * 0.45)
        hctx.lineTo(mcx + artSize * 0.58, artY + artSize * 0.45)
        hctx.lineTo(mcx + 36, emitY)
        hctx.lineTo(mcx - 36, emitY)
        hctx.closePath()
        hctx.fill()

        // 3. 悬浮虚线错位外框 (全息立体感)
        hctx.save()
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.28)'
        hctx.setLineDash([5, 5])
        drawTechPanel(hctx, artX - 7, artY - 7, artSize + 14, artSize + 14, 8)
        hctx.stroke()
        hctx.restore()

        // 4. 封面本体绘制
        const coverImg = (typeof getLoadedCover === 'function') ? getLoadedCover(t.cover) : null
        hctx.save()
        drawTechPanel(hctx, artX, artY, artSize, artSize, 6)
        hctx.clip()

        if (coverImg) {
          hctx.drawImage(coverImg, artX, artY, artSize, artSize)
        } else {
          const grad = hctx.createRadialGradient(mcx, artY + artSize / 2, 8, mcx, artY + artSize / 2, artSize * 0.75)
          grad.addColorStop(0, themeColor)
          grad.addColorStop(0.55, '#0b1626')
          grad.addColorStop(1, '#040810')
          hctx.fillStyle = grad
          hctx.fillRect(artX, artY, artSize, artSize)
        }

        // 玻璃覆膜与微色散横纹
        const holoGlow = hctx.createLinearGradient(artX, artY, artX, artY + artSize)
        holoGlow.addColorStop(0, 'rgba(0, 229, 255, 0.25)')
        holoGlow.addColorStop(0.5, 'rgba(0, 229, 255, 0.02)')
        holoGlow.addColorStop(1, 'rgba(0, 0, 0, 0.35)')
        hctx.fillStyle = holoGlow
        hctx.fillRect(artX, artY, artSize, artSize)

        hctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
        hctx.lineWidth = 1
        hctx.beginPath()
        hctx.moveTo(artX, artY + artSize * 0.38)
        hctx.lineTo(artX + artSize, artY + artSize * 0.38)
        hctx.stroke()
        hctx.restore()

        // 封面全息发光外框
        hctx.strokeStyle = '#00e5ff'
        hctx.lineWidth = 1.8
        drawTechPanel(hctx, artX, artY, artSize, artSize, 6)
        hctx.stroke()

        // 四角高光光子点标
        const cLen = 12
        hctx.strokeStyle = '#ffffff'
        hctx.lineWidth = 2.2
        hctx.beginPath(); hctx.moveTo(artX - 2, artY + cLen); hctx.lineTo(artX - 2, artY - 2); hctx.lineTo(artX + cLen, artY - 2); hctx.stroke()
        hctx.beginPath(); hctx.moveTo(artX + artSize + 2 - cLen, artY - 2); hctx.lineTo(artX + artSize + 2, artY - 2); hctx.lineTo(artX + artSize + 2, artY + cLen); hctx.stroke()

        // 5. 歌名与艺术家（纵向舒展、层级清晰）
        const textCenterY = artY + artSize + H * 0.10

        // 歌名：超宽无衬线现代粗体
        hctx.textAlign = 'center'
        hctx.fillStyle = '#ffffff'
        hctx.font = '900 ' + Math.round(H * 0.052) + 'px "Helvetica Neue", "Arial Black", sans-serif'
        const titleText = t.title || 'NO AUDIO DETECTED'
        hctx.fillText(titleText, mcx, textCenterY, colW * 0.88)

        // 艺术家：柔和青灰呼吸色
        hctx.fillStyle = 'rgba(142, 218, 255, 0.75)'
        hctx.font = '600 ' + Math.round(H * 0.032) + 'px "PingFang SC", "Segoe UI", sans-serif'
        const artistText = t.artist ? (t.artist + ' · ' + (t.album || 'SINGLE')) : 'UNKNOWN ARTIST'
        hctx.fillText(artistText, mcx, textCenterY + H * 0.065, colW * 0.88)

        // 6. 底部全息波形与光子共振指示（填补空位，强化全息质感）
        const waveY = bodyY + bodyH * 0.87
        const waveW = colW * 0.65
        const waveX = mcx - waveW / 2

        // 静态全息正弦谐振波线
        hctx.strokeStyle = 'rgba(0, 229, 255, 0.45)'
        hctx.lineWidth = 1.5
        hctx.beginPath()
        for (let wx = 0; wx <= waveW; wx += 4) {
          const wy = Math.sin((wx / waveW) * Math.PI * 4) * 6
          if (wx === 0) hctx.moveTo(waveX + wx, waveY + wy)
          else hctx.lineTo(waveX + wx, waveY + wy)
        }
        hctx.stroke()

        // 两侧全息标尺点
        hctx.fillStyle = '#00e5ff'
        hctx.fillRect(waveX - 8, waveY - 2, 4, 4)
        hctx.fillRect(waveX + waveW + 4, waveY - 2, 4, 4)

        hctx.fillStyle = 'rgba(0, 229, 255, 0.5)'
        hctx.font = '600 ' + Math.round(H * 0.018) + 'px monospace'
        hctx.fillText('PHOTON RESONANCE // STABLE', mcx, waveY + H * 0.042)

        hctx.restore()

        // ==========================================================
        // 【右 1/3】高精度播放列表 (带发光卡片与完整命中区域)
        // ==========================================================
        hctx.save()
        hctx.beginPath(); hctx.rect(col3X, bodyY, colW, bodyH); hctx.clip()

        const listStartX = col3X + colW * 0.06
        const listW = colW * 0.88

        hctx.fillStyle = 'rgba(0, 229, 255, 0.8)'
        hctx.font = '700 ' + Math.round(H * 0.022) + 'px monospace'
        hctx.textAlign = 'left'
        hctx.fillText('03 // AUDIO QUEUE', listStartX, bodyY + H * 0.035)

        const itemH = bodyH * 0.082
        const itemGap = H * 0.007
        const listTop = bodyY + H * 0.062
        const tracksList = (typeof NOVA_TRACKS !== 'undefined') ? NOVA_TRACKS.slice(0, 10) : []

        tracksList.forEach((tr, i) => {
          const itemY = listTop + i * (itemH + itemGap)
          const active = (i === trackIdx)

          if (active) {
            drawTechPanel(hctx, listStartX, itemY, listW, itemH, 4)
            hctx.fillStyle = 'rgba(0, 229, 255, 0.22)'; hctx.fill()
            hctx.strokeStyle = '#00e5ff'; hctx.lineWidth = 1.2; hctx.stroke()

            // Active 发光标记条
            hctx.fillStyle = '#00e5ff'
            hctx.fillRect(listStartX, itemY + 2, 4, itemH - 4)
          } else {
            drawTechPanel(hctx, listStartX, itemY, listW, itemH, 4)
            hctx.fillStyle = 'rgba(0, 229, 255, 0.04)'; hctx.fill()
            hctx.strokeStyle = 'rgba(0, 229, 255, 0.12)'; hctx.stroke()
          }

          // 音轨号
          const padNum = String(i + 1).padStart(2, '0')
          hctx.fillStyle = active ? '#00e5ff' : 'rgba(0, 229, 255, 0.45)'
          hctx.font = '700 ' + Math.round(H * 0.024) + 'px monospace'
          hctx.textAlign = 'left'
          hctx.fillText(padNum, listStartX + 10, itemY + itemH * 0.64)

          // 歌名
          hctx.fillStyle = active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)'
          hctx.font = (active ? '700 ' : '500 ') + Math.round(H * 0.027) + 'px sans-serif'
          const songName = tr.title || 'TRACK'
          hctx.fillText(songName, listStartX + 42, itemY + itemH * 0.64, listW - 90)

          // 状态标记
          hctx.textAlign = 'right'
          hctx.fillStyle = active ? '#00e5ff' : 'rgba(0, 229, 255, 0.25)'
          hctx.font = '600 ' + Math.round(H * 0.020) + 'px monospace'
          hctx.fillText(active ? 'PLAYING' : 'READY', listStartX + listW - 8, itemY + itemH * 0.64)

          // 登记播放列表按钮命中区域
          holoButtons.push({
            name: 'list-' + i,
            x: listStartX,
            y: itemY,
            w: listW,
            h: itemH,
            action: () => {
              if (typeof player !== 'undefined' && player.select) {
                player.select(i)
              }
            }
          })
        })

        hctx.restore()

        // 提交 Three.js 纹理刷新
        holoTex.needsUpdate = true
      }
      // 展开/关闭动画(GSAP)
      let holoOpen = false
      function openHologram() {
        if (holoOpen) return
        holoOpen = true
        applyHoloParams() // 确保位置/尺寸/角度按固化参数(点击打开时也生效)
        drawHologram()
        hologramGroup.visible = true
        gsap.killTweensOf(hologramGroup.scale)
        hologramGroup.scale.set(0.01, 0.01, 0.01)
        gsap.to(hologramGroup.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(1.7)' })
        console.log('[hologram] 全息面板已展开')
      }
      function closeHologram() {
        if (!holoOpen) return
        holoOpen = false
        gsap.killTweensOf(hologramGroup.scale)
        gsap.to(hologramGroup.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.3, ease: 'power2.in', onComplete: () => { hologramGroup.visible = false } })
        console.log('[hologram] 全息面板已收回')
      }
      // 强制刷新静态面板(网页底部按钮/列表点击后: 中控 + 全息重绘一次)
      const refreshPanels = () => {
        if (centerCanvasRef && centerTexRef) {
          const cctx = centerCanvasRef.getContext('2d')
          drawCenterContent(cctx, centerCanvasRef.width, centerCanvasRef.height)
          centerTexRef.needsUpdate = true
        }
        if (holoOpen) drawHologram()
      }
      window.__refreshPanels = refreshPanels // 网页控制条按钮调用
      // Raycaster 点击: 中控屏开关全息; 全息面板 UV 映射点列表; 空白处关闭
      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      const clickHandler = e => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
        raycaster.setFromCamera(pointer, camera)
        // 性能：只对可交互目标（中控屏/全息面板）做相交测试，不再递归 260 个车模 mesh
        const hits = raycaster.intersectObjects([centerScreenMesh, holoPanel].filter(Boolean), false)
        let hitCenter = false, hitHolo = null
        for (const h of hits) {
          if ((h.object.name || '').startsWith('__screen_中控屏')) hitCenter = true
          if (h.object === holoPanel) hitHolo = h
        }
        if (hitCenter) { holoOpen ? closeHologram() : openHologram(); return }
        // 全息面板: UV 映射 → canvas 坐标 → 检测列表项
        if (hitHolo && holoOpen) {
          const uv = hitHolo.uv
          const cx2 = uv.x * holoCanvas.width
          const cy2 = (1 - uv.y) * holoCanvas.height
          for (const btn of holoButtons) {
            if (cx2 >= btn.x && cx2 <= btn.x + btn.w && cy2 >= btn.y && cy2 <= btn.y + btn.h) {
              btn.action()
              refreshPanels()
              return
            }
          }
          return // 点在全息空白处, 不关闭
        }
        if (holoOpen) closeHologram()
      }
      holoClickHandler = clickHandler
      const escHandler = e => { if (e.key === 'Escape') closeHologram() }
      holoEscHandler = escHandler
      // 监听注册统一走 registerWindow()（若组件当前激活；KeepAlive 停用期间等激活时补注册）
      if (componentActive) registerWindow()

      // ===== 静态场景冻结：矩阵只算一次，之后每帧只手动更新相机与全息锚点 =====
      // 车模 538 节点/260 mesh 位置永不变，断开每帧递归矩阵遍历（省 CPU）
      // 相机与全息锚点（GSAP 缩放动画）在 animate 里手动 updateMatrixWorld
      scene.matrixWorldAutoUpdate = false
      scene.updateMatrixWorld(true)

      // 异步预编译 Shader（消除首次渲染的同步编译硬卡顿），完成后再放行海报遮罩淡出
      if (renderer.compileAsync) {
        renderer.compileAsync(scene, camera)
          .then(() => { novaStatus.ready = true })
          .catch(() => { novaStatus.ready = true })
      } else {
        novaStatus.ready = true
      }
    },
    undefined,
    err => {
      console.error('[car] 车模加载失败:', err)
      novaStatus.ready = true // 失败也放行海报，避免遮罩卡死
    }
  )
  } catch (e) {
    console.error('[car] 车模加载同步异常:', e)
  }

  // ===== 加载 HDR 背景 =====
  const loader = new RGBELoader()
  loader.load(
    '/HDR_multi_nebulae_1.hdr', // 背景保持原图（降采样会稀释亮星导致背景发黑）
    tex => {
      tex.mapping = THREE.EquirectangularReflectionMapping
      tex.wrapS = THREE.RepeatWrapping
      tex.repeat.x = 2
      const imgAspect = tex.image.width / tex.image.height
      const newH = (R * Math.PI * 2) / (imgAspect * 2)
      const newGeo = new THREE.CylinderGeometry(R, R, newH, 96, 1, true, 0, Math.PI * 2)
      mesh.geometry.dispose()
      mesh.geometry = newGeo
      mesh.material.map = tex
      // 背景单独提亮：颜色乘数 4.5（HDR 星云本身偏黑，拉高凸显星星/星云亮点）
      mesh.material.color.setRGB(4.5, 4.5, 4.5)
      mesh.material.needsUpdate = true

      // 生成环境贴图（后视镜/金属反射用）：PMREM 处理原始 HDR
      const envTex = tex.clone()
      envTex.needsUpdate = true
      const pmrem = new THREE.PMREMGenerator(renderer)
      const envMap = pmrem.fromEquirectangular(envTex).texture
      scene.environment = envMap
      scene.environmentIntensity = 1.5 // 反射强度
      pmrem.dispose()
      envTex.dispose()
      console.log('[scene] 环境贴图已生成')

      const fov = 2 * Math.atan(newH / 2 / R) * (180 / Math.PI)
      camera.fov = fov
      camera.updateProjectionMatrix()
    },
    undefined,
    err => {
      console.error('[PanoramaSphere] HDR 纹理加载失败:', err)
    }
  )

  // ===== 动画循环：边缘转头（键盘调试已移除）=====
  let lastTime = performance.now()
  const animate = now => {
    if (!rafRunning) return // KeepAlive 停用后不再排队
    rafId = requestAnimationFrame(animate)
    const dt = Math.min((now - lastTime) / 1000, 0.05)
    lastTime = now

    // 边缘转头：左右都能转
    // 右侧：屏幕右 15% → 向右转；左侧：屏幕最左 4%（很窄，避开滚轮条）→ 向左转
    // Three.js: rotation.y 增 = 左转，减 = 右转
    let dirY = 0
    if (mouseX < EDGE_ZONE_L) dirY = 1 // 最左边缘 → 向左转
    else if (mouseX > 1 - EDGE_ZONE_R) dirY = -1 // 右边缘 → 向右转

    if (dirY !== 0) {
      camYaw += dirY * EDGE_SPEED * dt
      camYaw = normalizeAngle(camYaw)
      camYaw = THREE.MathUtils.clamp(camYaw, -LIMIT_Y, LIMIT_Y)
    }

    // 垂直转头：上边缘 → 抬头；下边缘 → 低头
    let dirX = 0
    if (mouseY < EDGE_ZONE_V) dirX = 1 // 上边缘 → 抬头
    else if (mouseY > 1 - EDGE_ZONE_V) dirX = -1 // 下边缘 → 低头
    if (dirX !== 0) {
      camPitch += dirX * EDGE_SPEED * dt
      camPitch = THREE.MathUtils.clamp(camPitch, -LIMIT_X, LIMIT_X)
    }

    // 应用相机朝向
    camera.rotation.y = camYaw
    camera.rotation.x = camPitch

    // 静态场景手动矩阵更新（scene.matrixWorldAutoUpdate = false）
    camera.updateMatrixWorld(true)
    // 提前刷新 matrixWorldInverse：粒子投影必须用【当前帧】相机朝向，
    // 否则用上一帧渲染时的旧矩阵，转头时粒子中心会滞后、跟着视野偏移
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    if (hologramAnchorRef) hologramAnchorRef.updateMatrixWorld(true)

    // 粒子：Lightspeed shader 锚定车面前原点（世界点投影→屏幕中心 + 音乐绑定）
    if (particleMesh) {
      const pb = musicState.currentTrack?.bpm || 120
      const pl = musicState.isPlaying
      // 时间按当前速度累加：变速=平滑加减速，相位连续无跳变（暂停只是减速，不抽动）
      // 搓碟回溯：激活窗口内 iTime 反向累加（流星倒流 1 秒，配合打碟音效）
      if (isScratching()) {
        particleUniforms.iTime.value -= dt * particleUniforms.uSpeed.value * 1.2
      } else {
        particleUniforms.iTime.value += dt * particleUniforms.uSpeed.value
      }
      // BPM→速度：0.05 基础上明显提升（80→0.175，192→0.35，约 2 倍差）——切歌只平滑变速
      particleUniforms.uSpeed.value += ((pl ? 0.05 + (pb / 192) * 0.3 : 0.05) - particleUniforms.uSpeed.value) * 0.05
      // 注：stretch 不再随 BPM 变化——stretch 一改条纹相位会整体滑动，看起来像"往回退"；
      // 光轨长度固定 0.02，"倒退"效果留给搓碟/上一曲功能
      // 播放→亮度：固化 0.85，暂停压暗到 0.45
      particleUniforms.uIntensity.value += ((pl ? 0.85 : 0.45) - particleUniforms.uIntensity.value) * 0.08
      // 世界原点 → 归一化屏幕位置（0~1，与缓冲尺寸/像素比解耦，笔记本大屏一致）
      projV.copy(EMITTER).project(camera)
      if (projV.z > 1 || projV.z < -1) {
        particleUniforms.uCenter.value.set(-5, -5) // 原点在身后 → 推到屏幕外
      } else {
        particleUniforms.uCenter.value.set(projV.x * 0.5 + 0.5, projV.y * 0.5 + 0.5)
      }
    }

renderer.render(scene, camera)

    // 主驾仪表盘动画: 更新状态 + 60fps 实时重绘
    if (dashTexRef && dashCanvasRef) {
      const ds = dashState
      ds.tick++
      const targetBpm = musicState.currentTrack?.bpm || ds.displayBpm
      // BPM 过渡(切歌时平滑变化)
      ds.displayBpm += (targetBpm - ds.displayBpm) * 0.045
      if (Math.abs(targetBpm - ds.displayBpm) < 0.1) ds.displayBpm = targetBpm
      // 轨道高度: 万米级 ±100m 摆动 + BPM 加成
      const bpmBoost = (targetBpm - 120) * 1.5
      ds.altitude = 9000 + bpmBoost + Math.sin(ds.tick * 0.05) * 80 + Math.sin(ds.tick * 0.017 + 1.3) * 20
      // 姿态: 动一会停一会
      const attPhase = ds.tick % 240
      if (attPhase < 150) {
        ds.attitude.pitch = Math.sin(ds.tick * 0.06) * 2.6 + Math.sin(ds.tick * 0.021) * 1.0
        ds.attitude.roll = Math.sin(ds.tick * 0.045 + 1.7) * 1.8 + Math.sin(ds.tick * 0.017) * 0.8
      } else {
        ds.attitude.pitch *= 0.92
        ds.attitude.roll *= 0.92
      }
      ds.energy = 68 + Math.sin(ds.tick * 0.008) * 4 + Math.sin(ds.tick * 0.021) * 2
      ds.volume = musicState.isPlaying ? 0.68 + Math.sin(ds.tick * 0.35) * 0.04 : 0.68
      ds.isPlaying = musicState.isPlaying
      ds.currentTime = musicState.currentTime
      ds.duration = musicState.duration
      ds.modeIndex = Math.floor(ds.tick / 120) % 4
      // 重绘（节流：播放 30fps，暂停 1fps——大幅降低主线程绘制 + 纹理上传带宽）
      if (now - lastDashUpdate >= (musicState.isPlaying ? 33 : 1000)) {
        lastDashUpdate = now
        const dctx = dashCanvasRef.getContext('2d')
        drawMainDashboard(dctx, dashCanvasRef.width, dashCanvasRef.height, ds)
        dashTexRef.needsUpdate = true
      }
    }
    // 中控屏/全息面板为静态: 仅在点击按钮/切歌时由 refreshPanels() 强制刷新
  }
  animateRef = animate
  registerWindow()
  startRaf()

  // 窗口尺寸变化
  resizeHandler = () => {
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    if (particleMesh) {
      particleUniforms.iResolution.value.set(
        w * Math.min(window.devicePixelRatio, 1.5),
        h * Math.min(window.devicePixelRatio, 1.5)
      )
    }
  }
  // resize/mousemove/click/keydown 监听由 registerWindow() 统一注册（KeepAlive 停用时可整体注销）
})

// KeepAlive 缓存：切回流派时恢复渲染与监听
onActivated(() => {
  componentActive = true
  registerWindow()
  startRaf()
})

// KeepAlive 停用：暂停渲染、注销监听，避免后台空转
onDeactivated(() => {
  componentActive = false
  stopRaf()
  unregisterWindow()
})

onBeforeUnmount(() => {
  stopRaf()
  unregisterWindow()
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }
})
</script>

<template>
  <div class="panorama-wrap">
    <div ref="mountEl" class="panorama"></div>
  </div>
</template>

<style scoped>
.panorama-wrap {
  position: relative;
  width: 100%;
  height: 100%;
}

.panorama {
  width: 100%;
  height: 100%;
}

/* （粒子调试面板已移除，数值已固化） */

</style>
