// 把 dashState + drawMainDashboard 从 GLB 回调内提升到模块级（修复每帧 ReferenceError）
import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')

const startMarker = '      // 主驾仪表盘动态状态(动画循环驱动, 绘制函数只读)'
const sIdx = src.indexOf(startMarker)
if (sIdx < 0) { console.error('找不到起始标记'); process.exit(1) }

const fnMarker = 'function drawMainDashboard(ctx, w, h, st) {'
const fIdx = src.indexOf(fnMarker, sIdx)
if (fIdx < 0) { console.error('找不到 drawMainDashboard'); process.exit(1) }
const openIdx = src.indexOf('{', fIdx)

let depth = 0, endIdx = -1
for (let i = openIdx; i < src.length; i++) {
  if (src[i] === '{') depth++
  else if (src[i] === '}') { depth--; if (depth === 0) { endIdx = i + 1; break } }
}
if (endIdx < 0) { console.error('括号不配平'); process.exit(1) }

const block = src.slice(sIdx, endIdx)
src = src.slice(0, sIdx) + src.slice(endIdx)

const insertMarker = '\n// 鼠标移动（边缘转头用）'
const insIdx = src.indexOf(insertMarker)
if (insIdx < 0) { console.error('找不到插入点'); process.exit(1) }

const moduleBlock =
  '// ===== 主驾仪表动态状态 + 绘制函数（模块级：动画循环与 GLB 回调共用，避免作用域问题）=====\n' +
  'let dashState = {\n' +
  '  displayBpm: musicState.currentTrack?.bpm || 192, altitude: 9342, attitude: { pitch: 0, roll: 0 },\n' +
  '  energy: 68, volume: musicState.volume || 0.68, tick: 0, isPlaying: false, currentTime: 0, duration: 0, modeIndex: 0,\n' +
  '}\n' +
  block.replace(/^      /gm, '').replace('const dashState', 'let dashState') +
  '\n'

src = src.slice(0, insIdx) + moduleBlock + src.slice(insIdx)
fs.writeFileSync(file, src)
console.log('完成：dashState + drawMainDashboard 已提升到模块级')