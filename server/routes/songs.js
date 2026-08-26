import { Router } from 'express'
import Song from '../models/Song.js'

const router = Router()

// 简单的内存缓存：歌曲数据读多写少，缓存后零延迟
const cache = { data: null, at: 0 }
const CACHE_TTL = 60_000 // 60 秒

// GET /api/songs?genre=Jazz —— 歌曲列表（支持按流派过滤）
router.get('/', async (req, res) => {
  const genre = req.query.genre || ''

  // 无过滤时走缓存
  if (!genre && cache.data && Date.now() - cache.at < CACHE_TTL) {
    return res.json(cache.data)
  }

  try {
    const songs = await Song.findByGenre(genre)
    const payload = { count: songs.length, songs }

    if (!genre) {
      cache.data = payload
      cache.at = Date.now()
    }
    return res.json(payload)
  } catch (err) {
    console.error('[songs] 查询失败:', err.message)
    return res.status(500).json({ error: '服务器内部错误' })
  }
})

// GET /api/songs/genres —— 可用流派列表（供前端滚轮等使用）
router.get('/genres', async (req, res) => {
  try {
    const genres = await Song.distinct('genre')
    res.json(genres.filter(Boolean))
  } catch (err) {
    console.error('[songs] 流派查询失败:', err.message)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
