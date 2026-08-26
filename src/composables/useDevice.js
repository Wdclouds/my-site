// 设备嗅探：视口宽度断点（博客双端分流用，默认 768px）
import { ref, onMounted, onUnmounted } from 'vue'

export function useDevice(breakpoint = 768) {
  const isDesktop = ref(true)
  const update = () => { isDesktop.value = window.innerWidth >= breakpoint }
  onMounted(() => {
    update()
    window.addEventListener('resize', update, { passive: true })
  })
  onUnmounted(() => { window.removeEventListener('resize', update) })
  return { isDesktop }
}