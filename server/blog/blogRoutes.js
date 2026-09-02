// server/blog/blogRoutes.js
// 统一提供博客文章 (posts) 与 知识库专题 (wiki) API
import express from 'express'
import { db } from './blogDb.js'

const router = express.Router()

/* =========================================================================
   1. 博客文章流（Posts API）
   ========================================================================= */

// GET /api/posts/categories —— 动态聚合所有出现过的分类与文章数量
router.get('/categories', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM posts 
      GROUP BY category 
      ORDER BY count DESC
    `).all()
    res.json({ categories: rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/posts —— 游标分页列表（支持 category、tag 过滤）
router.get('/', (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50)
    const cursor = req.query.cursor
    const category = req.query.category
    const tag = req.query.tag

    let sql = `
      SELECT id, slug, title, excerpt, date, category, tags, is_featured, created_at 
      FROM posts 
      WHERE 1=1
    `
    const params = []

    if (category && category !== 'all') {
      sql += ` AND category = ?`
      params.push(category)
    }

    if (tag) {
      sql += ` AND tags LIKE ?`
      params.push(`%"${tag}"%`)
    }

    if (cursor) {
      sql += ` AND date < ?`
      params.push(cursor)
    }

    sql += ` ORDER BY is_featured DESC, date DESC LIMIT ?`
    params.push(limit + 1)

    const rows = db.prepare(sql).all(...params)
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows

    // 反序列化 tags JSON 字符串
    items.forEach(p => {
      try { p.tags = JSON.parse(p.tags) } catch { p.tags = [] }
      p.is_featured = Boolean(p.is_featured)
    })

    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].date : null
    res.json({ items, nextCursor, hasMore })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/posts/:slug —— 获取单篇文章详情（含正文）
router.get('/:slug', (req, res) => {
  try {
    const post = db.prepare(`SELECT * FROM posts WHERE slug = ?`).get(req.params.slug)
    if (!post) return res.status(404).json({ error: 'Post not found' })

    try { post.tags = JSON.parse(post.tags) } catch { post.tags = [] }
    post.is_featured = Boolean(post.is_featured)
    res.json(post)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* =========================================================================
   2. 专题知识库（Wiki Topics API）
   ========================================================================= */

// GET /api/wiki/topics —— 获取所有知识库专题专栏
router.get('/wiki/topics', (req, res) => {
  try {
    const topics = db.prepare(`
      SELECT t.*, COUNT(a.id) as article_count
      FROM wiki_topics t
      LEFT JOIN wiki_articles a ON t.slug = a.topic_slug
      GROUP BY t.id
      ORDER BY t.order_index ASC, t.id ASC
    `).all()
    res.json({ topics })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wiki/topics/:topicSlug —— 获取某个专题的章节大纲及默认首篇
router.get('/wiki/topics/:topicSlug', (req, res) => {
  try {
    const topic = db.prepare(`SELECT * FROM wiki_topics WHERE slug = ?`).get(req.params.topicSlug)
    if (!topic) return res.status(404).json({ error: 'Topic not found' })

    const articles = db.prepare(`
      SELECT id, topic_slug, slug, title, order_index, created_at
      FROM wiki_articles
      WHERE topic_slug = ?
      ORDER BY order_index ASC, id ASC
    `).all(req.params.topicSlug)

    res.json({ topic, articles })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/wiki/topics/:topicSlug/:articleSlug —— 获取专题中某具体章节的正文
router.get('/wiki/topics/:topicSlug/:articleSlug', (req, res) => {
  try {
    const article = db.prepare(`
      SELECT * FROM wiki_articles 
      WHERE topic_slug = ? AND slug = ?
    `).get(req.params.topicSlug, req.params.articleSlug)

    if (!article) return res.status(404).json({ error: 'Article not found' })
    res.json(article)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
