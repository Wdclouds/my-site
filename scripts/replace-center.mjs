// 用 center-v3.txt 替换 PanoramaSphere 里的 drawRoundedRect + drawCenterContent
import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')
const newBlock = fs.readFileSync('scripts/center-v3.txt', 'utf8')

// 1) 删除旧 drawRoundedRect（注释 + 函数）
const rrStart = src.indexOf('      // 辅助：圆角矩形路径')
if (rrStart < 0) { console.error('找不到 drawRoundedRect 注释'); process.exit(1) }
const rrFn = src.indexOf('function drawRoundedRect', rrStart)
const rrOpen = src.indexOf('{', rrFn)
let depth = 0, rrEnd = -1
for (let i = rrOpen; i < src.length; i++) {
  if (src[i] === '{') depth++
  else if (src[i] === '}') { depth--; if (depth === 0) { rrEnd = i + 1; break } }
}
if (rrEnd < 0) { console.error('drawRoundedRect 括号不配平'); process.exit(1) }
src = src.slice(0, rrStart) + src.slice(rrEnd)

// 2) 替换 drawCenterContent 函数体
const dcStart = src.indexOf('      function drawCenterContent(ctx, w, h) {')
if (dcStart < 0) { console.error('找不到 drawCenterContent'); process.exit(1) }
const dcOpen = src.indexOf('{', dcStart)
depth = 0; let dcEnd = -1
for (let i = dcOpen; i < src.length; i++) {
  if (src[i] === '{') depth++
  else if (src[i] === '}') { depth--; if (depth === 0) { dcEnd = i + 1; break } }
}
if (dcEnd < 0) { console.error('drawCenterContent 括号不配平'); process.exit(1) }
src = src.slice(0, dcStart) + newBlock + src.slice(dcEnd)

fs.writeFileSync(file, src)
console.log('完成：drawRoundedRect 已删，drawCenterContent 已替换为机载 HUD 版')