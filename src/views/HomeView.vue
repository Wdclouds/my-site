<template>
  <!-- 主页：待开发替换页（FEagle logo + 此页面待开发散字），
       配同款深色棱镜背景（与音乐页未开发流派一致） -->
  <div class="home-view">
    <!-- 全页棱镜背景层 -->
    <div class="prism-layer">
      <ReactBridge :component="Prism" :component-props="prismProps" />
    </div>
    <!-- 内容层：复用待开发占位页（白 logo + 白色散字，浮于深底之上） -->
    <UnderDevView class="underdev-fill" />
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import ReactBridge from '../components/ReactBridge.vue'
import { Prism } from '../react'
import UnderDevView from './status/UnderDevView.vue'

// 棱镜参数与音乐页未开发流派保持一致（深底 #05050f + transparent 棱镜）
const prismProps = reactive({
  animationType: 'rotate',
  timeScale: 0.5,
  height: 3.5,
  baseWidth: 5.5,
  scale: 3.6,
  hueShift: 0,
  colorFrequency: 1,
  noise: 0,
  glow: 1,
  transparent: true,
  suspendWhenOffscreen: false,
})
</script>

<style scoped>
.home-view {
  position: relative;
  height: 100%;
  background: #05050f; /* 棱镜底色（与音乐页未开发流派同款） */
  overflow: hidden;
}
.prism-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.prism-layer > div {
  width: 100%;
  height: 100%;
}
.underdev-fill {
  position: relative;
  z-index: 1;
  height: 100%;
}
</style>
