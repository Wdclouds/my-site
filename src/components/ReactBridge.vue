<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { createRoot } from 'react-dom/client'
import React from 'react'

/**
 * ReactBridge —— 把 React 组件桥接进 Vue 页面
 *
 * 用法（在任意 .vue 文件里）：
 *   <ReactBridge :component="SomeReactWidget" :component-props="{ text: 'hi' }" />
 *
 * 其中 SomeReactWidget 是从 src/react/ 下 import 的 .jsx 组件
 * （比如 react bits 里下载的组件）
 *
 * componentProps 是响应式的：Vue 侧改动后会自动重渲染 React 组件
 */
const props = defineProps({
  component: { type: [Object, Function], required: true },
  componentProps: { type: Object, default: () => ({}) }
})

const mountEl = ref(null)
let root = null

function render() {
  if (!mountEl.value) return
  if (!root) {
    root = createRoot(mountEl.value)
  }
  root.render(React.createElement(props.component, props.componentProps))
}

onMounted(render)
onBeforeUnmount(() => {
  if (root) root.unmount()
})

// props 变化时重渲染 React 组件（深层监听）
watch(
  () => props.componentProps,
  () => {
    if (root) render()
  },
  { deep: true }
)
</script>

<template>
  <div ref="mountEl"></div>
</template>
