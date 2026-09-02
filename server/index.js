import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import { connectDB } from './db.js'
import songsRouter from './routes/songs.js'
import blogRouter from './blog/blogRoutes.js'
import authRouter from './auth/authRoutes.js'
import adminBlogRouter from './blog/adminBlogRoutes.js'
import { initAuthTables } from './auth/authDb.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 双环境数据库：开发读 .env.development（本地 MongoDB），生产读 .env.production（Atlas）
// 代码里只读 MONGODB_URI，不关心连的是哪套 —— 这就是"两套数据库一套代码"的答案
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
dotenv.config({ path: path.resolve(__dirname, '..', envFile) })

const app = express()
app.use(express.json())

// 博客与知识库 API：/api/posts + /api/wiki
app.use('/api/posts', blogRouter)
app.use('/api', blogRouter)

// 音乐文件静态托管：server/public/music/ → /music/*
// 生产环境建议由 nginx 直接托管 /var/www/music/（性能更好），此处为本地开发兜底
app.use(
  '/music',
  express.static(path.join(__dirname, 'public', 'music'), {
    setHeaders: res => {
      // 音频支持 Range 请求（拖动进度条），默认 express.static 已支持
      res.setHeader('Accept-Ranges', 'bytes')
    }
  })
)

// 封面图片静态托管：server/public/covers/ → /covers/*
app.use('/covers', express.static(path.join(__dirname, 'public', 'covers')))

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' })
})

// 认证与后台管理路由
app.use('/api/auth', authRouter)
app.use('/api/admin', adminBlogRouter)

// 业务路由
app.use('/api/songs', songsRouter) // 歌曲列表/流派

const PORT = process.env.PORT || 3000

initAuthTables()

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] API listening on http://127.0.0.1:${PORT} (${envFile})`)
  })
})
