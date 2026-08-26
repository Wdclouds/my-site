<template>
  <div class="post-meta">
    <time>{{ post.date }}</time>
    <span v-for="t in post.tags" :key="t" class="tag">{{ t }}</span>
  </div>
</template>

<script setup>
defineProps({ post: { type: Object, required: true } })
</script>

<style scoped>
.post-meta { display: flex; gap: var(--space-2); align-items: center; font-size: 13px; color: var(--blog-muted); flex-wrap: wrap; }
.tag { background: var(--blog-border); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--blog-text); font-size: 12px; }
</style>
