// layout-plot.mjs — 世界坐标 ASCII 布局图:Object_85 顶点 + 发光件 + 屏幕亮区
import fs from 'fs'

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

// 收集 Object_85 顶点(世界),发光件,Object_88
const marks = { o85: [], glow: [], obj88: [] }
nodes.forEach((n, i) => {
  if (n.mesh === undefined) return
  const name = n.name || ''
  const m = wm(i)
  const pa = accessors[meshes[n.mesh].primitives[0].attributes.POSITION]
  const lp = readA(pa)
  const wp = lp.map(p => tp(m, p))
  if (name === 'Object_85') marks.o85 = wp
  else if (/^Object_(8|10|12|14|16|18|20|22|24|26|28|30|32|34|36|38)$/.test(name)) marks.glow.push(...wp)
  else if (name === 'Object_88') marks.obj88 = wp
})

// 布局图: 正视车内 (x 水平, y 垂直), 范围 x[-0.6,0.6] y[0.1,0.5]
function plot(title, xr, yr, w, h) {
  const [x0, x1] = xr, [y0, y1] = yr
  const grid = Array.from({ length: h }, () => Array(w).fill(' '))
  const put = (x, y, ch) => {
    const cx = Math.round((x - x0) / (x1 - x0) * (w - 1))
    const cy = Math.round((y1 - y) / (y1 - y0) * (h - 1))
    if (cx >= 0 && cx < w && cy >= 0 && cy < h) grid[cy][cx] = ch
  }
  marks.o85.forEach(p => put(p[0], p[1], '.'))
  marks.glow.forEach(p => put(p[0], p[1], 'G'))
  marks.obj88.forEach(p => put(p[0], p[1], '+'))
  console.log(`\n=== ${title} ===`)
  console.log('y↓  x→' + ' '.repeat(w - 4) + `x: ${x0}~${x1}`)
  grid.forEach((row, r) => {
    const yv = y1 - (r + 0.5) / h * (y1 - y0)
    console.log(row.join('') + `  ${yv.toFixed(2)}`)
  })
  console.log(`y: ${y0}~${y1}`)
}
plot('仪表台正视 (x-y) [o85=., 发光件=G, obj88=+]', [-0.6, 0.6], [0.10, 0.50], 110, 34)
// 侧视图 z-y (x≈0 附近)
console.log('\n=== 侧视 (z-y) Object_85 顶点(x<0 主驾侧为蓝) ===')
{
  const xr = [-0.9, -0.1], yr = [0.10, 0.45]
  const w = 90, h = 28
  const grid = Array.from({ length: h }, () => Array(w).fill(' '))
  const put = (x, y, ch) => { const cx = Math.round((x - xr[0]) / (xr[1] - xr[0]) * (w - 1)), cy = Math.round((yr[1] - y) / (yr[1] - yr[0]) * (h - 1)); if (cx >= 0 && cx < w && cy >= 0 && cy < h) grid[cy][cx] = ch }
  marks.o85.filter(p => p[0] < -0.1).forEach(p => put(p[2], p[1], '.'))
  marks.glow.filter(p => p[0] < -0.1).forEach(p => put(p[2], p[1], 'G'))
  marks.obj88.filter(p => p[0] < -0.1).forEach(p => put(p[2], p[1], '+'))
  grid.forEach((row, r) => console.log(row.join('') + `  z=${(xr[1] - (r + 0.5) / h * (xr[1] - xr[0])).toFixed(2)}`))
  console.log(`主驾侧侧视: z ${xr[0]}~${xr[1]}, y ${yr[0]}~${yr[1]}`)
}
