/**
 * 批量写入 mp3 ID3 标签（标题/艺术家/唱片集）
 * 按 song/acg/歌曲信息.md 的信息填写
 */
import NodeID3 from 'node-id3'
import fs from 'fs'
import path from 'path'

const dir = 'C:/Users/Administrator/Desktop/song/acg'

const songs = [
  { file: '横竖撇点折 - 米白mii.mp3', title: '横竖撇点折', artist: '米白mii', album: '2020 Bilibili拜年祭单品' },
  { file: '不问天 - 说说Crystal.mp3', title: '不问天', artist: '说说Crystal', album: '2021 Bilibili拜年纪单品' },
  { file: 'STYX HELIX - MYTH & ROID.mp3', title: 'STYX HELIX', artist: 'MYTH & ROID', album: 'Re:从零开始的异世界生活 ED1' },
  { file: '旅人の唄 - 大原ゆい子.mp3', title: '旅人の唄', artist: '大原ゆい子', album: '无职转生 第一季OP1' },
  { file: '打上花火 - DAOKO&米津玄师.mp3', title: '打上花火', artist: 'DAOKO、米津玄师', album: '动画电影《烟花》主题曲' },
  { file: 'God Knows... - 平野绫.mp3', title: 'God knows...', artist: '平野绫', album: '凉宫春日的忧郁 插曲' },
  { file: '鳥の詩 - Lia.mp3', title: '鳥の詩', artist: 'Lia', album: 'AIR(青空) OP主题曲' },
  { file: 'Life Will Change - Lyn Inaizumi.mp3', title: 'Life Will Change', artist: 'Lyn Inaizumi', album: '女神异闻录5皇家版(P5R) OST' },
  { file: 'only my railgun - fripSide.mp3', title: 'only my railgun', artist: 'fripSide', album: '某科学的超电磁炮 OP1' },
  { file: 'Moon Halo - 茶理理&TetraCalyx&Hanser.mp3', title: 'Moon Halo', artist: '茶理理、TetraCalyx、Hanser', album: '崩坏3《薪炎永燃》短片印象曲' },
  { file: 'One Last Kiss - 宇多田光.mp3', title: 'One Last Kiss', artist: '宇多田光', album: 'EVA新剧场版：终 主题曲' },
  { file: '我不曾忘记 - 半甜气泡安小琪等.mp3', title: '我不曾忘记', artist: '半甜气泡安小琪、花园花玲、沐霏Moeki_、再见动物园合唱团', album: '2023原神新春会同人曲' },
  { file: '经过 - 张杰.mp3', title: '经过', artist: '张杰', album: '原神四周年中文主题曲' },
  { file: 'some like it hot!! - SPYAIR.mp3', title: 'some like it hot!!', artist: 'SPYAIR', album: '银魂 片尾曲' },
  { file: 'ADAMAS - LiSA.mp3', title: 'ADAMAS', artist: 'LiSA(织部里沙)', album: '刀剑神域 Alicization OP1' },
  { file: 'PLAYBACK - 中本悠太.mp3', title: 'PLAYBACK', artist: '中本悠太(YUTA)', album: '假面骑士ZEZTZ OP2主题曲' },
  { file: 'EXCITE - 三浦大知.mp3', title: 'EXCITE', artist: '三浦大知', album: '假面骑士EX-AID OP主题曲' },
  { file: '深海少女 - 初音未来.mp3', title: '深海少女', artist: '初音未来', album: '初音未来原创Vocaloid单曲' },
  { file: 'デート - RADWIMPS.mp3', title: 'デート', artist: 'RADWIMPS', album: '《你的名字。》电影原声专辑' },
  { file: 'Ring of Fortune - 佐藤.mp3', title: 'Ring of Fortune', artist: '佐藤', album: '可塑性记忆ED' }
]

let ok = 0
const fails = []
for (const s of songs) {
  const p = path.join(dir, s.file)
  if (!fs.existsSync(p)) {
    fails.push(`文件不存在: ${s.file}`)
    continue
  }
  const tags = {
    title: s.title,
    artist: s.artist,
    album: s.album,
    albumArtist: s.artist,
    genre: 'ACG'
  }
  try {
    const res = NodeID3.write(tags, p)
    if (res) {
      ok++
      console.log(`✓ ${s.file}`)
    } else {
      fails.push(`写入失败: ${s.file}`)
    }
  } catch (e) {
    fails.push(`${s.file}: ${e.message}`)
  }
}

console.log(`\n成功: ${ok}/${songs.length}`)
if (fails.length) {
  console.log('失败:')
  fails.forEach(f => console.log('  ' + f))
}
