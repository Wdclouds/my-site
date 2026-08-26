// center-fit.mjs — 中控屏定位: Object_85 中段平面拟合 + 贴图亮区映射
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

// Object_85 中段(顶点 0-55)
let o85 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_85') o85 = { node: n, idx: i } })
const w85 = wm(o85.idx)
const prim = meshes[o85.node.mesh].primitives[0]
const lp = readA(accessors[prim.attributes.POSITION])
const uvs = readA(accessors[prim.attributes.TEXCOORD_0])
const pts = lp.map(p => tp(w85, p))
const mid = pts.slice(0, 56).map((p, i) => ({ p, uv: uvs[i] }))

// 仿射拟合(特征 v = 1 - gltf_v)
function fit(verts) {
  const ATA = [[0,0,0],[0,0,0],[0,0,0]], ATp = [[0,0,0],[0,0,0],[0,0,0]]
  for (const { p, uv } of verts) {
    const u = uv[0], v = 1 - uv[1], row = [u, v, 1]
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ATA[r][c] += row[r] * row[c]
    for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) ATp[k][r] += row[r] * p[k]
  }
  function solve(A, b) {
    const M = A.map((row, i) => [...row, b[i]])
    for (let col = 0; col < 3; col++) {
      let piv = col
      for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
      if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]]
      for (let r = 0; r < 3; r++) { if (r === col) continue; const f = M[r][col] / M[col][col]; for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c] }
    }
    return [M[0][3]/M[0][0], M[1][3]/M[1][1], M[2][3]/M[2][2]]
  }
  const M = []
  for (let k = 0; k < 3; k++) M.push(solve(ATA, ATp[k]))
  let err = 0
  for (const { p, uv } of verts) {
    const u = uv[0], v = 1 - uv[1]
    const q = [M[0][0]*u+M[0][1]*v+M[0][2], M[1][0]*u+M[1][1]*v+M[1][2], M[2][0]*u+M[2][1]*v+M[2][2]]
    err += (q[0]-p[0])**2 + (q[1]-p[1])**2 + (q[2]-p[2])**2
  }
  return { M, rms: Math.sqrt(err / verts.length) }
}
const mapUV = (M, u, v) => [M[0][0]*u+M[0][1]*v+M[0][2], M[1][0]*u+M[1][1]*v+M[1][2], M[2][0]*u+M[2][1]*v+M[2][2]]
const vlen = v => Math.hypot(...v)
const norm = v => { const l = vlen(v); return v.map(x => x / l) }
function quatFromZTo(n) { const nx = n[0], ny = n[1], nz = n[2]; let q = [ny, -nx, 0, 1 + nz]; if (nz < -0.999) q = [1, 0, 0, 0]; const l = Math.hypot(...q); return q.map(x => x / l) }

const { M, rms } = fit(mid)
const uVec = [M[0][0], M[1][0], M[2][0]], vVec = [M[0][1], M[1][1], M[2][1]]
const nrm = norm([uVec[1]*vVec[2]-uVec[2]*vVec[1], uVec[2]*vVec[0]-uVec[0]*vVec[2], uVec[0]*vVec[1]-uVec[1]*vVec[0]])
// 面板 AABB
const mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9]
for (const { p } of mid) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]) }
const cc = [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2]
console.log('===== Object_85 中段(中控面板) =====')
console.log('顶点', mid.length, ' RMS', rms.toFixed(4), 'm')
console.log('AABB: x[' + mn[0].toFixed(3) + ',' + mx[0].toFixed(3) + '] y[' + mn[1].toFixed(3) + ',' + mx[1].toFixed(3) + '] z[' + mn[2].toFixed(3) + ',' + mx[2].toFixed(3) + ']')
console.log('尺寸: ' + (mx[0]-mn[0]).toFixed(3) + ' x ' + (mx[1]-mn[1]).toFixed(3))
console.log('中心: (' + cc.map(x => x.toFixed(3)).join(', ') + ')')
console.log('法线: (' + nrm.map(x => x.toFixed(3)).join(', ') + ') 与Z轴 ' + (Math.acos(Math.abs(nrm[2]))*180/Math.PI).toFixed(1) + '°')
console.log('Δu=' + vlen(uVec).toFixed(3) + 'm/uv Δv=' + vlen(vVec).toFixed(3) + 'm/uv')
console.log('四元数: (' + quatFromZTo(nrm).map(x => x.toFixed(5)).join(', ') + ')')
// UV 范围(特征)
let umin=1e9,umax=-1e9,vmin=1e9,vmax=-1e9
for (const { uv } of mid) { const u = uv[0], v = 1 - uv[1]; umin=Math.min(umin,u); umax=Math.max(umax,u); vmin=Math.min(vmin,v); vmax=Math.max(vmax,v) }
console.log('UV(特征)范围: u[' + umin.toFixed(3) + ',' + umax.toFixed(3) + '] v[' + vmin.toFixed(3) + ',' + vmax.toFixed(3) + '] = 贴图区域')

// 贴图亮区映射(亮区列表来自 texmap, 只取 y 0.45~1.0 即中段区域)
console.log('\n===== 贴图亮区 → 中段世界坐标 =====')
const regions = [
  { name: '#0(大块)', u0: 0.746, u1: 0.888, v0: 0.731, v1: 0.854 },
  { name: '#3', u0: 0.940, u1: 0.970, v0: 0.732, v1: 0.877 },
  { name: '#6', u0: 0.283, u1: 0.358, v0: 0.663, v1: 0.938 },
  { name: '#7', u0: 0.639, u1: 0.717, v0: 0.662, v1: 0.938 },
  { name: '#8', u0: 0.030, u1: 0.048, v0: 0.771, v1: 0.843 },
  { name: '#11', u0: 0.196, u1: 0.246, v0: 0.733, v1: 0.772 },
  { name: '#12', u0: 0.182, u1: 0.234, v0: 0.845, v1: 0.877 },
  { name: '#13', u0: 0.109, u1: 0.128, v0: 0.768, v1: 0.825 },
]
for (const r of regions) {
  const cA = mapUV(M, r.u0, r.v0), cB = mapUV(M, r.u1, r.v0), cC = mapUV(M, r.u1, r.v1), cD = mapUV(M, r.u0, r.v1)
  const cc2 = [(cA[0]+cB[0]+cC[0]+cD[0])/4, (cA[1]+cB[1]+cC[1]+cD[1])/4, (cA[2]+cB[2]+cC[2]+cD[2])/4]
  const w = Math.hypot(cB[0]-cA[0], cB[1]-cA[1], cB[2]-cA[2])
  const h = Math.hypot(cD[0]-cA[0], cD[1]-cA[1], cD[2]-cA[2])
  console.log('  ' + r.name + ': 中心(' + cc2.map(x => x.toFixed(3)).join(', ') + ')  ' + w.toFixed(3) + 'x' + h.toFixed(3))
}
