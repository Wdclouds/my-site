import mongoose from 'mongoose'

/**
 * 歌曲映射模型 —— 只存元数据（歌名/歌手/封面/文件路径），
 * 音频文件本体放在磁盘 music 目录，由 nginx/express 静态托管。
 */
const songSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // 歌名
    artist: { type: String, default: '' }, // 歌手
    album: { type: String, default: '' }, // 专辑
    genre: { type: String, default: '' }, // 流派（Ambient/House/Techno/Jazz/Lo-Fi/Synthwave/ACG...）
    duration: { type: String, default: '0:00' }, // 时长（展示用 "3:45"）
    cover: { type: String, default: '' }, // 封面图路径 /covers/xx.jpg
    file: { type: String, required: true }, // 音频文件路径 /music/xx.mp3
    sortOrder: { type: Number, default: 0 } // 排序权重
  },
  { timestamps: true }
)

// 按流派 + 排序取列表
songSchema.statics.findByGenre = function (genre) {
  const query = genre && genre !== 'All' ? { genre } : {}
  return this.find(query).sort({ sortOrder: 1, createdAt: 1 })
}

export default mongoose.model('Song', songSchema)
