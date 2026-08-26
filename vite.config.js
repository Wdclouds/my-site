import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

// Vue + React 双插件共存：
// - 主框架用 Vue（.vue 文件）
// - react bits 之类的小组件用 React（.jsx/.tsx 文件），通过 src/components/ReactBridge.vue 桥接进 Vue 页面
export default defineConfig({
  plugins: [vue(), react()],
  build: {
    rollupOptions: {
      output: {
        // 防线：React 体系独立 chunk，保证移动端首屏不下载（配合 defineAsyncComponent 按树拆分）
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 前端请求 /api/* 转发到本地后端
      '/api': 'http://127.0.0.1:3000',
      // 封面图片 /covers/* 也转发到后端（浏览器里 <img src="/covers/..."> 走这里）
      '/covers': 'http://127.0.0.1:3000'
      // 注意：不要加 /music 代理 —— 前端路由 /music（音乐页）会和音频目录 /music/* 冲突
    }
  }
})
