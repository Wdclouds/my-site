import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')
const block = fs.readFileSync('scripts/emitter-block.txt', 'utf8')
const anchor = '  scene.add(camera)\n\n  // ===== 加载车模 ====='
if (!src.includes(anchor)) { console.error('找不到插入锚点'); process.exit(1) }
src = src.replace(anchor, '  scene.add(camera)\n\n' + block + '\n  // ===== 加载车模 =====')
fs.writeFileSync(file, src)
console.log('3D 粒子发射器已插入')