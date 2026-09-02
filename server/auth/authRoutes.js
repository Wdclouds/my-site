import express from 'express'
import bcrypt from 'bcryptjs'
import { findUserByUsername } from './authDb.js'
import { signToken, requireAuth } from './authMiddleware.js'

const router = express.Router()

// POST /api/auth/login 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  const user = findUserByUsername(username)
  if (!user) {
    return res.status(401).json({ error: '账号或密码错误' })
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash)
  if (!isMatch) {
    return res.status(401).json({ error: '账号或密码错误' })
  }

  const token = signToken(user)
  res.json({
    message: '登录成功，欢迎回到雅典娜神庙',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  })
})

// GET /api/auth/me 获取当前登录态
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  })
})

export default router
