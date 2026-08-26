// 分析仪表台面板发光贴图：找亮区（屏幕图形）→ 用 Object_85 的 UV 映射回世界坐标
import fs from 'fs'
import zlib from 'zlib'

// ---- 1. 最小 PNG 解码器（RGBA8 / RGB8）----
function decodePNG(buf) {
  let pos = 8, width = 0, height = 0, colorType = 0, bitDepth = 0
  const idat = []
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
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

// ---- 2. 读 GLB（复用矩阵工具）----
const gbuf = fs.readFileSync(process.argv[2])
let gltf = null, bin = null
let offset = 12
while (offset + 8 <= gbuf.length) {
  const len = gbuf.readUInt32LE(offset)
  const type = gbuf.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(gbuf.subarray(offset + 8, offset + 8 + len).toString('utf8'))
  if (type === 0x004e4942) bin = gbuf.subarray(offset + 8, offset + 8 + len)
  offset += 8 + len
}
const nodes = gltf.nodes || []
const meshes = gltf.meshes || []
const accessors = gltf.accessors || []
const bufferViews = gltf.bufferViews || []

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

// ---- 3. 解码发光贴图，找亮区 ----
const texFile = process.argv[3]
const png = decodePNG(fs.readFileSync(texFile))
const W = png.width, H = png.height, bpp = png.bpp
console.log('贴图尺寸: ' + W + 'x' + H + '  bpp=' + bpp)

// 亮区 mask（屏幕图形：亮度高且有一定色彩/白色）
const lum = (x, y) => {
  const o = (y * W + x) * bpp
  const r = png.data[o], g = png.data[o + 1], b = png.data[o + 2]
  return (r + g + b) / 3
}
const THRESH = 150
const mask = new Uint8Array(W * H)
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) mask[y * W + x] = lum(x, y) > THRESH ? 1 : 0

// 连通域（BFS），每 2px 采样加速
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
      for (let dy = -2; dy <= 2; dy += 2) {
        for (let dx = -2; dx <= 2; dx += 2) {
          const nx = cx + dx, ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          if (mask[ny * W + nx] && !visited[ny * W + nx]) {
            visited[ny * W + nx] = 1
            q.push([nx, ny])
          }
        }
      }
    }
    comps.push({ minX, maxX, minY, maxY, count })
  }
}
const big = comps.filter(c => c.count > 400).sort((a, b) => b.count - a.count)
console.log('找到 ' + comps.length + ' 个亮区，较大 ' + big.length + ' 个：')
big.forEach((c, i) => {
  console.log('  亮区#' + i + '  UV x[' + (c.minX / W).toFixed(3) + ',' + (c.maxX / W).toFixed(3) + '] y[' + (c.minY / H).toFixed(3) + ',' + (c.maxY / H).toFixed(3) + ']  面积' + c.count)
})

// ---- 4. 把亮区映射到 Object_85 的世界坐标 ----
// 找 Object_85 节点
let obj85 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_85') obj85 = n })
if (!obj85) { console.log('找不到 Object_85'); process.exit(0) }
const wm = worldMatrix(obj85.index ?? nodes.indexOf(obj85))
const prim = meshes[obj85.mesh].primitives[0]
const posAcc = accessors[prim.attributes.POSITION]
const uvAcc = prim.attributes.TEXCOORD_0 !== undefined ? accessors[prim.attributes.TEXCOORD_0] : null
const localPts = readAccessor(posAcc)
const uvs = uvAcc ? readAccessor(uvAcc) : null
if (!uvs) { console.log('Object_85 无 UV'); process.exit(0) }

const worldPts = localPts.map(p => transformPoint(wm, p))
console.log('')
console.log('===== 亮区 → Object_85 世界坐标 =====')
big.forEach((c, i) => {
  const uMin = c.minX / W, uMax = c.maxX / W, vMin = c.minY / H, vMax = c.maxY / H
  const inUV = []
  for (let k = 0; k < uvs.length; k++) {
    const u = uvs[k][0], v = uvs[k][1]
    // glTF v 原点在左上；同时试翻转
    const vv = 1 - v
    if (u >= uMin - 0.005 && u <= uMax + 0.005 && (v >= vMin - 0.005 && v <= vMax + 0.005)) inUV.push(worldPts[k])
    else if (u >= uMin - 0.005 && u <= uMax + 0.005 && (vv >= vMin - 0.005 && vv <= vMax + 0.005)) inUV.push(worldPts[k])
  }
  if (!inUV.length) { console.log('  亮区#' + i + ': 无顶点映射'); return }
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity]
  for (const p of inUV) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]) }
  const cc = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2]
  const sz = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]]
  console.log('  亮区#' + i + ': 中心(' + cc.map(x => x.toFixed(3)).join(', ') + ')  尺寸(' + sz.map(x => x.toFixed(3)).join(', ') + ')  顶点数' + inUV.length)
})
