// color-scan.mjs — 分析贴图区域的颜色构成(判断是否屏幕 UI)
// 用法: node scripts/color-scan.mjs <png> <u0> <v0> <u1> <v1>
import fs from 'fs'
import zlib from 'zlib'

function decodePNG(b) {
  let pos = 8, width = 0, height = 0, colorType = 0
  const idat = []
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos), type = b.toString('ascii', pos + 4, pos + 8)
    const data = b.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9] }
    else if (type === 'IDAT') idat.push(data)
    pos += 12 + len
  }
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0
  const stride = width * bpp
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const out = Buffer.alloc(height * stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    const line = out.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= bpp ? prev[x - bpp] : 0
      let v = raw[rp++]
      if (filter === 1) v = (v + a) & 255
      else if (filter === 2) v = (v + b) & 255
      else if (filter === 3) v = (v + ((a + b) >> 1)) & 255
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
        const pr = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        v = (v + pr) & 255
      }
      line[x] = v
    }
  }
  return { width, height, bpp, data: out }
}

const png = decodePNG(fs.readFileSync(process.argv[2]))
const { width: W, height: H, bpp, data } = png
const u0 = parseFloat(process.argv[3]), v0 = parseFloat(process.argv[4])
const u1 = parseFloat(process.argv[5]), v1 = parseFloat(process.argv[6])
const x0 = Math.floor(u0 * W), x1 = Math.floor(u1 * W)
const y0 = Math.floor(v0 * H), y1 = Math.floor(v1 * H)
console.log(`区域 u[${u0},${u1}] v[${v0},${v1}] 像素 ${(x1-x0)}x${(y1-y0)}`)
let stats = { r: 0, g: 0, b: 0, n: 0, bright: 0, dark: 0, cyan: 0, red: 0, white: 0, saturated: 0, hueSum: 0, hueN: 0 }
for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
  const o = (y * W + x) * bpp
  const r = data[o], g = data[o+1], b = data[o+2]
  stats.r += r; stats.g += g; stats.b += b; stats.n++
  const l = (r + g + b) / 3
  if (l > 150) stats.bright++
  if (l < 40) stats.dark++
  if (b > 150 && g > 120 && r < 120) stats.cyan++
  if (r > 150 && g < 100 && b < 100) stats.red++
  if (r > 180 && g > 180 && b > 180) stats.white++
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  if (mx - mn > 60) { stats.saturated++; if (mx === r) stats.hueSum += 0; else if (mx === g) stats.hueSum += 120; else stats.hueSum += 240; stats.hueN++ }
}
const n = stats.n
console.log(`平均 RGB(${(stats.r/n)|0}, ${(stats.g/n)|0}, ${(stats.b/n)|0})`)
console.log(`亮px ${stats.bright} (${(stats.bright/n*100).toFixed(1)}%)  暗px ${stats.dark} (${(stats.dark/n*100).toFixed(1)}%)  饱和色 ${stats.saturated} (${(stats.saturated/n*100).toFixed(1)}%)`)
console.log(`青色 ${stats.cyan} 红色 ${stats.red} 白色 ${stats.white}`)
