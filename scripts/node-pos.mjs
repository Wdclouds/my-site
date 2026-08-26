// 提取 GLB 中所有节点的世界坐标（含空节点/标记点），用于确认屏幕布局
// 用法: node scripts/node-pos.mjs <model.glb> [输出.txt]
import fs from 'fs'

const file = process.argv[2]
const outFile = process.argv[3] || null
const buf = fs.readFileSync(file)
const lines = []
const log = s => { lines.push(s) }

if (buf.readUInt32LE(0) !== 0x46546c67) { console.error('不是 GLB 文件'); process.exit(1) }

let gltf = null
let offset = 12
while (offset + 8 <= buf.length) {
  const len = buf.readUInt32LE(offset)
  const type = buf.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(buf.subarray(offset + 8, offset + 8 + len).toString('utf8'))
  offset += 8 + len
}
if (!gltf) { console.error('找不到 JSON chunk'); process.exit(1) }

const nodes = gltf.nodes || []
const meshes = gltf.meshes || []
const accessors = gltf.accessors || []

function mat4Mul(a, b) {
  const o = new Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c*4+r] = a[0*4+r]*b[c*4+0] + a[1*4+r]*b[c*4+1] + a[2*4+r]*b[c*4+2] + a[3*4+r]*b[c*4+3]
  return o
}
function quatToMat4(q) {
  const [x,y,z,w] = q
  const x2=x+x, y2=y+y, z2=z+z
  const xx=x*x2, xy=x*y2, xz=x*z2, yy=y*y2, yz=y*z2, zz=z*z2
  const wx=w*x2, wy=w*y2, wz=w*z2
  return [
    1-(yy+zz), xy+wz, xz-wy, 0,
    xy-wz, 1-(xx+zz), yz+wx, 0,
    xz+wy, yz-wx, 1-(xx+yy), 0,
    0,0,0,1
  ]
}
function scaleMat(s) { return [s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1] }
function transMat(t) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1] }
function transformPoint(m, p) {
  return [ m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],
           m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],
           m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14] ]
}
const nodeMats = new Array(nodes.length).fill(null)
function worldMatrix(i) {
  if (nodeMats[i]) return nodeMats[i]
  const n = nodes[i]
  let local
  if (n.matrix) local = n.matrix.slice()
  else {
    const t = n.translation || [0,0,0]
    const r = n.rotation || [0,0,0,1]
    const s = n.scale || [1,1,1]
    local = mat4Mul(mat4Mul(transMat(t), quatToMat4(r)), scaleMat(s))
  }
  let m = local
  if (n.parent !== undefined) m = mat4Mul(worldMatrix(n.parent), local)
  nodeMats[i] = m
  return m
}
nodes.forEach((n, i) => { n.index = i; (n.children || []).forEach(c => { nodes[c].parent = i }) })

function meshAABBWorld(meshIdx, worldM) {
  const mesh = meshes[meshIdx]
  if (!mesh) return null
  let mn = null, mx = null
  for (const prim of mesh.primitives || []) {
    const posIdx = prim.attributes && prim.attributes.POSITION
    if (posIdx === undefined) continue
    const acc = accessors[posIdx]
    if (!acc || !acc.min || !acc.max) continue
    const corners = [
      [acc.min[0], acc.min[1], acc.min[2]], [acc.max[0], acc.min[1], acc.min[2]],
      [acc.min[0], acc.max[1], acc.min[2]], [acc.max[0], acc.max[1], acc.min[2]],
      [acc.min[0], acc.min[1], acc.max[2]], [acc.max[0], acc.min[1], acc.max[2]],
      [acc.min[0], acc.max[1], acc.max[2]], [acc.max[0], acc.max[1], acc.max[2]],
    ]
    for (const c of corners) {
      const p = transformPoint(worldM, c)
      if (!mn) { mn = p.slice(); mx = p.slice() }
      else for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]) }
    }
  }
  if (!mn) return null
  return { min: mn, max: mx }
}

const fmt = v => v.map(x => x.toFixed(3)).join(', ')

log('节点总数=' + nodes.length)
log('')
log('===== 关键区域节点（世界坐标）=====')
log('')

// 找出 dials 子树的所有节点 + 全部空节点坐标，按名字过滤
const interested = new Set()
nodes.forEach((n, i) => {
  const name = n.name || ''
  const isDials = name.includes('dials') || name.includes('screen') || name.includes('dash') ||
    name.includes('steering') || name.includes('glow') || /^N\.?\d*_/.test(name) || /^\d+\.?\d*_/.test(name)
  if (isDials) interested.add(i)
})
// 连同父链
const addParents = i => {
  if (i === undefined || interested.has(i)) return
  interested.add(i)
  addParents(nodes[i].parent)
}
;[...interested].forEach(addParents)

;[...interested].forEach(i => {
  const n = nodes[i]
  const m = worldMatrix(i)
  const p = transformPoint(m, [0, 0, 0])
  let extra = ''
  if (n.mesh !== undefined) {
    const bb = meshAABBWorld(n.mesh, m)
    if (bb) extra = '  包围盒min(' + fmt(bb.min) + ') max(' + fmt(bb.max) + ')'
    else extra = '  [mesh 无位置数据]'
  }
  log((n.name || 'node#' + i) + '  世界坐标(' + fmt(p) + ')' + extra)
})

if (outFile) {
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
  console.log('已写入 ' + outFile + ' (' + lines.length + ' 行)')
} else {
  console.log(lines.join('\n'))
}
