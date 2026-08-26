// 从 GLB 提取 script_rt_dials_race* 材质的发光贴图
import fs from 'fs'
import path from 'path'

const buf = fs.readFileSync(process.argv[2])
const outDir = process.argv[3] || 'scripts/tex'
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
fs.mkdirSync(outDir, { recursive: true })
const mats = gltf.materials || []
const texs = gltf.textures || []
const images = gltf.images || []
const bufferViews = gltf.bufferViews || []
const samplers = gltf.samplers || []

function saveTexture(texIdx, label) {
  const tex = texs[texIdx]
  if (!tex) { console.log(label + ': 无贴图'); return }
  const img = images[tex.source]
  if (!img) { console.log(label + ': 无 image'); return }
  const mime = img.mimeType || (img.uri ? path.extname(img.uri) : '.bin')
  let bytes = null
  if (img.bufferView !== undefined) {
    const bv = bufferViews[img.bufferView]
    bytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)
  } else if (img.uri && img.uri.startsWith('data:')) {
    const m = img.uri.match(/^data:[^;]+;base64,(.*)$/)
    bytes = Buffer.from(m[1], 'base64')
  }
  if (!bytes) { console.log(label + ': 无数据'); return }
  const ext = mime === 'image/png' ? 'png' : mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'bin'
  const file = path.join(outDir, label + '.' + ext)
  fs.writeFileSync(file, bytes)
  console.log(label + ' -> ' + file + ' (' + bytes.length + ' B, ' + mime + ')')
}

mats.forEach((m, i) => {
  const name = m.name || 'mat' + i
  if (!name.includes('script_rt_dials_race')) return
  if (m.emissiveTexture) saveTexture(m.emissiveTexture.index, name.replace(/[^\w.]+/g, '_'))
  if (m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture) {
    saveTexture(m.pbrMetallicRoughness.baseColorTexture.index, name.replace(/[^\w.]+/g, '_') + '__base')
  }
})
