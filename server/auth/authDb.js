import { getDb } from '../blog/blogDb.js'
import bcrypt from 'bcryptjs'

export function initAuthTables() {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)

  // 初始化管理员账号 KHY1107
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get('KHY1107')
  if (!user) {
    const hash = bcrypt.hashSync('Hgshyzh_0828', 10)
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('KHY1107', hash, 'admin')
    console.log('[authDb] 已初始化超级管理员账号: KHY1107')
  }
}

export function findUserByUsername(username) {
  return getDb().prepare('SELECT * FROM users WHERE username = ?').get(username)
}

export function findUserById(id) {
  return getDb().prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id)
}
