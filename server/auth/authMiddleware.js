import jwt from 'jsonwebtoken'
import { findUserById } from './authDb.js'

const JWT_SECRET = process.env.JWT_SECRET || 'athena-temple-secret-key-2026-khy1107'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录或鉴权凭证缺失' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = findUserById(decoded.id)
    if (!user) {
      return res.status(401).json({ error: '用户不存在或已被禁用' })
    }
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: '凭证无效或已过期，请重新登录' })
  }
}
