<template>
  <div class="ambient-view">
    <!-- 歌单（背景 DomeGallery 已提升到 MusicView 全页层） -->
    <div class="playlist">
      <h2 class="pl-title">Ambient 歌单</h2>
      <ul class="pl-list">
        <li v-for="(s, i) in songs" :key="s" class="pl-item">
          <span class="pl-idx">{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="pl-name">{{ s }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
const songs = ['雾中森林', '静水', '夜空微光', '晨露', '远山回声', '潮汐']
</script>

<style scoped>
.ambient-view {
  position: relative;
  height: 100%;
  overflow: hidden;
  /* Ambient 时 MusicView 内容层是穿透的，歌单需要自己恢复交互 */
  pointer-events: none;
}

.playlist {
  position: absolute;
  right: 4vw;
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08); /* 边框更淡（原 0.15） */
  border-radius: 16px;
  padding: 1.2rem 1.4rem;
  backdrop-filter: blur(6px);
  pointer-events: auto; /* 歌单区域可交互 */
}

.pl-title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.8rem;
}

.pl-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.pl-item {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  cursor: default;
}

.pl-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.pl-idx {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
}

.pl-name {
  font-size: 0.95rem;
}
</style>
