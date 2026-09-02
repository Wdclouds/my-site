import express from 'express'
import { getDb } from './blogDb.js'
import { requireAuth } from '../auth/authMiddleware.js'

const router = express.Router()

// 所有后台接口必须管理员鉴权
router.use(requireAuth)

// GET /api/admin/posts 获取所有文章（用于管理列表）
router.get('/posts', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT id, slug, title, excerpt, date, category, tags, is_featured, created_at FROM posts ORDER BY date DESC, id DESC').all()
  const items = rows.map(r => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
    isFeatured: Boolean(r.is_featured)
  }))
  res.json({ items, total: items.length })
})

// POST /api/admin/posts 新增文章
router.post('/posts', (req, res) => {
  const { slug, title, excerpt = '', date, category = 'dev', tags = [], content = '', isFeatured = false } = req.body || {}

  if (!slug || !title) {
    return res.status(400).json({ error: 'slug 与标题为必填项' })
  }

  const cleanSlug = String(slug).trim().toLowerCase().replace(/\s+/g, '-')
  const postDate = date || new Date().toISOString().slice(0, 10)
  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : [tags].filter(Boolean))
  const featuredVal = isFeatured ? 1 : 0

  const db = getDb()
  const existing = db.prepare('SELECT id FROM posts WHERE slug = ?').get(cleanSlug)
  if (existing) {
    return res.status(409).json({ error: '已存在相同 slug 的文章，请更换 slug' })
  }

  const result = db.prepare(`
    INSERT INTO posts (slug, title, excerpt, date, category, tags, content, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(cleanSlug, title, excerpt, postDate, category, tagsJson, content, featuredVal)

  res.status(201).json({
    message: '文章发布成功',
    post: {
      id: Number(result.lastInsertRowid),
      slug: cleanSlug,
      title,
      category,
      date: postDate
    }
  })
})

// PUT /api/admin/posts/:slug 修改文章
router.put('/posts/:slug', (req, res) => {
  const { slug } = req.params
  const { title, excerpt, date, category, tags, content, isFeatured, newSlug } = req.body || {}

  const db = getDb()
  const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug)
  if (!post) {
    return res.status(404).json({ error: '未找到要修改的文章' })
  }

  const targetSlug = newSlug ? String(newSlug).trim().toLowerCase().replace(/\s+/g, '-') : slug
  const targetTitle = title !== undefined ? title : post.title
  const targetExcerpt = excerpt !== undefined ? excerpt : post.excerpt
  const targetDate = date !== undefined ? date : post.date
  const targetCategory = category !== undefined ? category : post.category
  const targetTags = tags !== undefined ? JSON.stringify(tags) : post.tags
  const targetContent = content !== undefined ? content : post.content
  const targetFeatured = isFeatured !== undefined ? (isFeatured ? 1 : 0) : post.is_featured

  db.prepare(`
    UPDATE posts
    SET slug = ?, title = ?, excerpt = ?, date = ?, category = ?, tags = ?, content = ?, is_featured = ?
    WHERE id = ?
  `).run(targetSlug, targetTitle, targetExcerpt, targetDate, targetCategory, targetTags, targetContent, targetFeatured, post.id)

  res.json({
    message: '文章更新成功',
    slug: targetSlug
  })
})

// DELETE /api/admin/posts/:slug 删除文章
router.delete('/posts/:slug', (req, res) => {
  const { slug } = req.params
  const db = getDb()
  const post = db.prepare('SELECT id, title FROM posts WHERE slug = ?').get(slug)
  if (!post) {
    return res.status(404).json({ error: '文章不存在或已被删除' })
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id)
  res.json({ message: `文章《${post.title}》已成功删除` })
})

export default router
