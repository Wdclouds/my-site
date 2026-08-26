/**
 * 歌曲种子脚本 —— 把歌曲元数据写入数据库
 * ACG 流派为真实歌曲（20 首，含封面）；其他流派仍为示例占位。
 *
 * 运行：node server/seed-songs.js
 * 会清空 songs 集合并重新插入（幂等：重复跑不会重复插）
 */
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Song from './models/Song.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const envFile =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
dotenv.config({ path: path.resolve(__dirname, '..', envFile) })

// ===== ACG 真实歌曲（来自 song/acg/，文件在 server/public/music/acg + covers/acg）=====
const ACG_SONGS = [
  { title: 'ADAMAS', artist: 'LiSA(织部里沙)', album: '刀剑神域 Alicization OP1', file: '/music/acg/ADAMAS - LiSA.mp3', cover: '/covers/acg/ADAMAS - LiSA.jpg' },
  { title: 'EXCITE', artist: '三浦大知', album: '假面骑士EX-AID OP主题曲', file: '/music/acg/EXCITE - 三浦大知.mp3', cover: '/covers/acg/EXCITE - 三浦大知.jpg' },
  { title: 'God knows...', artist: '平野绫', album: '凉宫春日的忧郁 插曲', file: '/music/acg/God Knows... - 平野绫.mp3', cover: '/covers/acg/God Knows... - 平野绫.jpg' },
  { title: 'Life Will Change', artist: 'Lyn Inaizumi', album: '女神异闻录5皇家版(P5R) OST', file: '/music/acg/Life Will Change - Lyn Inaizumi.mp3', cover: '/covers/acg/Life Will Change - Lyn Inaizumi.jpg' },
  { title: 'Moon Halo', artist: '茶理理、TetraCalyx、Hanser', album: '崩坏3《薪炎永燃》短片印象曲', file: '/music/acg/Moon Halo - 茶理理&TetraCalyx&Hanser.mp3', cover: '/covers/acg/Moon Halo - 茶理理&TetraCalyx&Hanser.jpg' },
  { title: 'One Last Kiss', artist: '宇多田光', album: 'EVA新剧场版：终 主题曲', file: '/music/acg/One Last Kiss - 宇多田光.mp3', cover: '/covers/acg/One Last Kiss - 宇多田光.jpg' },
  { title: 'only my railgun', artist: 'fripSide', album: '某科学的超电磁炮 OP1', file: '/music/acg/only my railgun - fripSide.mp3', cover: '/covers/acg/only my railgun - fripSide.jpg' },
  { title: 'PLAYBACK', artist: '中本悠太(YUTA)', album: '假面骑士ZEZTZ OP2主题曲', file: '/music/acg/PLAYBACK - 中本悠太.mp3', cover: '/covers/acg/PLAYBACK - 中本悠太.jpg' },
  { title: 'Ring of Fortune', artist: '佐藤', album: '可塑性记忆ED', file: '/music/acg/Ring of Fortune - 佐藤.mp3', cover: '/covers/acg/Ring of Fortune - 佐藤.jpg' },
  { title: 'some like it hot!!', artist: 'SPYAIR', album: '银魂 片尾曲', file: '/music/acg/some like it hot!! - SPYAIR.mp3', cover: '/covers/acg/some like it hot!! - SPYAIR.jpg' },
  { title: 'STYX HELIX', artist: 'MYTH & ROID', album: 'Re:从零开始的异世界生活 ED1', file: '/music/acg/STYX HELIX - MYTH & ROID.mp3', cover: '/covers/acg/STYX HELIX - MYTH & ROID.jpg' },
  { title: 'デート', artist: 'RADWIMPS', album: '《你的名字。》电影原声专辑', file: '/music/acg/デート - RADWIMPS.mp3', cover: '/covers/acg/デート - RADWIMPS.jpg' },
  { title: '不问天', artist: '说说Crystal', album: '2021 Bilibili拜年纪单品', file: '/music/acg/不问天 - 说说Crystal.mp3', cover: '/covers/acg/不问天 - 说说Crystal.jpg' },
  { title: '我不曾忘记', artist: '半甜气泡安小琪、花园花玲、沐霏Moeki_、再见动物园合唱团', album: '2023原神新春会同人曲', file: '/music/acg/我不曾忘记 - 半甜气泡安小琪等.mp3', cover: '/covers/acg/我不曾忘记 - 半甜气泡安小琪等.jpg' },
  { title: '打上花火', artist: 'DAOKO、米津玄师', album: '动画电影《烟花》主题曲', file: '/music/acg/打上花火 - DAOKO&米津玄师.mp3', cover: '/covers/acg/打上花火 - DAOKO&米津玄师.jpg' },
  { title: '旅人の唄', artist: '大原ゆい子', album: '无职转生 第一季OP1', file: '/music/acg/旅人の唄 - 大原ゆい子.mp3', cover: '/covers/acg/旅人の唄 - 大原ゆい子.jpg' },
  { title: '横竖撇点折', artist: '米白mii', album: '2020 Bilibili拜年祭单品', file: '/music/acg/横竖撇点折 - 米白mii.mp3', cover: '/covers/acg/横竖撇点折 - 米白mii.jpg' },
  { title: '经过', artist: '张杰', album: '原神四周年中文主题曲', file: '/music/acg/经过 - 张杰.mp3', cover: '/covers/acg/经过 - 张杰.jpg' },
  { title: '深海少女', artist: '初音未来', album: '初音未来原创Vocaloid单曲', file: '/music/acg/深海少女 - 初音未来.mp3', cover: '/covers/acg/深海少女 - 初音未来.jpg' },
  { title: '鳥の詩', artist: 'Lia', album: 'AIR(青空) OP主题曲', file: '/music/acg/鳥の詩 - Lia.mp3', cover: '/covers/acg/鳥の詩 - Lia.jpg' }
]

// ===== 其他流派示例占位（后续逐个替换为真实歌曲）=====
const PLACEHOLDER_SONGS = [
  { title: '雾中森林', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '3:45', file: '/music/ambient/example-a.mp3', sortOrder: 1 },
  { title: '静水', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '4:12', file: '/music/ambient/example-b.mp3', sortOrder: 2 },
  { title: '夜空微光', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '3:28', file: '/music/ambient/example-c.mp3', sortOrder: 3 },
  { title: '晨露', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '5:01', file: '/music/ambient/example-d.mp3', sortOrder: 4 },
  { title: '远山回声', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '3:57', file: '/music/ambient/example-e.mp3', sortOrder: 5 },
  { title: '潮汐', artist: '预览歌手', album: '示例专辑', genre: 'Ambient', duration: '4:33', file: '/music/ambient/example-f.mp3', sortOrder: 6 },

  { title: '节拍工厂', artist: '预览歌手', album: '示例专辑', genre: 'House', duration: '3:12', file: '/music/house/example-a.mp3', sortOrder: 1 },
  { title: '午夜律动', artist: '预览歌手', album: '示例专辑', genre: 'House', duration: '4:05', file: '/music/house/example-b.mp3', sortOrder: 2 },
  { title: '地下室派对', artist: '预览歌手', album: '示例专辑', genre: 'House', duration: '3:48', file: '/music/house/example-c.mp3', sortOrder: 3 },
  { title: '霓虹节拍', artist: '预览歌手', album: '示例专辑', genre: 'House', duration: '4:20', file: '/music/house/example-d.mp3', sortOrder: 4 },
  { title: '能量脉冲', artist: '预览歌手', album: '示例专辑', genre: 'House', duration: '3:33', file: '/music/house/example-e.mp3', sortOrder: 5 },

  { title: '机械之心', artist: '预览歌手', album: '示例专辑', genre: 'Techno', duration: '4:15', file: '/music/techno/example-a.mp3', sortOrder: 1 },
  { title: '电子迷宫', artist: '预览歌手', album: '示例专辑', genre: 'Techno', duration: '3:55', file: '/music/techno/example-b.mp3', sortOrder: 2 },
  { title: '脉冲信号', artist: '预览歌手', album: '示例专辑', genre: 'Techno', duration: '4:40', file: '/music/techno/example-c.mp3', sortOrder: 3 },
  { title: '暗黑舞池', artist: '预览歌手', album: '示例专辑', genre: 'Techno', duration: '3:22', file: '/music/techno/example-d.mp3', sortOrder: 4 },
  { title: '数据流', artist: '预览歌手', album: '示例专辑', genre: 'Techno', duration: '5:10', file: '/music/techno/example-e.mp3', sortOrder: 5 },

  { title: '蓝调咖啡', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '4:08', file: '/music/jazz/example-a.mp3', sortOrder: 1 },
  { title: '深夜爵士', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '3:52', file: '/music/jazz/example-b.mp3', sortOrder: 2 },
  { title: '即兴摇摆', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '5:15', file: '/music/jazz/example-c.mp3', sortOrder: 3 },
  { title: '萨克斯风语', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '4:30', file: '/music/jazz/example-d.mp3', sortOrder: 4 },
  { title: '雾都小调', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '3:40', file: '/music/jazz/example-e.mp3', sortOrder: 5 },
  { title: '微醺月光', artist: '预览歌手', album: '示例专辑', genre: 'Jazz', duration: '4:55', file: '/music/jazz/example-f.mp3', sortOrder: 6 },

  { title: '旧磁带', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '3:20', file: '/music/lofi/example-a.mp3', sortOrder: 1 },
  { title: '雨天自习室', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '4:10', file: '/music/lofi/example-b.mp3', sortOrder: 2 },
  { title: '黑胶唱片', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '3:35', file: '/music/lofi/example-c.mp3', sortOrder: 3 },
  { title: '黄昏收音机', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '4:45', file: '/music/lofi/example-d.mp3', sortOrder: 4 },
  { title: '书页翻动', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '3:15', file: '/music/lofi/example-e.mp3', sortOrder: 5 },
  { title: '热可可', artist: '预览歌手', album: '示例专辑', genre: 'Lo-Fi', duration: '3:58', file: '/music/lofi/example-f.mp3', sortOrder: 6 },

  { title: '霓虹落日', artist: '预览歌手', album: '示例专辑', genre: 'Synthwave', duration: '4:25', file: '/music/synthwave/example-a.mp3', sortOrder: 1 },
  { title: '复古未来', artist: '预览歌手', album: '示例专辑', genre: 'Synthwave', duration: '3:50', file: '/music/synthwave/example-b.mp3', sortOrder: 2 },
  { title: '合成器浪潮', artist: '预览歌手', album: '示例专辑', genre: 'Synthwave', duration: '5:05', file: '/music/synthwave/example-c.mp3', sortOrder: 3 },
  { title: '像素公路', artist: '预览歌手', album: '示例专辑', genre: 'Synthwave', duration: '4:12', file: '/music/synthwave/example-d.mp3', sortOrder: 4 },
  { title: '午夜驾驶', artist: '预览歌手', album: '示例专辑', genre: 'Synthwave', duration: '3:44', file: '/music/synthwave/example-e.mp3', sortOrder: 5 }
]

async function run() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[seed] 未设置 MONGODB_URI，无法写入数据库')
    process.exit(1)
  }
  await mongoose.connect(uri)

  // 清空重插（幂等）
  await Song.deleteMany({})

  const acgDocs = ACG_SONGS.map((s, i) => ({ ...s, genre: 'ACG', sortOrder: i + 1 }))
  const docs = await Song.insertMany([...acgDocs, ...PLACEHOLDER_SONGS])
  console.log(`[seed] 已写入 ${docs.length} 首歌曲（ACG 真实 ${acgDocs.length} 首 + 其他流派示例 ${PLACEHOLDER_SONGS.length} 首）`)

  const genres = await Song.distinct('genre')
  console.log('[seed] 流派:', genres.join(' / '))

  await mongoose.connection.close()
  process.exit(0)
}

run().catch(err => {
  console.error('[seed] 失败:', err)
  process.exit(1)
})
