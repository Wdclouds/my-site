import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')
const block = fs.readFileSync('scripts/anchored-lightspeed.txt', 'utf8')
const start = src.indexOf('  // ===== 3D 粒子发射器：车面前世界原点，粒子向外喷射（Points + 顶点 shader，世界固定）=====')
if (start < 0) { console.error('找不到旧发射器块起点'); process.exit(1) }
const endAnchor = '  scene.add(particlePoints)'
const end = src.indexOf(endAnchor, start)
if (end < 0) { console.error('找不到旧块终点'); process.exit(1) }
src = src.slice(0, start) + block + src.slice(end + endAnchor.length)
fs.writeFileSync(file, src)
console.log('已替换为锚定 Lightspeed shader')