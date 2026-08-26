<template>
  <div class="synthwave-view">
    <!-- Synthwave：霓虹太阳 + 网格地平线（背景层），毛玻璃面板浮动 -->
    <div class="sun" />
    <div class="grid-floor" />
    <div class="glass-panel">
      <h1 class="title">SYNTHWAVE</h1>
      <p class="sub">复古 · 未来 · 霓虹</p>
      <ul class="list">
        <li v-for="(s, i) in songs" :key="s" class="row">
          <span class="idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="name">{{ s }}</span>
          <span class="bar" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const songs = ['霓虹落日', '复古未来', '合成器浪潮', '像素公路', '午夜驾驶']
</script>

<style scoped>
.synthwave-view {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 6vw;
  /* 背景由 MusicView 容器统一提供（同款渐变），此处透明 */
  color: #ffd6f5;
  overflow: hidden;
}

.sun {
  position: absolute;
  right: 8%;
  top: 8%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ff9a3d, #ff4d9d);
  opacity: 0.75;
  filter: blur(2px);
  box-shadow: 0 0 60px rgba(255, 77, 157, 0.6);
  z-index: 0;
}

.grid-floor {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: 0;
  height: 35%;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 77, 157, 0.35) 0 2px,
    transparent 2px 60px
  ), repeating-linear-gradient(
    0deg,
    rgba(255, 77, 157, 0.35) 0 2px,
    transparent 2px 34px
  );
  transform: perspective(300px) rotateX(55deg);
  transform-origin: bottom;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
  z-index: 0;
}

/* 毛玻璃浮层 */
.glass-panel {
  position: relative;
  z-index: 1;
  width: min(540px, 70%);
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 77, 157, 0.2);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.title {
  font-size: 2.4rem;
  letter-spacing: 0.35em;
  color: #fff;
  text-shadow: 0 0 20px #ff4d9d, 0 0 40px #ff4d9d;
}

.sub {
  color: rgba(255, 214, 245, 0.65);
  margin-top: 0.4rem;
  letter-spacing: 0.3em;
}

.list {
  list-style: none;
  margin-top: 1.8rem;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0.8rem;
  border-left: 3px solid #ff4d9d;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 0 10px 10px 0;
  cursor: default;
  transition: background 0.2s;
}

.row:hover {
  background: rgba(255, 77, 157, 0.2);
}

.idx {
  font-size: 0.8rem;
  color: rgba(255, 214, 245, 0.5);
  font-variant-numeric: tabular-nums;
}

.name {
  font-size: 0.95rem;
}

.bar {
  margin-left: auto;
  width: 40px;
  height: 3px;
  background: linear-gradient(90deg, #ff9a3d, #ff4d9d);
  border-radius: 2px;
}
</style>
