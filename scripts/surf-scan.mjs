// 曲面分析：对 GLB 指定区域内的 mesh 做 PCA 平面拟合
// 输出：中心、面法线（真实角度）、面内宽高（真实形状）
import fs from 'fs'

const buf = fs.readFileSync(process.argv[2])
let gltf = null
let bin = null
let offset = 12
while (offset + 8 <= buf.length) {
  const len = buf.readUInt32LE(offset)
  const type = buf.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(buf.subarray(offset + 8, offset + 8 + len).toString('utf8'))
  if (type === 0x004e4942) bin = buf.subarray(offset + 8, offset + 8 + len)
  offset += 8 + len
}
const nodes = gltf.nodes || []
const meshes = gltf.meshes || []
const accessors = gltf.accessors || []
const bufferViews = gltf.bufferViews || []

// ---- 矩阵工具（column-major，同前）----
function mat4Mul(a, b) {
  const o = new Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    o[c*4+r] = a[0*4+r]*b[c*4+0] + a[1*4+r]*b[c*4+1] + a[2*4+r]*b[c*4+2] + a[3*4+r]*b[c*4+3]
  return o
}
function quatToMat4(q) {
  const [x,y,z,w] = q
  const x2=x+x, y2=y+y, z2=z+z
  const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2
  const wx=w*x2, wy=w*y2, wz=w*z2
  return [1-(yy+zz), xy+wz, xz-wy, 0, xy-wz, 1-(xx+zz), yz+wx, 0, xz+wy, yz-wx, 1-(xx+yy), 0, 0,0,0,1]
}
function scaleMat(s) { return [s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1] }
function transMat(t) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1] }
function transformPoint(m, p) {
  return [ m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12], m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13], m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14] ]
}
function transformNormal(m, n) { // 只旋转，不平移
  return [ m[0]*n[0]+m[4]*n[1]+m[8]*n[2], m[1]*n[0]+m[5]*n[1]+m[9]*n[2], m[2]*n[0]+m[6]*n[1]+m[10]*n[2] ]
}
const nodeMats = new Array(nodes.length).fill(null)
function worldMatrix(i) {
  if (nodeMats[i]) return nodeMats[i]
  const n = nodes[i]
  let local
  if (n.matrix) local = n.matrix.slice()
  else {
    const t = n.translation || [0,0,0], r = n.rotation || [0,0,0,1], s = n.scale || [1,1,1]
    local = mat4Mul(mat4Mul(transMat(t), quatToMat4(r)), scaleMat(s))
  }
  let m = local
  if (n.parent !== undefined) m = mat4Mul(worldMatrix(n.parent), local)
  nodeMats[i] = m
  return m
}
nodes.forEach((n, i) => { n.index = i; (n.children || []).forEach(c => { nodes[c].parent = i }) })

function readAccessor(acc) {
  if (!acc || acc.bufferView === undefined) return null
  const bv = bufferViews[acc.bufferView]
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0)
  const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type] || 3
  const stride = bv.byteStride || comps * 4
  const out = []
  for (let i = 0; i < acc.count; i++) {
    const off = byteOffset + i * stride
    const el = []
    for (let j = 0; j < comps; j++) el.push(bin.readFloatLE(off + j * 4))
    out.push(el)
  }
  return out
}

// PCA 平面拟合：返回 { center, normal, a, b }（a,b 为面内两个主轴方向的半径）
function fitPlane(pts) {
  const n = pts.length
  const c = [0,0,0]
  for (const p of pts) { c[0]+=p[0]; c[1]+=p[1]; c[2]+=p[2] }
  c[0]/=n; c[1]/=n; c[2]/=n
  let m00=0,m01=0,m02=0,m11=0,m12=0,m22=0
  for (const p of pts) {
    const x=p[0]-c[0], y=p[1]-c[1], z=p[2]-c[2]
    m00+=x*x; m01+=x*y; m02+=x*z; m11+=y*y; m12+=y*z; m22+=z*z
  }
  // 对称矩阵 [m00 m01 m02; m01 m11 m12; m02 m12 m22] 的特征值（幂迭代两次：最大、最小）
  // 用雅可比或直接求特征向量——这里用协方差矩阵的 3x3 雅可比求全部特征向量
  const A = [[m00,m01,m02],[m01,m11,m12],[m02,m12,m22]]
  const V = [[1,0,0],[0,1,0],[0,0,1]]
  // 雅可比特征分解（迭代 20 次）
  for (let iter = 0; iter < 50; iter++) {
    let p = 0, q = 1
    // 找最大非对角元
    let max = Math.abs(A[0][1])
    if (Math.abs(A[0][2]) > max) { max = Math.abs(A[0][2]); p = 0; q = 2 }
    if (Math.abs(A[1][2]) > max) { p = 1; q = 2 }
    if (max < 1e-12) break
    const app = A[p][p], aqq = A[q][q], apq = A[p][q]
    const theta = (aqq - app) / (2 * apq)
    const t = (theta >= 0 ? 1 : -1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1))
    const cs = 1 / Math.sqrt(1 + t * t), sn = t * cs
    // 旋转 A 和 V
    for (let k = 0; k < 3; k++) {
      const akp = A[k][p], akq = A[k][q]
      A[k][p] = cs * akp - sn * akq
      A[k][q] = sn * akp + cs * akq
    }
    for (let k = 0; k < 3; k++) {
      const apk = A[p][k], aqk = A[q][k]
      A[p][k] = cs * apk - sn * aqk
      A[q][k] = sn * apk + cs * aqk
    }
    for (let k = 0; k < 3; k++) {
      const vkp = V[k][p], vkq = V[k][q]
      V[k][p] = cs * vkp - sn * vkq
      V[k][q] = sn * vkp + cs * vkq
    }
  }
  // 特征值在 A 对角线上；最小特征值对应的列向量 = 法线
  let minIdx = 0
  for (let i = 1; i < 3; i++) if (A[i][i] < A[minIdx][minIdx]) minIdx = i
  const normal = [V[0][minIdx], V[1][minIdx], V[2][minIdx]]
  const nl = Math.sqrt(normal[0]*normal[0] + normal[1]*normal[1] + normal[2]*normal[2])
  normal[0]/=nl; normal[1]/=nl; normal[2]/=nl
  // 面内两个主轴：其余两列
  const others = [0,1,2].filter(i => i !== minIdx)
  const e1 = [V[0][others[0]], V[1][others[0]], V[2][others[0]]]
  const e2 = [V[0][others[1]], V[1][others[1]], V[2][others[1]]]
  // 投影求面内半径
  let a = 0, b = 0
  for (const p of pts) {
    const dx = p[0]-c[0], dy = p[1]-c[1], dz = p[2]-c[2]
    const pa = dx*e1[0] + dy*e1[1] + dz*e1[2]
    const pb = dx*e2[0] + dy*e2[1] + dz*e2[2]
    a = Math.max(a, Math.abs(pa)); b = Math.max(b, Math.abs(pb))
  }
  return { center: c, normal, halfW: a, halfH: b, ev: [A[0][0], A[1][1], A[2][2]] }
}

const fmt = v => v.map(x => x.toFixed(3)).join(', ')
const fmtD = v => v.map(x => (x*180/Math.PI).toFixed(1)).join(', ')

console.log('===== 仪表台区域 mesh 曲面分析（x ±0.65, y 0.05~0.65, z -1.0~-0.2）=====')
console.log('节点 | 材质 | 中心 | 面法线(未归一角度参考) | 面内宽×高 | 法线指向(°=与XYZ轴夹角)')
const results = []
nodes.forEach((n, i) => {
  if (n.mesh === undefined) return
  const mesh = meshes[n.mesh]
  if (!mesh) return
  const wm = worldMatrix(i)
  // 先算 AABB 中心粗筛
  const prim = (mesh.primitives || [])[0]
  if (!prim) return
  const posAcc = accessors[prim.attributes.POSITION]
  if (!posAcc || !posAcc.min || !posAcc.max) return
  const minW = transformPoint(wm, posAcc.min)
  const maxW = transformPoint(wm, posAcc.max)
  const c = [(minW[0]+maxW[0])/2, (minW[1]+maxW[1])/2, (minW[2]+maxW[2])/2]
  if (Math.abs(c[0]) > 0.65 || c[1] < 0.05 || c[1] > 0.65 || c[2] < -1.0 || c[2] > -0.2) return
  // 读顶点做 PCA
  const localPts = readAccessor(posAcc)
  if (!localPts || localPts.length < 3) return
  const pts = localPts.map(p => transformPoint(wm, p))
  const fit = fitPlane(pts)
  const matName = (gltf.materials[prim.material] && gltf.materials[prim.material].name) || ('mat#' + prim.material)
  const w = fit.halfW * 2, h = fit.halfH * 2
  // 法线夹角（度）：与各轴
  const ang = [Math.acos(Math.abs(fit.normal[0])), Math.acos(Math.abs(fit.normal[1])), Math.acos(Math.abs(fit.normal[2]))].map(a => a*180/Math.PI)
  // 平展度：法线方向特征值占比
  const evMin = Math.min(...fit.ev.map(Math.abs))
  const evSum = fit.ev.reduce((s, x) => s + Math.abs(x), 0)
  const flat = evSum > 0 ? 1 - evMin / evSum : 0
  results.push({ name: n.name || 'node#' + i, mat: matName, c, w, h, normal: fit.normal, ang, flat })
})
results.sort((a, b) => b.flat - a.flat)
for (const r of results) {
  console.log(
    r.name + ' | ' + r.mat.slice(0, 34) +
    ' | 中心(' + fmt(r.c) + ')' +
    ' | 面内 ' + r.w.toFixed(2) + '×' + r.h.toFixed(2) +
    ' | 法线(' + fmt(r.normal) + ') 与轴夹角(' + r.ang.map(a=>a.toFixed(0)).join(',') + '°)' +
    ' | 平展度 ' + r.flat.toFixed(2)
  )
}
