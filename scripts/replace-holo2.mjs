// 用 holo-v3.txt 替换 PanoramaSphere 里的当前 drawHologram
import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')
const newBlock = fs.readFileSync('scripts/holo-v3.txt', 'utf8')

const start = src.indexOf('      const drawHologram = () => {')
if (start < 0) { console.error('找不到 drawHologram'); process.exit(1) }
const open = src.indexOf('{', start)
let depth = 0, end = -1
for (let i = open; i < src.length; i++) {
  if (src[i] === '{') depth++
  else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
}
if (end < 0) { console.error('括号不配平'); process.exit(1) }
src = src.slice(0, start) + newBlock + src.slice(end)
fs.writeFileSync(file, src)
console.log('完成：drawHologram 已替换为纯净全息光子版 V2')