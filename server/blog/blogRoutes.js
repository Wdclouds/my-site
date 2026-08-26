// 博客 API：GET /api/posts?limit=&cursor=（游标分页） + GET /api/posts/:slug
import { Router } from 'express'
import { getDb } from './blogDb.js'

const router = Router()

// 列表：游标分页（按 date 倒序，cursor = 上一页最后一条的 date）
router.get('/', (req, res) => {
  const db = getDb()
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50)
  const cursor = typeof req.query.cursor === 'string' && req.query.cursor ? req.query.cursor : null
  let rows
  if (cursor) {
    rows = db.prepare('SELECT slug, title, excerpt, date, tags FROM posts WHERE date < ? ORDER BY date DESC LIMIT ?').all(cursor, limit + 1)
  } else {
    rows = db.prepare('SELECT slug, title, excerpt, date, tags FROM posts ORDER BY date DESC LIMIT ?').all(limit + 1)
  }
  const hasMore = rows.length > limit
  const items = rows.slice(0, limit).map(r => ({ ...r, tags: JSON.parse(r.tags) }))
  const nextCursor = hasMore ? items[items.length - 1].date : null
  res.json({ items, nextCursor, hasMore })
})

// 详情：全量字段（含 markdown content）
router.get('/:slug', (req, res) => {
  const row = getDb().prepare('SELECT * FROM posts WHERE slug = ?').get(req.params.slug)
  if (!row) return res.status(404).json({ error: 'not found' })
  res.json({ ...row, tags: JSON.parse(row.tags) })
})

export default router