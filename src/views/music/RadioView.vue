<template>
  <!-- Nova FM：UI 已全部移入 3D 车舱场景（PanoramaSphere 的 CanvasTexture 屏幕），
       播放器初始化与切歌刷新逻辑已上提至 MusicView，本组件纯占位 -->
  <div class="nova-view"></div>
</template>

<style scoped>
.nova-view {
  position: relative;
  height: 100%;
  overflow: hidden;
  pointer-events: none; /* 不拦截事件，3D 场景（下层）接收点击 */
}
</style>
