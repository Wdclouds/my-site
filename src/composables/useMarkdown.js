// Markdown 解析 + TOC 提取（marked）
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

// 渲染 markdown → HTML
export function renderMarkdown(mdText) {
  return marked.parse(mdText || '')
}

// 提取 h1/h2/h3 目录（slug 锚点）
export function extractToc(mdText) {
  const toc = []
  const lines = (mdText || '').split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/)
    if (!m) continue
    const level = m[1].length
    const title = m[2].replace(/[*`_]/g, '').trim()
    const slug = title.toLowerCase().replace(/[^\w\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '')
    toc.push({ level, title, slug })
  }
  return toc
}