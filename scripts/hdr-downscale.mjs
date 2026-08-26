// HDR 降采样 v2：最大池化（保留亮星峰值，不稀释）
import fs from 'fs'
import { FloatType } from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'

const SRC = 'public/HDR_multi_nebulae_1.hdr'
const DST = 'public/HDR_multi_nebulae_1_2k.hdr'
const TW = 2048, TH = 1024

const loader = new HDRLoader()
loader.setDataType(FloatType)
const tex = loader.parse(fs.readFileSync(SRC))
const w0 = tex.width, h0 = tex.height
const src = tex.data
console.log('源: ' + w0 + 'x' + h0)

// ---- 最大池化降采样（每输出像素取覆盖源区域内亮度最大的那个像素的 RGB）----
const dst = new Float32Array(TW * TH * 4)
for (let y = 0; y < TH; y++) {
  const ys0 = Math.floor(y * h0 / TH), ys1 = Math.min(h0 - 1, Math.floor((y + 1) * h0 / TH))
  for (let x = 0; x < TW; x++) {
    const xs0 = Math.floor(x * w0 / TW), xs1 = Math.min(w0 - 1, Math.floor((x + 1) * w0 / TW))
    let bestL = -1, bestO = 0
    for (let sy = ys0; sy <= ys1; sy++) {
      for (let sx = xs0; sx <= xs1; sx++) {
        const o = (sy * w0 + sx) * 4
        const l = Math.max(src[o], src[o + 1], src[o + 2])
        if (l > bestL) { bestL = l; bestO = o }
      }
    }
    const od = (y * TW + x) * 4
    dst[od] = src[bestO]; dst[od + 1] = src[bestO + 1]; dst[od + 2] = src[bestO + 2]; dst[od + 3] = 1
  }
}

function floatToRGBE(r, g, b) {
  const v = Math.max(r, g, b)
  if (v < 1e-32) return [0, 0, 0, 0]
  const e = Math.ceil(Math.log2(v))
  const s = Math.pow(2, e - 8)
  return [Math.min(255, Math.floor(r / s)), Math.min(255, Math.floor(g / s)), Math.min(255, Math.floor(b / s)), e + 128]
}

function encodeScanline(rgba, width) {
  const out = []
  out.push(2, 2, (width >> 8) & 0xff, width & 0xff)
  for (let ch = 0; ch < 4; ch++) {
    let i = 0
    while (i < width) {
      const b = rgba[i * 4 + ch]
      let run = 1
      while (i + run < width && rgba[(i + run) * 4 + ch] === b && run < 127) run++
      if (run >= 4) { out.push(128 + run, b); i += run }
      else {
        const lit = []
        while (lit.length < 128 && i < width) {
          const b2 = rgba[i * 4 + ch]
          let r2 = 1
          while (i + r2 < width && rgba[(i + r2) * 4 + ch] === b2 && r2 < 127) r2++
          if (r2 >= 4 && lit.length > 0) break
          lit.push(b2)
          i++
        }
        out.push(lit.length)
        for (const v of lit) out.push(v)
      }
    }
  }
  return out
}

const rgba = new Uint8Array(TW * TH * 4)
for (let p = 0; p < TW * TH; p++) {
  const [R, G, B, E] = floatToRGBE(dst[p * 4], dst[p * 4 + 1], dst[p * 4 + 2])
  rgba[p * 4] = R; rgba[p * 4 + 1] = G; rgba[p * 4 + 2] = B; rgba[p * 4 + 3] = E
}
const parts = ['#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ' + TH + ' +X ' + TW + '\n']
for (let y = 0; y < TH; y++) {
  const line = encodeScanline(rgba, TW)
  parts.push(Buffer.from(line))
}
fs.writeFileSync(DST, Buffer.concat(parts.map(c => Buffer.isBuffer(c) ? c : Buffer.from(c, 'utf8'))))
console.log('已写出: ' + DST + '  (' + (fs.statSync(DST).size / 1048576).toFixed(2) + 'MB, ' + TW + 'x' + TH + ')')

// ---- 验证：重解码 + 亮度分布 ----
const t2 = new HDRLoader().setDataType(FloatType).parse(fs.readFileSync(DST))
const d2 = t2.data, n = TW * TH
const lum = new Float32Array(n)
let sum = 0, max = 0
for (let p = 0; p < n; p++) {
  const l = Math.max(d2[p*4], d2[p*4+1], d2[p*4+2])
  lum[p] = l; sum += l; if (l > max) max = l
}
lum.sort((a, b) => b - a)
console.log('验证重解码: ' + t2.width + 'x' + t2.height + '  平均=' + (sum/n).toFixed(5) + '  P99.9=' + lum[Math.floor(n*0.001)].toFixed(3) + '  MAX=' + max.toFixed(2))