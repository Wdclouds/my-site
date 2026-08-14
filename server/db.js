import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.warn('[db] MONGODB_URI 未设置，跳过数据库连接（骨架阶段可无库运行）')
    return
  }
  try {
    await mongoose.connect(uri)
    // 打印时隐藏连接串里的密码
    const masked = uri.replace(/\/\/[^@/]+@/, '//***@')
    console.log(`[db] MongoDB connected: ${masked}`)
  } catch (err) {
    console.error('[db] MongoDB 连接失败:', err.message)
  }
}
