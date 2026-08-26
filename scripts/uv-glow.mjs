// 读发光件(Object_8..38) 的 UV + 世界坐标，关联贴图区域
import fs from 'fs'

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

// 发光件 + Object_85/88 的 UV 与中心
const targets = []
nodes.forEach((n, i) => {
  const name = n.name || ''
  if (!/^Object_(8|10|12|14|16|18|20|22|24|26|28|30|32|34|36|38|85|88|214|216)$/.test(name)) return
  if (n.mesh === undefined) return
  const wm = worldMatrix(i)
  const prim = meshes[n.mesh].primitives[0]
  const posAcc = accessors[prim.attributes.POSITION]
  const uvAcc = prim.attributes.TEXCOORD_0 !== undefined ? accessors[prim.attributes.TEXCOORD_0] : null
  const localPts = readAccessor(posAcc)
  const uvs = uvAcc ? readAccessor(uvAcc) : null
  const pts = localPts.map(p => transformPoint(wm, p))
  const mn = [Infinity,Infinity,Infinity], mx = [-Infinity,-Infinity,-Infinity]
  for (const p of pts) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],p[k]); mx[k]=Math.max(mx[k],p[k]) }
  const c = [(mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2]
  let uvStr = '无UV'
  if (uvs && uvs.length) {
    const uMin = Math.min(...uvs.map(u=>u[0])), uMax = Math.max(...uvs.map(u=>u[0]))
    const vMin = Math.min(...uvs.map(u=>u[1])), vMax = Math.max(...uvs.map(u=>u[1]))
    uvStr = 'UV x[' + uMin.toFixed(3) + ',' + uMax.toFixed(3) + '] y[' + vMin.toFixed(3) + ',' + vMax.toFixed(3) + '] (顶点' + uvs.length + ')'
  }
  targets.push({ name, c, uvStr })
})
for (const t of targets) {
  console.log(t.name + '  世界(' + t.c.map(x=>x.toFixed(3)).join(', ') + ')  ' + t.uvStr)
}
