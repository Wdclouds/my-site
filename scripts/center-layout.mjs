// center-layout.mjs — 中央中控区域布局图: 找中控屏
// 正视 x-y + 侧视 z-y, 标记所有 mesh 顶点
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

// 收集中央区域 (|x|<0.35) 的 mesh 顶点, 按名字分类
const groups = {}
nodes.forEach((n, i) => {
  if (n.mesh === undefined) return
  const name = n.name || ('node' + i)
  const m = wm(i)
  const lp = readA(accessors[meshes[n.mesh].primitives[0].attributes.POSITION])
  const wp = lp.map(p => tp(m, p))
  const c = [0,0,0]
  for (const p of wp) for (let k=0;k<3;k++) c[k]+=p[k]/wp.length
  if (Math.abs(c[0]) > 0.35 || c[1] < 0.05 || c[1] > 0.5) return
  const key = name === 'Object_85' ? '85' : name === 'Object_88' ? '88' : name === 'Object_73' ? '73' : name === 'Object_81' ? '81' : /^Object_8$|^Object_12$|^Object_16$/.test(name) ? 'GLOW' : name === 'Object_65' ? '65' : '.'
  groups[key] = groups[key] || []
  groups[key].push(...wp)
})

function plot(title, getXY, xr, yr, w, h) {
  const [x0, x1] = xr, [y0, y1] = yr
  const grid = Array.from({ length: h }, () => Array(w).fill(' '))
  const put = (p, ch) => {
    const [px, py] = getXY(p)
    const cx = Math.round((px - x0) / (x1 - x0) * (w - 1))
    const cy = Math.round((y1 - py) / (y1 - y0) * (h - 1))
    if (cx >= 0 && cx < w && cy >= 0 && cy < h && grid[cy][cx] === ' ') grid[cy][cx] = ch
  }
  const order = ['.', '81', '73', '88', '85', '65', 'GLOW']
  for (const key of order) if (groups[key]) groups[key].forEach(p => put(p, key === 'GLOW' ? 'G' : key === '85' ? 'o' : key === '88' ? '+' : key === '73' ? 'V' : key === '81' ? '=' : key === '65' ? '^' : '.'))
  console.log(`\n=== ${title} === [o=85中段, +=88, V=73, ==81, G=发光件, ^=65]`)
  grid.forEach((row, r) => { const yv = y1 - (r + 0.5) / h * (y1 - y0); console.log(row.join('') + ' ' + yv.toFixed(2)) })
}
plot('中央区域正视 x-y', p => [p[0], p[1]], [-0.35, 0.35], [0.05, 0.50], 110, 36)
plot('中央区域侧视 z-y', p => [p[2], p[1]], [-1.0, 0.0], [0.05, 0.50], 110, 36)
