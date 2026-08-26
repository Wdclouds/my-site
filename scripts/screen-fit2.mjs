// screen-fit2.mjs — Object_85 分段 UV→世界映射:左/中/右三段独立仿射
// 把全部贴图亮区映射回世界,反查发光件位置对应的 UV,确定屏幕真实边界
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

// ---- Object_85 顶点 ----
let obj85 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_85') obj85 = { node: n, idx: i } })
const wm = worldMatrix(obj85.idx)
const prim = meshes[obj85.node.mesh].primitives[0]
const localPts = readAccessor(accessors[prim.attributes.POSITION])
const uvs = readAccessor(accessors[prim.attributes.TEXCOORD_0])
const pts = localPts.map(p => transformPoint(wm, p))

// ---- 分段:按世界 x 聚类 ----
// 中段 x≈0(顶点0-55), 左段 x<0.2(顶点56-113), 右段 x>0.2(顶点114-127)
const segs = { 左段: [], 中段: [], 右段: [] }
pts.forEach((p, i) => {
  const key = p[0] < -0.2 ? '左段' : p[0] > 0.2 ? '右段' : '中段'
  segs[key].push({ p, uv: uvs[i] })
})

// 仿射拟合 p = M·[u,v,1]
function fit(verts, flipV) {
  const ATA = [[0,0,0],[0,0,0],[0,0,0]]
  const ATp = [[0,0,0],[0,0,0],[0,0,0]]
  for (const { p, uv } of verts) {
    const u = uv[0], v = flipV ? 1 - uv[1] : uv[1]
    const row = [u, v, 1]
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ATA[r][c] += row[r] * row[c]
    for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) ATp[k][r] += row[r] * p[k]
  }
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
  const M = []
  for (let k = 0; k < 3; k++) M.push(solve(ATA, ATp[k]))
  let err = 0
  for (const { p, uv } of verts) {
    const u = uv[0], v = flipV ? 1 - uv[1] : uv[1]
    const px = M[0][0]*u + M[0][1]*v + M[0][2]
    const py = M[1][0]*u + M[1][1]*v + M[1][2]
    const pz = M[2][0]*u + M[2][1]*v + M[2][2]
    err += (px-p[0])**2 + (py-p[1])**2 + (pz-p[2])**2
  }
  return { M, rms: Math.sqrt(err / verts.length) }
}
const mapUV = (M, u, v) => [ M[0][0]*u + M[0][1]*v + M[0][2], M[1][0]*u + M[1][1]*v + M[1][2], M[2][0]*u + M[2][1]*v + M[2][2] ]

// ---- 解码贴图亮区 ----
function decodePNG(b) {
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0
  const idat = []
  while (pos + 8 <= b.length) {
    const len = b.readUInt32BE(pos), type = b.toString('ascii', pos + 4, pos + 8)
    const data = b.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9] }
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
const png = decodePNG(fs.readFileSync(process.argv[3]))
const W = png.width, H = png.height, bpp = png.bpp
const lum = (x, y) => { const o = (y * W + x) * bpp; return (png.data[o] + png.data[o+1] + png.data[o+2]) / 3 }
const THRESH = 140
const mask = new Uint8Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mask[y * W + x] = lum(x, y) > THRESH ? 1 : 0
const visited = new Uint8Array(W * H)
const comps = []
for (let y = 0; y < H; y += 2) {
  for (let x = 0; x < W; x += 2) {
    if (!mask[y * W + x] || visited[y * W + x]) continue
    const q = [[x, y]]
    visited[y * W + x] = 1
    let minX = x, maxX = x, minY = y, maxY = y, count = 0
    while (q.length) {
      const [cx, cy] = q.pop()
      count++
      if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
      if (cy < minY) minY = cy; if (cy > maxY) maxY = cy
      for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) {
        const nx = cx + dx, ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        if (mask[ny * W + nx] && !visited[ny * W + nx]) { visited[ny * W + nx] = 1; q.push([nx, ny]) }
      }
    }
    comps.push({ minX, maxX, minY, maxY, count })
  }
}
const big = comps.filter(c => c.count > 300).sort((a, b) => b.count - a.count)
console.log(`贴图 ${W}x${H}  亮区 ${big.length} 个 (面积>300):`)
big.forEach((c, i) => {
  console.log(`  亮区#${i}  UV x[${(c.minX/W).toFixed(3)},${(c.maxX/W).toFixed(3)}] y[${(c.minY/H).toFixed(3)},${(c.maxY/H).toFixed(3)}]  面积${c.count}`)
})

// ---- 每段: 拟合 + 映射所有亮区 + 反查发光件位置 ----
console.log('\n===== 分段映射 =====')
for (const flipV of [false, true]) {
  console.log(`\n--- v${flipV ? '翻转(1-v)' : '原始'} ---`)
  for (const [segName, verts] of Object.entries(segs)) {
    if (verts.length < 3) { console.log(`${segName}: 顶点不足`); continue }
    const { M, rms } = fit(verts, flipV)
    const uVec = [M[0][0], M[1][0], M[2][0]], vVec = [M[0][1], M[1][1], M[2][1]]
    const nx = uVec[1]*vVec[2] - uVec[2]*vVec[1], ny = uVec[2]*vVec[0] - uVec[0]*vVec[2], nz = uVec[0]*vVec[1] - uVec[1]*vVec[0]
    const nl = Math.hypot(nx, ny, nz)
    console.log(`${segName} (${verts.length}顶点, RMS ${rms.toFixed(4)}m): Δu=${Math.hypot(...uVec).toFixed(3)}m/uv Δv=${Math.hypot(...vVec).toFixed(3)}m/uv | 法线(${(nx/nl).toFixed(2)},${(ny/nl).toFixed(2)},${(nz/nl).toFixed(2)}) 与Z轴${(Math.acos(Math.abs(nz/nl))*180/Math.PI).toFixed(1)}°`)
    // 反查发光件参考位置
    const refs = { 主驾: [-0.370, 0.311, -0.692], 副驾: [0.375, 0.222, -0.729] }
    for (const [rk, rp] of Object.entries(refs)) {
      // 用最小二乘逆映射(把 p 投影到段平面,求 uv)
      // 简化: 遍历细网格采样找最近点
      let best = null, bestD = Infinity
      for (let u = 0; u <= 1.01; u += 0.005) for (let v = 0; v <= 1.01; v += 0.005) {
        const q = mapUV(M, u, v)
        const d = (q[0]-rp[0])**2 + (q[1]-rp[1])**2 + (q[2]-rp[2])**2
        if (d < bestD) { bestD = d; best = [u, v] }
      }
      if (bestD < 0.02) console.log(`  反查 ${rk} (${rp.join(',')}) → UV(${best[0].toFixed(3)}, ${best[1].toFixed(3)}) 距离${Math.sqrt(bestD).toFixed(4)}m`)
    }
    // 映射亮区
    for (const c of big) {
      const u0 = c.minX / W, u1 = c.maxX / W, v0 = c.minY / H, v1 = c.maxY / H
      // 亮区只落在本段 UV 范围内才映射(带余量)
      const cA = mapUV(M, u0, v0), cB = mapUV(M, u1, v0), cC = mapUV(M, u1, v1), cD = mapUV(M, u0, v1)
      const cx = (cA[0]+cB[0]+cC[0]+cD[0])/4, cy = (cA[1]+cB[1]+cC[1]+cD[1])/4, cz = (cA[2]+cB[2]+cC[2]+cD[2])/4
      const w = Math.hypot(cB[0]-cA[0], cB[1]-cA[1], cB[2]-cA[2])
      const h = Math.hypot(cD[0]-cA[0], cD[1]-cA[1], cD[2]-cA[2])
      // 只在面板范围内(x 合理)才打印
      if (cx > -0.7 && cx < 0.7 && cy > 0.05 && cy < 0.5 && w > 0.005 && h > 0.005)
        console.log(`  亮区[${(u0).toFixed(3)}-${(u1).toFixed(3)},${(v0).toFixed(3)}-${(v1).toFixed(3)}] → 中心(${cx.toFixed(3)}, ${cy.toFixed(3)}, ${cz.toFixed(3)})  宽${w.toFixed(3)}×高${h.toFixed(3)}`)
    }
  }
}
