import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import express from 'express'
import { connectDB } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 双环境数据库：开发读 .env.development（本地 MongoDB），生产读 .env.production（Atlas）
// 代码里只读 MONGODB_URI，不关心连的是哪套 —— 这就是"两套数据库一套代码"的答案
const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
dotenv.config({ path: path.resolve(__dirname, '..', envFile) })

const app = express()
app.use(express.json())

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' })
})

// 业务路由后续在这里挂载：/api/auth /api/songs /api/comments ...

const PORT = process.env.PORT || 3000

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] API listening on http://127.0.0.1:${PORT} (${envFile})`)
  })
})
