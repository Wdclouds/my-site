// 检查 GLB 材质：发光/屏幕相关材质 + 使用它们的 mesh 世界包围盒
import fs from 'fs'

const buf = fs.readFileSync(process.argv[2])
let gltf = null
let offset = 12
while (offset + 8 <= buf.length) {
  const len = buf.readUInt32LE(offset)
  const type = buf.readUInt32LE(offset + 4)
  if (type === 0x4e4f534a) gltf = JSON.parse(buf.subarray(offset + 8, offset + 8 + len).toString('utf8'))
  offset += 8 + len
}
const nodes = gltf.nodes || []
const meshes = gltf.meshes || []
const mats = gltf.materials || []
const accessors = gltf.accessors || []

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
      [acc.min[0],acc.min[1],acc.min[2]],[acc.max[0],acc.min[1],acc.min[2]],
      [acc.min[0],acc.max[1],acc.min[2]],[acc.max[0],acc.max[1],acc.min[2]],
      [acc.min[0],acc.min[1],acc.max[2]],[acc.max[0],acc.min[1],acc.max[2]],
      [acc.min[0],acc.max[1],acc.max[2]],[acc.max[0],acc.max[1],acc.max[2]],
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

console.log('===== 全部材质（名称 | 发光强度 | 发光贴图 | 基础色）=====')
mats.forEach((m, i) => {
  const em = m.emissive || {}
  const hasEmMap = !!(m.emissiveTexture)
  const base = m.pbrMetallicRoughness || {}
  const bc = base.baseColorFactor ? base.baseColorFactor.map(x => x.toFixed(2)).join(',') : (base.baseColorTexture ? '(贴图)' : '')
  console.log('[' + i + '] ' + (m.name || '(无名)') + '  | 发光强度=' + (em.intensity !== undefined ? em.intensity : '?') + '  | 发光贴图=' + (hasEmMap ? '有' : '无') + '  | 基色=' + bc)
})
console.log('')
console.log('===== 发光强度 > 0 或带发光贴图的材质所作用的 mesh（世界包围盒）=====')
const fmt = v => v.map(x => x.toFixed(3)).join(',')
nodes.forEach((n, i) => {
  if (n.mesh === undefined) return
  const mesh = meshes[n.mesh]
  if (!mesh) return
  const usedMats = new Set()
  for (const prim of mesh.primitives || []) {
    if (prim.material !== undefined) {
      const m = mats[prim.material]
      if (m && ((m.emissive && m.emissive.intensity > 0) || m.emissiveTexture)) usedMats.add(prim.material)
    }
  }
  if (usedMats.size === 0) return
  const bb = meshAABBWorld(n.mesh, worldMatrix(i))
  const names = [...usedMats].map(k => (mats[k].name || 'mat#' + k))
  if (bb) {
    console.log((n.name || 'node#' + i) + '  mat=' + names.join('|') + '  min(' + fmt(bb.min) + ') max(' + fmt(bb.max) + ')  尺寸(' + fmt([bb.max[0]-bb.min[0], bb.max[1]-bb.min[1], bb.max[2]-bb.min[2]]) + ')')
  }
})
