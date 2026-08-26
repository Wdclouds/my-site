<template>
  <button class="tag-badge" :class="{ active }" @click="$emit('pick', tag)">
    {{ tag }}
  </button>
</template>

<script setup>
defineProps({ tag: { type: String, required: true }, active: { type: Boolean, default: false } })
defineEmits(['pick'])
</script>

<style scoped>
.tag-badge { border: 1px solid var(--blog-border); background: var(--blog-surface); color: var(--blog-muted); border-radius: 999px; padding: 4px 12px; font-size: 13px; cursor: pointer; }
.tag-badge.active { border-color: var(--blog-accent); color: var(--blog-accent); }
</style>
