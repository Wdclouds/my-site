// screen-fit.mjs — 用 Object_85 的 UV→世界仿射映射,把贴图亮区(屏幕图形)映射回世界
// 用法: node scripts/screen-fit.mjs public/lamborghini_revuelto.glb scripts/tex/script_rt_dials_race.001_2.png
import fs from 'fs'
import zlib from 'zlib'

const buf = fs.readFileSync(process.argv[2])
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

// ---- 1. Object_85 顶点: 世界坐标 + UV ----
let obj85 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_85') obj85 = { node: n, idx: i } })
const wm = worldMatrix(obj85.idx)
const prim = meshes[obj85.node.mesh].primitives[0]
const posAcc = accessors[prim.attributes.POSITION]
const uvAcc = accessors[prim.attributes.TEXCOORD_0]
const localPts = readAccessor(posAcc)
const uvs = readAccessor(uvAcc)
const pts = localPts.map(p => transformPoint(wm, p))
console.log(`Object_85: ${pts.length} 顶点`)

// ---- 2. 最小二乘: p(u,v) = M·[u,v,1], M 为 3x3 ----
// 对 v 做两种假设: v_raw(glTF 惯例, 原点左上) 和 v_flip = 1-v (OpenGL 惯例, 原点左下)
function fitMap(uvs, pts, flipV) {
  // 正规方程: 对每个输出坐标 k: 最小化 Σ (p_k - (a*u + b*v + c))^2
  // 构建 A (n x 3): [u, v, 1], 解 A^T A x = A^T p_k
  const ATA = [[0,0,0],[0,0,0],[0,0,0]]
  const ATp = [[0,0,0],[0,0,0],[0,0,0]]
  for (let i = 0; i < uvs.length; i++) {
    const u = uvs[i][0], v = flipV ? 1 - uvs[i][1] : uvs[i][1]
    const row = [u, v, 1]
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ATA[r][c] += row[r] * row[c]
    for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) ATp[k][r] += row[r] * pts[i][k]
  }
  // 解 3 个 3x3 线性系统(高斯消元)
  function solve(A, b) {
    const M = A.map((row, i) => [...row, b[i]])
    for (let col = 0; col < 3; col++) {
      let piv = col
      for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
      if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]]
      for (let r = 0; r < 3; r++) {
        if (r === col) continue
        const f = M[r][col] / M[col][col]
        for (let c = col; c < 4; c++) M[r][c] -= f * M[col][c]
      }
    }
    return [M[0][3]/M[0][0], M[1][3]/M[1][1], M[2][3]/M[2][2]]
  }
  // 每行 M[k] = [a_k, b_k, c_k] 使得 p_k = a_k*u + b_k*v + c_k
  const M = []
  for (let k = 0; k < 3; k++) M.push(solve(ATA, ATp[k]))
  // 拟合误差
  let err = 0
  for (let i = 0; i < uvs.length; i++) {
    const u = uvs[i][0], v = flipV ? 1 - uvs[i][1] : uvs[i][1]
    const px = M[0][0]*u + M[0][1]*v + M[0][2]
    const py = M[1][0]*u + M[1][1]*v + M[1][2]
    const pz = M[2][0]*u + M[2][1]*v + M[2][2]
    err += (px-pts[i][0])**2 + (py-pts[i][1])**2 + (pz-pts[i][2])**2
  }
  return { M, rms: Math.sqrt(err / uvs.length) }
}

function mapUV(M, u, v) {
  return [ M[0][0]*u + M[0][1]*v + M[0][2], M[1][0]*u + M[1][1]*v + M[1][2], M[2][0]*u + M[2][1]*v + M[2][2] ]
}

for (const flipV of [false, true]) {
  const { M, rms } = fitMap(uvs, pts, flipV)
  console.log(`\n===== UV→世界映射 (v${flipV ? '翻转=1-v' : '原始'})  拟合RMS ${rms.toFixed(4)}m =====`)
  // UV 单位向量在世界里的意义
  const uVec = [M[0][0], M[1][0], M[2][0]] // Δp/Δu
  const vVec = [M[0][1], M[1][1], M[2][1]] // Δp/Δv
  const uLen = Math.hypot(...uVec), vLen = Math.hypot(...vVec)
  console.log(`  Δu→世界 (${uVec.map(x=>x.toFixed(4)).join(', ')}) 长度 ${uLen.toFixed(4)} m/uv | Δv→世界 (${vVec.map(x=>x.toFixed(4)).join(', ')}) 长度 ${vLen.toFixed(4)} m/uv`)
  // 法线 = uVec × vVec
  const nx = uVec[1]*vVec[2] - uVec[2]*vVec[1], ny = uVec[2]*vVec[0] - uVec[0]*vVec[2], nz = uVec[0]*vVec[1] - uVec[1]*vVec[0]
  const nl = Math.hypot(nx, ny, nz)
  console.log(`  面板法线 (${(nx/nl).toFixed(3)}, ${(ny/nl).toFixed(3)}, ${(nz/nl).toFixed(3)}) 与轴夹角: X${(Math.acos(Math.abs(nx/nl))*180/Math.PI).toFixed(1)}° Y${(Math.acos(Math.abs(ny/nl))*180/Math.PI).toFixed(1)}° Z${(Math.acos(Math.abs(nz/nl))*180/Math.PI).toFixed(1)}°`)

  // ---- 3. 亮区 → 世界矩形 ----
  const regions = [
    { name: '亮区#1(中右块)', u0: 0.416, u1: 0.540, v0: 0.129, v1: 0.381 },
    { name: '亮区#2(中左块)', u0: 0.274, u1: 0.398, v0: 0.129, v1: 0.381 },
    { name: '窄条#4', u0: 0.666, u1: 0.677, v0: 0.051, v1: 0.367 },
    { name: '窄条#5', u0: 0.585, u1: 0.609, v0: 0.154, v1: 0.358 },
    { name: '窄条#10', u0: 0.846, u1: 0.875, v0: 0.152, v1: 0.361 },
  ]
  for (const r of regions) {
    const corners = [
      mapUV(M, r.u0, r.v0), mapUV(M, r.u1, r.v0), mapUV(M, r.u1, r.v1), mapUV(M, r.u0, r.v1)
    ]
    const c = [0,0,0]
    for (const p of corners) for (let k=0;k<3;k++) c[k] += p[k]/4
    // 宽 = |角0-角1|, 高 = |角0-角3|
    const w = Math.hypot(corners[1][0]-corners[0][0], corners[1][1]-corners[0][1], corners[1][2]-corners[0][2])
    const h = Math.hypot(corners[3][0]-corners[0][0], corners[3][1]-corners[0][1], corners[3][2]-corners[0][2])
    console.log(`  ${r.name}: 中心(${c.map(x=>x.toFixed(3)).join(', ')})  宽${w.toFixed(3)} 高${h.toFixed(3)}`)
  }
}

// ---- 4. 发光件参考 ----
console.log('\n===== 发光件参考(位置=屏幕中心, 法线=屏幕朝向) =====')
const glowGroups = { 主驾: [], 副驾: [] }
nodes.forEach((n, i) => {
  if (!/^Object_(8|10|12|14|16|18|20|22|24|26|28|30|32|34|36|38)$/.test(n.name||'')) return
  if (n.mesh === undefined) return
  const m = worldMatrix(i)
  const pa = accessors[meshes[n.mesh].primitives[0].attributes.POSITION]
  const lp = readAccessor(pa)
  const wp = lp.map(p => transformPoint(m, p))
  const mn = [Infinity,Infinity,Infinity], mx = [-Infinity,-Infinity,-Infinity]
  for (const p of wp) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],p[k]); mx[k]=Math.max(mx[k],p[k]) }
  const c = [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2]
  ;(c[0] < 0 ? glowGroups.主驾 : glowGroups.副驾).push(c)
})
for (const [k, v] of Object.entries(glowGroups)) {
  if (!v.length) continue
  const c = [0,0,0]
  for (const p of v) for (let i=0;i<3;i++) c[i] += p[i]/v.length
  const mn = [Infinity,Infinity,Infinity], mx = [-Infinity,-Infinity,-Infinity]
  for (const p of v) for (let i=0;i<3;i++){ mn[i]=Math.min(mn[i],p[i]); mx[i]=Math.max(mx[i],p[i]) }
  console.log(`  ${k}: 中心(${c.map(x=>x.toFixed(3)).join(', ')})  包络尺寸(${(mx[0]-mn[0]).toFixed(3)}, ${(mx[1]-mn[1]).toFixed(3)}, ${(mx[2]-mn[2]).toFixed(3)})  ${v.length}件`)
}
