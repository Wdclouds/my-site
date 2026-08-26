// 解剖 GLB 模型：输出节点树 + 每个 mesh 部件的世界包围盒
// 用法: node scripts/dump-glb.mjs <model.glb> [输出.txt]
import fs from 'fs'

const file = process.argv[2]
const outFile = process.argv[3] || null
const buf = fs.readFileSync(file)
const lines = []
const log = s => { lines.push(s) }

if (buf.readUInt32LE(0) !== 0x46546c67) { console.error('不是 GLB 文件'); process.exit(1) }
log('文件: ' + file + '  (' + (buf.length / 1048576).toFixed(1) + ' MB)  GLB v' + buf.readUInt32LE(4))

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
const materials = gltf.materials || []
const accessors = gltf.accessors || []
const scenes = gltf.scenes || []

log('节点数=' + nodes.length + '  mesh数=' + meshes.length + '  材质数=' + materials.length + '  场景数=' + scenes.length)
log('')

// ---- 矩阵工具（column-major）----
function mat4Identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }
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
  const x = m[0]*p[0] + m[4]*p[1] + m[8]*p[2] + m[12]
  const y = m[1]*p[0] + m[5]*p[1] + m[9]*p[2] + m[13]
  const z = m[2]*p[0] + m[6]*p[1] + m[10]*p[2] + m[14]
  return [x, y, z]
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

// 先给每个节点记录 parent（从 children 反推）
nodes.forEach((n, i) => { n.index = i; (n.children || []).forEach(c => { nodes[c].parent = i }) })

// mesh 的世界包围盒
function meshWorldAABB(meshIdx, worldM) {
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
  return {
    min: mn, max: mx,
    center: [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2],
    size: [mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]],
  }
}

function meshMaterials(meshIdx) {
  const mesh = meshes[meshIdx]
  if (!mesh) return []
  const names = []
  for (const prim of mesh.primitives || []) {
    if (prim.material !== undefined) {
      const name = materials[prim.material] ? materials[prim.material].name || ('mat#' + prim.material) : '(无)'
      if (!names.includes(name)) names.push(name)
    }
  }
  return names
}

function fmt(v) { return v.map(x => x.toFixed(2)).join(', ') }

// 递归输出树
function walk(i, depth, path) {
  const n = nodes[i]
  const nm = worldMatrix(i)
  const myPath = path + '/' + (n.name || ('node#' + i))
  const indent = '  '.repeat(depth)
  if (n.mesh !== undefined) {
    const bb = meshWorldAABB(n.mesh, nm)
    const mats = meshMaterials(n.mesh)
    if (bb) {
      log(indent + '▸ ' + (n.name || ('node#' + i)) + '  [mesh]  mat=' + mats.join('|') +
          '  中心(' + fmt(bb.center) + ')  尺寸(' + fmt(bb.size) + ')')
      log(indent + '    min(' + fmt(bb.min) + ')  max(' + fmt(bb.max) + ')  路径=' + myPath)
    } else {
      log(indent + '▸ ' + (n.name || ('node#' + i)) + '  [mesh]  mat=' + mats.join('|') + '  (无位置数据)')
    }
  } else if ((n.children || []).length) {
    log(indent + '▪ ' + (n.name || ('node#' + i)) + '  [组]')
  } else {
    log(indent + '▪ ' + (n.name || ('node#' + i)) + '  [空节点]')
  }
  for (const c of n.children || []) walk(c, depth + 1, myPath)
}

// 从每个场景根开始
for (const sc of scenes) {
  log('===== 场景: ' + (sc.name || 'default') + ' =====')
  for (const root of sc.nodes || []) walk(root, 0, '')
  log('')
}

if (outFile) {
  fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
  console.log('已写入 ' + outFile + ' (' + lines.length + ' 行)')
} else {
  console.log(lines.join('\n'))
}
