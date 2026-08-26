// gen-panel-png.mjs — 生成主驾面板(Object_88 块#1)顶点图 PNG, 供人工确认 3 个码表位置
// 用法: node scripts/gen-panel-png.mjs
import fs from 'fs'
import zlib from 'zlib'

const buf = fs.readFileSync('public/lamborghini_revuelto.glb')
let gltf = null, bin = null
let offset = 12
while (offset + 8 <= buf.length) {
  const len = buf.readUInt32LE(offset)
  const type = buf.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(buf.subarray(offset + 8, offset + 8 + len).toString('utf8'))
  if (type === 0x004e4942) bin = buf.subarray(offset + 8, offset + 8 + len)
  offset += 8 + len
}
const nodes = gltf.nodes || [], meshes = gltf.meshes || [], accessors = gltf.accessors || [], bufferViews = gltf.bufferViews || []
function mat4Mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c*4+r] = a[0*4+r]*b[c*4+0] + a[1*4+r]*b[c*4+1] + a[2*4+r]*b[c*4+2] + a[3*4+r]*b[c*4+3]; return o }
function quatToMat4(q) { const [x,y,z,w] = q, x2=x+x, y2=y+y, z2=z+z, xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2, wx=w*x2, wy=w*y2, wz=w*z2; return [1-(yy+zz), xy+wz, xz-wy, 0, xy-wz, 1-(xx+zz), yz+wx, 0, xz+wy, yz-wx, 1-(xx+yy), 0, 0,0,0,1] }
function scaleMat(s) { return [s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1] }
function transMat(t) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1] }
function tp(m, p) { return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]] }
const nodeMats = new Array(nodes.length).fill(null)
function wm(i) { if (nodeMats[i]) return nodeMats[i]; const n = nodes[i]; let l; if (n.matrix) l = n.matrix.slice(); else { const t = n.translation||[0,0,0], r = n.rotation||[0,0,0,1], s = n.scale||[1,1,1]; l = mat4Mul(mat4Mul(transMat(t), quatToMat4(r)), scaleMat(s)) } let m = l; if (n.parent !== undefined) m = mat4Mul(wm(n.parent), l); nodeMats[i] = m; return m }
nodes.forEach((n, i) => { n.index = i; (n.children || []).forEach(c => nodes[c].parent = i) })
function readA(acc) { if (!acc || acc.bufferView === undefined) return null; const bv = bufferViews[acc.bufferView], bo = (bv.byteOffset||0)+(acc.byteOffset||0), comps = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[acc.type]||3, st = bv.byteStride||comps*4, out = []; for (let i = 0; i < acc.count; i++) { const off = bo+i*st, el = []; for (let j = 0; j < comps; j++) el.push(bin.readFloatLE(off+j*4)); out.push(el) } return out }
let o88 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_88') o88 = { node: n, idx: i } })
const m = wm(o88.idx)
const lp = readA(accessors[meshes[o88.node.mesh].primitives[0].attributes.POSITION])
const pts = lp.map(p => tp(m, p)).filter(p => p[0] > -0.42 && p[0] < -0.32)

// ---- PNG 编码器 (RGB8, filter 0) ----
function encodePNG(w, h, rgbBuf) {
  const stride = w * 3
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgbBuf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride) }
  const idat = zlib.deflateSync(raw)
  function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0); return Buffer.concat([len, td, crc]) }
  function crc32(buf) { let c, table = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0 } let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0 }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// ---- 绘图 ----
const S = 900 // 画布 900x900
const X0 = -0.420, X1 = -0.322, Y0 = 0.250, Y1 = 0.352 // 世界范围
const img = Buffer.alloc(S * S * 3)
const setPix = (x, y, r, g, b) => { if (x >= 0 && x < S && y >= 0 && y < S) { const o = (y * S + x) * 3; img[o] = r; img[o+1] = g; img[o+2] = b } }
const wx = wx_ => Math.round((wx_ - X0) / (X1 - X0) * (S - 1))
const wy = wy_ => Math.round((Y1 - wy_) / (Y1 - Y0) * (S - 1))
// 背景
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) setPix(x, y, 12, 14, 20)
// 网格线
for (let gx = 0; gx <= 10; gx++) { const x = wx(X0 + gx / 10 * (X1 - X0)); for (let y = 0; y < S; y++) setPix(x, y, 30, 34, 44) }
for (let gy = 0; gy <= 10; gy++) { const y = wy(Y0 + gy / 10 * (Y1 - Y0)); for (let x = 0; x < S; x++) setPix(x, y, 30, 34, 44) }
// 顶点: 外框=黄, 内部=青
for (const p of pts) {
  const x = wx(p[0]), y = wy(p[1])
  const isFrame = p[0] < -0.410 || p[0] > -0.330 || p[1] < 0.266 || p[1] > 0.344
  const col = isFrame ? [255, 220, 60] : [80, 240, 255]
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) setPix(x + dx, y + dy, col[0], col[1], col[2])
}
// 发光件位置(红点)
nodes.forEach((n, i) => {
  if (!/^Object_(10|14|18|22|26|30|34|38)$/.test(n.name || '') || n.mesh === undefined) return
  const w2 = wm(i), lp2 = readA(accessors[meshes[n.mesh].primitives[0].attributes.POSITION])
  for (const p of lp2) { const q = tp(w2, p); if (q[0] > -0.42 && q[0] < -0.32) { const x = wx(q[0]), y = wy(q[1]); for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) setPix(x + dx, y + dy, 255, 60, 60) } }
})
fs.writeFileSync('scripts/tex/panel_block1.png', encodePNG(S, S, img))
console.log('已生成 scripts/tex/panel_block1.png (' + S + 'x' + S + '), 黄色=外框 青色=内部 红色=发光件')
