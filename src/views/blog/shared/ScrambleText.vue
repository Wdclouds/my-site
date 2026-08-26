<template>
  <span class="scramble">{{ display }}</span>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ text: { type: String, required: true } })
const display = ref('')
let raf = 0

onMounted(() => {
  const target = props.text
  const chars = 'アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let frame = 0
  const total = 42
  const step = () => {
    frame++
    const progress = frame / total
    const settled = Math.floor(target.length * Math.min(1, progress * 1.25))
    let out = ''
    for (let i = 0; i < target.length; i++) {
      if (i < settled || progress >= 1) out += target[i]
      else out += chars[Math.floor(Math.random() * chars.length)]
    }
    display.value = out
    if (frame < total) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>
