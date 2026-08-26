<template>
  <div class="house-view">
    <!-- House：明亮动感的绿色 + 毛玻璃面板浮动 -->
    <div class="glass-panel">
      <header class="hero">
        <h1>HOUSE</h1>
        <p>节拍 · 律动 · 派对</p>
      </header>
      <div class="grid">
        <div v-for="(s, i) in songs" :key="s" class="card">
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="name">{{ s }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const songs = ['节拍工厂', '午夜律动', '地下室派对', '霓虹节拍', '能量脉冲']
</script>

<style scoped>
.house-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6vw;
  /* 背景由 MusicView 容器统一提供（同款渐变），此处透明 */
  color: #fff;
  overflow-y: auto;
}

/* 毛玻璃浮层 */
.glass-panel {
  width: min(560px, 70%);
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.hero h1 {
  font-size: 2.6rem;
  letter-spacing: 0.3em;
}

.hero p {
  color: rgba(255, 255, 255, 0.75);
  margin-top: 0.4rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.8rem;
  margin-top: 1.8rem;
}

.card {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.9rem 1.1rem;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  transition: background 0.2s;
  cursor: default;
}

.card:hover {
  background: rgba(255, 255, 255, 0.22);
}

.idx {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
}

.name {
  font-size: 0.95rem;
}
</style>
