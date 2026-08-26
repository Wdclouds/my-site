<template>
  <!-- 待开发占位内容（棱镜背景已提到 MusicView 全页层，这里只放 logo + 文字） -->
  <div class="underdev-content">
    <img class="feagle-logo" src="/feagleb.svg" alt="FEAGLE" draggable="false" />
    <div class="dev-line">
      <ReactBridge :component="TextScatter" :component-props="devProps" />
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import ReactBridge from '../../components/ReactBridge.vue'
import { TextScatter } from '../../react'

const devProps = reactive({
  text: '此页面待开发',
  velocity: 200,
  rotation: 90,
  scale: 1,
  returnAfter: 1,
  duration: 2,
})
</script>

<style scoped>
.underdev-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 44px;
  pointer-events: none; /* 不挡全页棱镜/滚轮交互 */
}
.feagle-logo {
  width: min(520px, 72vw);
  height: auto;
  display: block;
}
.dev-line {
  min-height: 80px;
  pointer-events: auto;
}
.dev-line > div {
  width: 100%;
  height: 100%;
}
</style>

<style>
.dev-line .text-scatter {
  color: #ffffff;
  font-weight: 900;
  font-size: 52px;
  letter-spacing: 8px;
  line-height: 1.4;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.25);
  width: 100%;
  text-align: center;
}
</style>
