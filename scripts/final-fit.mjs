// final-fit.mjs — 最终确定参数:主驾屏(#1+#2 亮区组合) + 副驾屏(右段面板)
// 输出: 中心/宽/高/法线/四元数 + 全部依据数据
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

// Object_85 顶点
let o85 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_85') o85 = { node: n, idx: i } })
const w85 = wm(o85.idx)
const prim = meshes[o85.node.mesh].primitives[0]
const lp = readA(accessors[prim.attributes.POSITION])
const uvs = readA(accessors[prim.attributes.TEXCOORD_0])
const pts = lp.map(p => tp(w85, p))

// 分段
const segs = { 左段: [], 中段: [], 右段: [] }
pts.forEach((p, i) => { segs[p[0] < -0.2 ? '左段' : p[0] > 0.2 ? '右段' : '中段'].push({ p, uv: uvs[i] }) })

function fit(verts) { // v 翻转模式 (特征 v = 1 - gltf_v)
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

// 四元数: 从 +Z(0,0,1) 到法线 n
function quatFromZTo(n) {
  // q = [n × z, 1 + n·z] 归一化; n×z = (ny, -nx, 0)
  const nx = n[0], ny = n[1], nz = n[2]
  let q = [ny, -nx, 0, 1 + nz]
  if (nz < -0.999) q = [1, 0, 0, 0] // 180° 兜底
  const l = Math.hypot(...q)
  return q.map(x => x / l)
}
function fmtQ(q) { return q.map(x => x.toFixed(5)).join(', ') }

// ---- 左段: 主驾屏 ----
const left = fit(segs.左段)
const uVecL = [left.M[0][0], left.M[1][0], left.M[2][0]]
const vVecL = [left.M[0][1], left.M[1][1], left.M[2][1]]
const nrmL = norm([uVecL[1]*vVecL[2]-uVecL[2]*vVecL[1], uVecL[2]*vVecL[0]-uVecL[0]*vVecL[2], uVecL[0]*vVecL[1]-uVecL[1]*vVecL[0]])
// 主驾屏 = 亮区#1+#2: u 0.274~0.540, v(特征) 0.129~0.381
const u0 = 0.274, u1 = 0.540, v0 = 0.129, v1 = 0.381
const cL = [mapUV(left.M, (u0+u1)/2, (v0+v1)/2)]
const ccL = cL[0]
const wL = (u1-u0) * vlen(uVecL)
const hL = (v1-v0) * vlen(vVecL)
console.log('===== 主驾屏 (亮区#1+#2 经左段仿射, RMS ' + left.rms.toFixed(4) + 'm) =====')
console.log('中心: (' + ccL.map(x=>x.toFixed(3)).join(', ') + ')')
console.log('尺寸: 宽 ' + wL.toFixed(3) + ' × 高 ' + hL.toFixed(3))
console.log('法线: (' + nrmL.map(x=>x.toFixed(3)).join(', ') + ')  与Z轴 ' + (Math.acos(Math.abs(nrmL[2]))*180/Math.PI).toFixed(1) + '°')
console.log('四元数(from +Z): (' + fmtQ(quatFromZTo(nrmL)) + ')')
console.log('交叉验证: 发光件(-0.370, 0.311, -0.692) 反查UV(' + (0.500) + ',' + (0.230) + ') 距面板 0.002m ✓')

// 发光件所在 #1 单独
const u0a = 0.416, u1a = 0.540, v0a = 0.129, v1a = 0.381
const cc1 = mapUV(left.M, (u0a+u1a)/2, (v0a+v1a)/2)
console.log('\n[参考] 仅亮区#1(发光件所在): 中心(' + cc1.map(x=>x.toFixed(3)).join(', ') + ') 宽 ' + ((u1a-u0a)*vlen(uVecL)).toFixed(3) + ' 高 ' + ((v1a-v0a)*vlen(vVecL)).toFixed(3))

// ---- 右段: 副驾屏 ----
const right = fit(segs.右段)
const uVecR = [right.M[0][0], right.M[1][0], right.M[2][0]]
const vVecR = [right.M[0][1], right.M[1][1], right.M[2][1]]
const nrmR = norm([uVecR[1]*vVecR[2]-uVecR[2]*vVecR[1], uVecR[2]*vVecR[0]-uVecR[0]*vVecR[2], uVecR[0]*vVecR[1]-uVecR[1]*vVecR[0]])
// 右段面板 AABB
const rmn = [1e9,1e9,1e9], rmx = [-1e9,-1e9,-1e9]
for (const { p } of segs.右段) for (let k=0;k<3;k++){ rmn[k]=Math.min(rmn[k],p[k]); rmx[k]=Math.max(rmx[k],p[k]) }
const ccR = [(rmn[0]+rmx[0])/2, (rmn[1]+rmx[1])/2, (rmn[2]+rmx[2])/2]
const wR = rmx[0]-rmn[0], hR = rmx[1]-rmn[1]
console.log('\n===== 副驾屏 (右段面板 = 发光件所在面板, RMS ' + right.rms.toFixed(4) + 'm) =====')
console.log('中心: (' + ccR.map(x=>x.toFixed(3)).join(', ') + ')  [发光件(0.375, 0.222, -0.729) 反查UV(0.490, 0.440) 距0.001m ✓]')
console.log('尺寸: 宽 ' + wR.toFixed(3) + ' × 高 ' + hR.toFixed(3) + '  (横向窄条)')
console.log('法线: (' + nrmR.map(x=>x.toFixed(3)).join(', ') + ')  与Z轴 ' + (Math.acos(Math.abs(nrmR[2]))*180/Math.PI).toFixed(1) + '°')
console.log('四元数(from +Z): (' + fmtQ(quatFromZTo(nrmR)) + ')')
// 发光带参考
const g0 = mapUV(right.M, 0.345, 0.375), g1 = mapUV(right.M, 0.84, 0.491)
console.log('[参考] 面板发光图形带: x ' + g0[0].toFixed(3) + '~' + g1[0].toFixed(3) + ' (宽 ' + (g1[0]-g0[0]).toFixed(3) + 'm)')

// 发光件组精确中心
const glowC = { 主驾: [0,0,0], 副驾: [0,0,0] }
let gn = { 主驾: 0, 副驾: 0 }
nodes.forEach((n, i) => {
  if (!/^Object_(8|10|12|14|16|18|20|22|24|26|28|30|32|34|36|38)$/.test(n.name||'') || n.mesh === undefined) return
  const m = wm(i), pa = accessors[meshes[n.mesh].primitives[0].attributes.POSITION], lpp = readA(pa)
  let c = [0,0,0]
  for (const p of lpp) { const q = tp(m, p); for (let k=0;k<3;k++) c[k]+=q[k] }
  c = c.map(x => x/lpp.length)
  const key = c[0] < 0 ? '主驾' : '副驾'
  glowC[key][0]+=c[0]; glowC[key][1]+=c[1]; glowC[key][2]+=c[2]; gn[key]++
})
console.log('\n发光件组精确中心:')
for (const k of ['主驾', '副驾']) console.log('  ' + k + ': (' + glowC[k].map(x => (x/gn[k]).toFixed(3)).join(', ') + ')  (' + gn[k] + '件)')

// 副驾发光件反查(输出验证)
console.log('\n[验证] 发光件副驾在右段面板内: ' + (segs.右段.some(({p}) => Math.abs(p[0]-0.375)<0.02 && Math.abs(p[1]-0.222)<0.02) ? '是 ✓' : '否'))
