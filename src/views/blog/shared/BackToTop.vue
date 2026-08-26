<template>
  <button v-show="visible" class="back-top" title="回到顶部" @click="scrollTop">↑</button>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { uiState } from '../../../stores/uiState'

const visible = ref(false)

function findEl() {
  if (uiState.scrollEl && typeof uiState.scrollEl.scrollTop === 'number') return uiState.scrollEl
  return document.querySelector('.blog-home, .blog-post')
}

function onScroll(e) {
  const el = e.target === document ? document.scrollingElement : e.target
  if (el && typeof el.scrollTop === 'number' && el !== document.body && el !== document.documentElement) {
    uiState.scrollEl = el
  }
  const target = uiState.scrollEl
  visible.value = target ? target.scrollTop > 300 : false
}

function scrollTop() {
  const el = findEl()
  if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => document.addEventListener('scroll', onScroll, { capture: true, passive: true }))
onBeforeUnmount(() => document.removeEventListener('scroll', onScroll, { capture: true }))
</script>

<style scoped>
.back-top {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 60;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  box-shadow: var(--shadow-emboss);
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.back-top:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15); }
</style>
