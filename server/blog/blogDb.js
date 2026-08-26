// 博客数据库：node:sqlite（Node 22+，需 --experimental-sqlite 标志运行）
// 表结构沿用 notion-blog-mvp：posts(slug/title/excerpt/date/tags/content/notion_page_id/notion_last_edited_time)
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedPosts } from './seed-data.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'blog.sqlite')

let db = null

export function getDb() {
  if (db) return db
  db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      slug                    TEXT PRIMARY KEY,
      title                   TEXT NOT NULL,
      excerpt                 TEXT NOT NULL DEFAULT '',
      date                    TEXT NOT NULL,
      tags                    TEXT NOT NULL DEFAULT '[]',
      content                 TEXT NOT NULL,
      notion_page_id          TEXT UNIQUE,
      notion_last_edited_time TEXT
    )
  `)
  // 列表按 date 倒序游标分页，建索引
  db.exec('CREATE INDEX IF NOT EXISTS idx_posts_date ON posts(date DESC)')
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM posts').get()
  if (c === 0) {
    const ins = db.prepare('INSERT INTO posts (slug, title, excerpt, date, tags, content) VALUES (?, ?, ?, ?, ?, ?)')
    for (const p of seedPosts) {
      ins.run(p.slug, p.title, p.excerpt, p.date, JSON.stringify(p.tags), p.content)
    }
    console.log('[blog] 写入 ' + seedPosts.length + ' 篇示例文章')
  }
  return db
}