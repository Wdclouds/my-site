<template>
  <div class="jazz-view">
    <!-- Jazz：暖棕复古 + 衬线标题，毛玻璃面板居中浮动 -->
    <div class="glass-panel">
      <h1 class="title">JAZZ</h1>
      <p class="sub">蓝调 · 即兴 · 深夜</p>
      <ul class="list">
        <li v-for="(s, i) in songs" :key="s" class="row">
          <span class="note">♪</span>
          <span class="name">{{ s }}</span>
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const songs = ['蓝调咖啡', '深夜爵士', '即兴摇摆', '萨克斯风语', '雾都小调', '微醺月光']
</script>

<style scoped>
.jazz-view {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 背景由 MusicView 容器统一提供（同款渐变），此处透明 */
  color: #f5e9d0;
  overflow-y: auto;
}

/* 毛玻璃浮层 */
.glass-panel {
  width: min(480px, 80%);
  background: rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(248, 237, 216, 0.12);
  border-radius: 20px;
  padding: 2.2rem 2.6rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 3rem;
  letter-spacing: 0.25em;
  color: #f8edd8;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.sub {
  color: rgba(245, 233, 208, 0.65);
  margin-top: 0.5rem;
  letter-spacing: 0.35em;
}

.list {
  list-style: none;
  margin: 2rem auto 0;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 0.6rem 1.2rem;
  background: rgba(0, 0, 0, 0.18);
  border-radius: 30px;
  border: 1px solid rgba(248, 237, 216, 0.15);
  cursor: default;
  transition: background 0.2s;
}

.row:hover {
  background: rgba(0, 0, 0, 0.3);
}

.note {
  color: #e8c170;
}

.name {
  font-size: 1rem;
}

.idx {
  font-size: 0.75rem;
  color: rgba(245, 233, 208, 0.45);
  font-variant-numeric: tabular-nums;
}
</style>
