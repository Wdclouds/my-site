// Notion → SQLite 同步引擎（MVP 简化版）
// 用法：node --experimental-sqlite server/notion-sync.js
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'blog.sqlite')

// ---------- 读取 .env ----------
function loadEnv() {
  const env = {}
  try {
    const text = readFileSync(path.join(__dirname, '.env'), 'utf-8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env */ }
  return env
}

const env = loadEnv()
const NOTION_API_KEY = env.NOTION_API_KEY
const DATA_SOURCE_ID = env.NOTION_DATA_SOURCE_ID
if (!NOTION_API_KEY || !DATA_SOURCE_ID) {
  console.error('[sync] 缺少 NOTION_API_KEY 或 NOTION_DATA_SOURCE_ID（server/.env）')
  process.exit(1)
}

const API = 'https://api.notion.com/v1'
const HDRS = {
  Authorization: `Bearer ${NOTION_API_KEY}`,
  'Notion-Version': '2026-03-11',
  'Content-Type': 'application/json',
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function notion(path, options = {}) {
  const res = await fetch(API + path, { headers: HDRS, ...options })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Notion API ${res.status} ${path}: ${body.slice(0, 300)}`)
  }
  return res.json()
}

// 属性提取：title 按类型找，其余按名字（大小写不敏感）
function findProp(props, name) {
  const key = Object.keys(props).find((k) => k.toLowerCase() === name.toLowerCase())
  return key ? props[key] : null
}

function extractPost(page) {
  const props = page.properties
  const titleProp = Object.values(props).find((p) => p.type === 'title')
  const slug = findProp(props, 'Slug')?.rich_text?.[0]?.plain_text || ''
  const excerpt = findProp(props, '摘要')?.rich_text?.[0]?.plain_text || ''
  const date = findProp(props, '日期')?.date?.start || page.created_time.slice(0, 10)
  const tags = (findProp(props, '标签')?.multi_select || []).map((t) => t.name)
  const status = findProp(props, '状态')?.select?.name || ''
  return {
    notionPageId: page.id,
    title: titleProp ? titleProp.title.map((t) => t.plain_text).join('') : '',
    slug,
    excerpt,
    date,
    tags,
    status,
    lastEdited: page.last_edited_time,
  }
}

async function main() {
  const db = new DatabaseSync(DB_PATH)
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

  // 1. 查询已发布文章
  console.log('[sync] 查询 Notion 已发布文章…')
  const q = await notion(`/data_sources/${DATA_SOURCE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: { property: '状态', select: { equals: '已发布' } },
      sorts: [{ property: '日期', direction: 'descending' }],
    }),
  })

  const stats = { inserted: 0, updated: 0, unchanged: 0, deleted: 0, errors: [] }
  const syncedIds = new Set()

  for (const page of q.results) {
    const meta = extractPost(page)
    syncedIds.add(meta.notionPageId)

    // slug 缺失 → 用 page id 兜底
    const slug = meta.slug || meta.notionPageId

    // 变更检测
    const existing = db
      .prepare('SELECT notion_last_edited_time FROM posts WHERE notion_page_id = ?')
      .get(meta.notionPageId)
    if (existing && existing.notion_last_edited_time === meta.lastEdited) {
      stats.unchanged++
      continue
    }

    // 2. 拉正文 markdown
    const md = await notion(`/pages/${meta.notionPageId}/markdown`)
    const content = (md.markdown || '').trim()

    // 3. upsert
    db.prepare(`
      INSERT INTO posts (slug, title, excerpt, date, tags, content, notion_page_id, notion_last_edited_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        title = excluded.title, excerpt = excluded.excerpt, date = excluded.date,
        tags = excluded.tags, content = excluded.content,
        notion_page_id = excluded.notion_page_id,
        notion_last_edited_time = excluded.notion_last_edited_time
    `).run(slug, meta.title, meta.excerpt, meta.date, JSON.stringify(meta.tags), content, meta.notionPageId, meta.lastEdited)

    if (existing) stats.updated++
    else stats.inserted++
    console.log(`[sync] ${existing ? '更新' : '新增'}「${meta.title}」(${slug})`)

    await sleep(350) // 限流 ~3 req/s
  }

  // 4. 弃稿：本地有 notion_page_id 但 Notion 已不发布 → 删除
  const local = db
    .prepare("SELECT slug, title, notion_page_id FROM posts WHERE notion_page_id IS NOT NULL")
    .all()
  for (const row of local) {
    if (!syncedIds.has(row.notion_page_id)) {
      db.prepare('DELETE FROM posts WHERE slug = ?').run(row.slug)
      stats.deleted++
      console.log(`[sync] 下架「${row.title}」(${row.slug})`)
    }
  }

  console.log(`[sync] 完成: 新增 ${stats.inserted} / 更新 ${stats.updated} / 未变 ${stats.unchanged} / 下架 ${stats.deleted} / 错误 ${stats.errors.length}`)
  db.close()
}

main().catch((e) => {
  console.error('[sync] 失败:', e.message)
  process.exit(1)
})
