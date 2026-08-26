// 移除 PanoramaSphere 中所有粒子相关代码
import fs from 'fs'
const file = 'src/components/PanoramaSphere.vue'
let src = fs.readFileSync(file, 'utf8')

// 1) 粒子系统块（注释→camera.add(particleMesh)），保留 scene.add(camera)
const pStart = src.indexOf('  // ===== 粒子（Lightspeed shader 移植：流星流光）=====')
if (pStart < 0) { console.error('找不到粒子块起点'); process.exit(1) }
const pAnchor = '  camera.add(particleMesh)'
const pEnd = src.indexOf(pAnchor, pStart)
if (pEnd < 0) { console.error('找不到 camera.add(particleMesh)'); process.exit(1) }
src = src.slice(0, pStart) + src.slice(pEnd + pAnchor.length)
console.log('已移除粒子系统块')

// 2) animate 里的粒子绑定段
const aStart = src.indexOf('    // ===== 粒子绑定音乐状态（GlitterWarp）=====')
if (aStart >= 0) {
  const aEnd = src.indexOf('renderer.render(scene, camera)', aStart)
  // 删除 绑定注释 到 render 之前的整段（含尾随空行）
  src = src.slice(0, aStart) + src.slice(aEnd)
  console.log('已移除 animate 粒子绑定段')
} else console.log('animate 绑定段未找到（可能已删）')

// 3) resize 里的 iResolution 更新
const rStart = src.indexOf('    particleUniforms.iResolution.value.set(')
if (rStart >= 0) {
  const rEnd = src.indexOf('    )', rStart) + 6
  src = src.slice(0, rStart) + src.slice(rEnd)
  console.log('已移除 resize iResolution 更新')
} else console.log('resize 引用未找到')

// 4) 头部注释里的粒子描述
const hOld = ' * 分层（从下到上）：HDR 星云背景 → 光速粒子（窗外）→ 兰博基尼车体 → 切换流派层（Vue 层）\n * - 粒子作为 ShaderMaterial 全屏四边形，挂到相机上（始终在视野内），\n *   深度测试开启 → 车体自然遮挡粒子（粒子只透过车窗/挡风玻璃可见）\n * - 鼠标移到屏幕左右边缘 → 视角向该方向缓转（边缘转头）'
const hNew = ' * 分层（从下到上）：HDR 星云背景 → 兰博基尼车体 → 切换流派层（Vue 层）\n * - 鼠标移到屏幕左右边缘 → 视角向该方向缓转（边缘转头）'
src = src.replace(hOld, hNew)
console.log('已更新头部注释')

// 清理多余空行（连续 3+ 空行 → 2）
src = src.replace(/\n{4,}/g, '\n\n\n')
fs.writeFileSync(file, src)
console.log('完成：粒子相关代码已全部移除')