// crop-png.mjs — 裁剪贴图区域存 PNG + 输出 ASCII 亮度图
// 用法: node scripts/crop-png.mjs <png> <outDir>
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

function encodePNG(w, h, rgbBuf) {
  const stride = w * 3
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0 // filter None
    rgbBuf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const idat = zlib.deflateSync(raw)
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0)
    return Buffer.concat([len, td, crc])
  }
  function crc32(buf) {
    let c, table = []
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 }
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const png = decodePNG(fs.readFileSync(process.argv[2]))
const outDir = process.argv[3] || 'scripts/tex'
const { width: W, height: H, bpp, data } = png
const px = (x, y) => { const o = (y * W + x) * bpp; return [data[o], data[o + 1], data[o + 2]] }
const lum = (x, y) => { const [r, g, b] = px(x, y); return (r + g + b) / 3 }

// 裁剪并保存 PNG
function crop(u0, v0, u1, v1, scale, name) {
  const x0 = Math.floor(u0 * W), y0 = Math.floor(v0 * H), x1 = Math.floor(u1 * W), y1 = Math.floor(v1 * H)
  const cw = x1 - x0, ch = y1 - y0
  const sw = Math.max(1, Math.round(cw * scale)), sh = Math.max(1, Math.round(ch * scale))
  const buf = Buffer.alloc(sw * sh * 3)
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const sx = Math.min(x0 + Math.floor(x / scale), W - 1), sy = Math.min(y0 + Math.floor(y / scale), H - 1)
    const [r, g, b] = px(sx, sy)
    const o = (y * sw + x) * 3
    buf[o] = r; buf[o + 1] = g; buf[o + 2] = b
  }
  fs.writeFileSync(`${outDir}/crop_${name}.png`, encodePNG(sw, sh, buf))
  console.log(`crop_${name}.png ${sw}x${sh}  (区域 u[${u0},${u1}] v[${v0},${v1}])`)
}

// ASCII 亮度图
function ascii(u0, v0, u1, v1, cols, rows, name) {
  const x0 = Math.floor(u0 * W), y0 = Math.floor(v0 * H), x1 = Math.floor(u1 * W), y1 = Math.floor(v1 * H)
  const ramp = ' .:-=+*#%@'
  let out = `--- ${name} u[${u0},${u1}] v[${v0},${v1}] ---\n`
  for (let r = 0; r < rows; r++) {
    let line = ''
    for (let c = 0; c < cols; c++) {
      const sx = Math.min(x0 + Math.floor((c + 0.5) / cols * (x1 - x0)), W - 1)
      const sy = Math.min(y0 + Math.floor((r + 0.5) / rows * (y1 - y0)), H - 1)
      const l = lum(sx, sy)
      line += ramp[Math.min(9, Math.floor(l / 25.6))]
    }
    out += line + '\n'
  }
  console.log(out)
}

// 主驾屏区域 (u 0.27-0.55, v 0.10-0.40)
crop(0.25, 0.10, 0.56, 0.40, 2, 'main_screen')
ascii(0.27, 0.10, 0.55, 0.40, 90, 30, '主驾屏区域')

// 副驾区域 (u 0.33-0.55, v 0.35-0.55)
crop(0.33, 0.35, 0.55, 0.55, 2, 'passenger')
ascii(0.33, 0.35, 0.55, 0.55, 90, 26, '副驾区域')

// 右侧窄条区 (u 0.55-1.0, v 0.0-0.50)
crop(0.55, 0.0, 1.0, 0.50, 2, 'right_strips')
ascii(0.55, 0.0, 1.0, 0.50, 100, 34, '右侧窄条区')

// 全图缩略
crop(0, 0, 1, 1, 0.25, 'full')
ascii(0, 0, 1, 1, 100, 40, '全图')
