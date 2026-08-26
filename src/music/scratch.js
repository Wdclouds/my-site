// ============================================================
// 搓碟（Scratch）共享状态：魔环点击 → 粒子回溯 + 音效 + 歌曲回退
// PanoramaSphere（粒子）与 MusicView（触发）共用，避免跨组件事件总线
// ============================================================
import { reactive } from 'vue'

export const scratchState = reactive({
  active: false, // 搓碟回溯中
  until: 0, // 回溯截止时间戳（ms）
  duration: 1000, // 回溯时长（1 秒，与音效同步）
})

// 触发一次搓碟（魔环点击时调用）
export function triggerScratch(duration = 1000) {
  scratchState.active = true
  scratchState.until = performance.now() + duration
  scratchState.duration = duration
}

// 每帧查询：是否处于回溯窗口内（由 PanoramaSphere 调用）
export function isScratching(now = performance.now()) {
  if (scratchState.active && now >= scratchState.until) {
    scratchState.active = false
  }
  return scratchState.active
}