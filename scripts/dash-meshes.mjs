// dash-meshes.mjs — 列出主驾仪表台区域(x<-0.1, y 0.1~0.5, z<-0.3)的所有 mesh 及顶点形状
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

console.log('===== 主驾仪表台区域 mesh (x<-0.1, y 0.1~0.5, z<-0.3) =====')
const rows = []
nodes.forEach((n, i) => {
  if (n.mesh === undefined) return
  const m = wm(i)
  const prim = meshes[n.mesh].primitives[0]
  const posAcc = accessors[prim.attributes.POSITION]
  const lp = readA(posAcc)
  const wp = lp.map(p => tp(m, p))
  const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9]
  for (const p of wp) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],p[k]); mx[k]=Math.max(mx[k],p[k]) }
  const c = [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2]
  if (c[0] < -0.1 && c[1] > 0.1 && c[1] < 0.5 && c[2] < -0.3) {
    const matName = (gltf.materials[prim.material] && gltf.materials[prim.material].name) || 'mat#' + prim.material
    rows.push({ name: n.name || 'node#' + i, mat: matName, c, sz: [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]], verts: lp.length })
  }
})
rows.sort((a, b) => a.c[0] - b.c[0])
for (const r of rows) {
  console.log(
    (r.name).padEnd(14) + ' | ' + r.mat.slice(0, 26).padEnd(26) +
    ' | 中心(' + r.c.map(x => x.toFixed(3)).join(', ') + ')' +
    ' | 尺寸(' + r.sz.map(x => x.toFixed(3)).join(', ') + ')' +
    ' | 顶点' + r.verts
  )
}
