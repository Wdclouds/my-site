import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

// Vue + React 双插件共存：
// - 主框架用 Vue（.vue 文件）
// - react bits 之类的小组件用 React（.jsx/.tsx 文件），通过 src/components/ReactBridge.vue 桥接进 Vue 页面
export default defineConfig({
  plugins: [vue(), react()],
  server: {
    port: 5173,
    proxy: {
      // 前端请求 /api/* 转发到本地后端
      '/api': 'http://127.0.0.1:3000'
    }
  }
})
