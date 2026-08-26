// tex-ascii.mjs — 输出贴图任意区域的 ASCII 亮度图
// 用法: node scripts/tex-ascii.mjs <png> <u0> <v0> <u1> <v1> [cols] [rows]
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
const cols = parseInt(process.argv[7] || '120'), rows = parseInt(process.argv[8] || '36')
const lum = (x, y) => { const o = (y * W + x) * bpp; return (data[o] + data[o+1] + data[o+2]) / 3 }
console.log(`贴图 ${W}x${H}  区域 u[${u0},${u1}] v[${v0},${v1}]  (${cols}x${rows})`)
console.log('(*=亮>110, :=灰>40, .=黑)')
for (let r = 0; r < rows; r++) {
  let line = ''
  for (let c = 0; c < cols; c++) {
    const sx = Math.floor((u0 + c / cols * (u1 - u0)) * W)
    const sy = Math.floor((v0 + r / rows * (v1 - v0)) * H)
    const l = lum(sx, sy)
    line += l > 110 ? '*' : l > 40 ? ':' : '.'
  }
  console.log(line)
}
