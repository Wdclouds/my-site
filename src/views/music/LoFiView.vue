<template>
  <div class="lofi-view">
    <!-- Lo-Fi：柔和灰紫 + 黑胶唱片，毛玻璃面板浮动 -->
    <div class="glass-panel">
      <h1 class="title">LO-FI</h1>
      <p class="sub">自习 · 雨天 · 发呆</p>
      <div class="cards">
        <div v-for="(s, i) in songs" :key="s" class="card">
          <div class="vinyl" />
          <div class="meta">
            <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="name">{{ s }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const songs = ['旧磁带', '雨天自习室', '黑胶唱片', '黄昏收音机', '书页翻动', '热可可']
</script>

<style scoped>
.lofi-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6vw;
  /* 背景由 MusicView 容器统一提供（同款渐变），此处透明 */
  color: #efe8f7;
  overflow-y: auto;
}

/* 毛玻璃浮层 */
.glass-panel {
  width: min(560px, 70%);
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.title {
  font-size: 2.4rem;
  letter-spacing: 0.3em;
  font-weight: 300;
}

.sub {
  color: rgba(239, 232, 247, 0.6);
  margin-top: 0.4rem;
  letter-spacing: 0.2em;
}

.cards {
  margin-top: 1.8rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.8rem;
}

.card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  cursor: default;
  transition: transform 0.2s, background 0.2s;
}

.card:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.15);
}

.vinyl {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #2a2233 30%, #6b5d7d 31%, #2a2233 33%, #6b5d7d 50%, #2a2233 51%);
  box-shadow: inset 0 0 0 6px #4a3f5c;
  flex-shrink: 0;
}

.meta {
  display: flex;
  flex-direction: column;
}

.idx {
  font-size: 0.7rem;
  color: rgba(239, 232, 247, 0.45);
  font-variant-numeric: tabular-nums;
}

.name {
  font-size: 0.9rem;
  margin-top: 0.15rem;
}
</style>
