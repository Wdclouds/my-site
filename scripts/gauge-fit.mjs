// gauge-fit.mjs — 主驾面板(Object_88 块#1)内的 3 个圆形码表检测
// 方法: 排除外框顶点 → 对内部顶点做 RANSAC 圆拟合(多次, 每次移除已拟合圆)
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
let o88 = null
nodes.forEach((n, i) => { if ((n.name || '') === 'Object_88') o88 = { node: n, idx: i } })
const m = wm(o88.idx)
const lp = readA(accessors[meshes[o88.node.mesh].primitives[0].attributes.POSITION])
const pts = lp.map(p => tp(m, p)).filter(p => p[0] > -0.42 && p[0] < -0.32)

// 外框: x<-0.410 或 x>-0.330 或 y<0.266 或 y>0.344
const inner = pts.filter(p => p[0] > -0.410 && p[0] < -0.330 && p[1] > 0.266 && p[1] < 0.344)
console.log('内部顶点:', inner.length, '/', pts.length)

// 圆拟合: 3 点定圆(最小二乘近似), RANSAC 迭代
function fitCircle(points) {
  // 最小二乘圆: 对 3 个采样点求圆心/半径
  if (points.length < 3) return null
  // 随机采样 3 点, 求外接圆
  let best = null, bestInliers = 0
  for (let iter = 0; iter < 2000; iter++) {
    const a = points[Math.floor(Math.random() * points.length)]
    const b = points[Math.floor(Math.random() * points.length)]
    const c = points[Math.floor(Math.random() * points.length)]
    if (a === b || b === c || a === c) continue
    // 三点外接圆
    const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1]
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if (Math.abs(d) < 1e-9) continue
    const ux = ((ax*ax+ay*ay) * (by-cy) + (bx*bx+by*by) * (cy-ay) + (cx*cx+cy*cy) * (ay-by)) / d
    const uy = ((ax*ax+ay*ay) * (cx-bx) + (bx*bx+by*by) * (ax-cx) + (cx*cx+cy*cy) * (bx-ax)) / d
    const r = Math.hypot(ax-ux, ay-uy)
    if (r < 0.003 || r > 0.05) continue
    let inliers = 0
    for (const p of points) {
      const dist = Math.abs(Math.hypot(p[0]-ux, p[1]-uy) - r)
      if (dist < 0.004) inliers++
    }
    if (inliers > bestInliers) { bestInliers = inliers; best = { cx: ux, cy: uy, r } }
  }
  return best
}

let remaining = [...inner]
for (let gi = 0; gi < 4; gi++) {
  if (remaining.length < 5) break
  const circle = fitCircle(remaining)
  if (!circle || circle.r < 0.003) break
  console.log(`圆#${gi+1}: 中心(${circle.cx.toFixed(4)}, ${circle.cy.toFixed(4)}) 半径 ${circle.r.toFixed(4)}  支持顶点 ${circle.r}`)
  // 统计支持顶点数(重算)
  const sup = remaining.filter(p => Math.abs(Math.hypot(p[0]-circle.cx, p[1]-circle.cy) - circle.r) < 0.004)
  console.log(`   支持 ${sup.length} 个顶点, 移出后剩 ${remaining.length - sup.length}`)
  // 移除该圆的顶点(圆环上的)
  remaining = remaining.filter(p => Math.abs(Math.hypot(p[0]-circle.cx, p[1]-circle.cy) - circle.r) >= 0.004)
}
console.log('剩余未归属顶点:', remaining.length)
remaining.forEach(p => console.log('  (' + p[0].toFixed(3) + ', ' + p[1].toFixed(3) + ')'))
