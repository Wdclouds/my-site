<template>
  <div class="techno-view">
    <!-- Techno：冷峻深紫 + 霓虹线框（背景层），毛玻璃面板浮动 -->
    <div class="glow-line" />
    <div class="glass-panel">
      <h1 class="title">TECHNO</h1>
      <ul class="list">
        <li v-for="(s, i) in songs" :key="s" class="row">
          <span class="row-idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="row-name">{{ s }}</span>
          <span class="row-bar" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const songs = ['机械之心', '电子迷宫', '脉冲信号', '暗黑舞池', '数据流']
</script>

<style scoped>
.techno-view {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6vw;
  /* 背景由 MusicView 容器统一提供（同款渐变），此处透明 */
  color: #e6d9ff;
  overflow-y: auto;
}

.glow-line {
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #a55eea, transparent);
  box-shadow: 0 0 12px #a55eea;
  z-index: 0;
}

/* 毛玻璃浮层 */
.glass-panel {
  position: relative;
  z-index: 1;
  width: min(560px, 70%);
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(165, 94, 234, 0.2);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 2.4rem;
  letter-spacing: 0.4em;
  color: #fff;
  text-shadow: 0 0 18px rgba(165, 94, 234, 0.8);
}

.list {
  list-style: none;
  margin-top: 1.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 0.7rem 0.5rem;
  border-bottom: 1px solid rgba(165, 94, 234, 0.3);
  cursor: default;
  transition: padding-left 0.2s;
}

.row:hover {
  padding-left: 1rem;
  border-bottom-color: #a55eea;
}

.row-idx {
  font-size: 0.8rem;
  color: rgba(230, 217, 255, 0.5);
  font-variant-numeric: tabular-nums;
}

.row-name {
  font-size: 1rem;
}

.row-bar {
  margin-left: auto;
  width: 60px;
  height: 4px;
  background: rgba(165, 94, 234, 0.5);
  border-radius: 2px;
}
</style>
