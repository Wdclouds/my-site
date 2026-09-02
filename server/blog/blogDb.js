// server/blog/blogDb.js
// 适配 Node 22 原生 SQLite (node:sqlite)
// 数据源支持：1. 本地 my-site/server/blog/blog.sqlite 或 2. /opt/netcatty-apps/my-site-data/blog/blog.sqlite
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function resolveDbPath() {
  // 1. 优先使用环境变量
  if (process.env.BLOG_DB_PATH && fs.existsSync(process.env.BLOG_DB_PATH)) {
    return process.env.BLOG_DB_PATH
  }
  // 2. 生产服务器路径
  const prodPath = '/opt/netcatty-apps/my-site-data/blog/blog.sqlite'
  if (fs.existsSync(prodPath)) {
    return prodPath
  }
  // 3. 本地编译产物或开发路径
  const localPostsDist = path.resolve(__dirname, '../../../my-blog-posts/dist/blog.sqlite')
  if (fs.existsSync(localPostsDist)) {
    return localPostsDist
  }
  const defaultLocal = path.join(__dirname, 'blog.sqlite')
  return defaultLocal
}

const dbPath = resolveDbPath()
console.log(`[blogDb] 挂载 SQLite 数据库: ${dbPath}`)

// 确保目录存在
const dir = path.dirname(dbPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

export const db = new DatabaseSync(dbPath)

// 初始化基础表（防止空库报错）
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT,
    date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'dev',
    tags TEXT NOT NULL DEFAULT '[]',
    content TEXT NOT NULL,
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS wiki_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'dev',
    icon TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS wiki_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_slug TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(topic_slug, slug)
  );
`)
