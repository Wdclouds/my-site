// gauge-scan.mjs — 检测主驾贴图区域里的圆形码表(亮度连通域 + 圆形横截面分析)
// 用法: node scripts/gauge-scan.mjs scripts/tex/script_rt_dials_race.001_2.png
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
const W = png.width, H = png.height, bpp = png.bpp, data = png.data
const lum = (x, y) => { const o = (y * W + x) * bpp; return (data[o] + data[o+1] + data[o+2]) / 3 }

// 主驾区域: u 0.15~0.60, v(贴图 y) 0.05~0.45
const U0 = 0.15, U1 = 0.60, V0 = 0.05, V1 = 0.45
const x0 = Math.floor(U0 * W), x1 = Math.floor(U1 * W)
const y0 = Math.floor(V0 * H), y1 = Math.floor(V1 * H)

// 阈值亮区连通域(2px 采样)
const THRESH = 120
const cw = x1 - x0, ch = y1 - y0
const mask = new Uint8Array(cw * ch)
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
  mask[y * cw + x] = lum(x0 + x, y0 + y) > THRESH ? 1 : 0
}
const visited = new Uint8Array(cw * ch)
const comps = []
for (let y = 0; y < ch; y += 2) for (let x = 0; x < cw; x += 2) {
  if (!mask[y * cw + x] || visited[y * cw + x]) continue
  const q = [[x, y]]
  visited[y * cw + x] = 1
  let minX = x, maxX = x, minY = y, maxY = y, cnt = 0
  while (q.length) {
    const [cx, cy] = q.pop()
    cnt++
    if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
    if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
    for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) {
      const nx = cx + dx, ny = cy + dy
      if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue
      if (mask[ny * cw + nx] && !visited[ny * cw + nx]) { visited[ny * cw + nx] = 1; q.push([nx, ny]) }
    }
  }
  comps.push({ minX, maxX, minY, maxY, cnt })
}
console.log(`主驾区域 u[${U0},${U1}] v[${V0},${V1}]  贴图 ${W}x${H}  连通域 ${comps.length} 个(面积>400):`)
comps.filter(c => c.cnt > 400).sort((a, b) => b.cnt - a.cnt).forEach((c, i) => {
  const u0 = (x0 + c.minX) / W, u1 = (x0 + c.maxX) / W
  const v0 = (y0 + c.minY) / H, v1 = (y0 + c.maxY) / H
  const bw = u1 - u0, bh = v1 - v0
  // 圆形度: 每行宽度变化
  // 采样行宽度(圆形: 中间宽, 两端窄)
  const rows = []
  for (let yy = c.minY; yy <= c.maxY; yy += 8) {
    let wrow = 0
    for (let xx = c.minX; xx <= c.maxX; xx++) if (mask[yy * cw + xx]) { wrow++; }
    rows.push(wrow)
  }
  const midW = rows[Math.floor(rows.length / 2)] || 0
  const edgeW = Math.max(rows[0] || 0, rows[rows.length - 1] || 0)
  const roundness = rows.length > 4 ? edgeW / Math.max(midW, 1) : 1 // 0=矩形 1=圆形(端点收窄)
  const aspect = bw / Math.max(bh, 1e-6)
  console.log(`  #${i}: UV x[${u0.toFixed(3)},${u1.toFixed(3)}] y[${v0.toFixed(3)},${v1.toFixed(3)}] 宽${bw.toFixed(3)}×高${bh.toFixed(3)} 面积${c.cnt} 横宽比${aspect.toFixed(2)} 圆度(端/中)${roundness.toFixed(2)}`)
})

// ASCII 图帮助理解形状
console.log('\n=== 主驾区域 ASCII(120x30, .=暗 *=亮) ===')
for (let r = 0; r < 30; r++) {
  let line = ''
  for (let c = 0; c < 120; c++) {
    const sx = x0 + Math.floor((c + 0.5) / 120 * (x1 - x0))
    const sy = y0 + Math.floor((r + 0.5) / 30 * (y1 - y0))
    const l = lum(sx, sy)
    line += l > 140 ? '*' : l > 60 ? ':' : '.'
  }
  console.log(line)
}
