// ============================================================
// Nova FM 曲库（MVP：暂时用 ACG 的 20 首真实歌曲顶替）
// ------------------------------------------------------------
// 说明：
// - 等 song/novafm 放好真实歌曲后，只需替换本文件的数组内容，
//   仪表盘 / 中控屏 / 全息界面全部自动跟随（它们只读这个数据源）。
// - bpm 为人工配置值（战略文档「方式A」），演示够用；
//   二期再升级为 Web Audio 实时节拍识别。
// - file / cover 由 Express 托管（开发环境音频走 :3000，
//   封面走 vite 代理 /covers → :3000；生产由 Nginx 反代）。
// ============================================================

export const NOVA_TRACKS = [
  { id: 'n01', title: 'ADAMAS',            artist: 'LiSA',                       album: '刀剑神域 Alicization OP1',       file: '/music/acg/ADAMAS - LiSA.mp3',                       cover: '/covers/acg/ADAMAS - LiSA.jpg',                       bpm: 192, color: '#ff5a7a' },
  { id: 'n02', title: 'EXCITE',            artist: '三浦大知',                   album: '假面骑士EX-AID OP主题曲',         file: '/music/acg/EXCITE - 三浦大知.mp3',                   cover: '/covers/acg/EXCITE - 三浦大知.jpg',                   bpm: 128, color: '#ffb84d' },
  { id: 'n03', title: 'God knows...',      artist: '平野绫',                     album: '凉宫春日的忧郁 插曲',             file: '/music/acg/God Knows... - 平野绫.mp3',                cover: '/covers/acg/God Knows... - 平野绫.jpg',               bpm: 196, color: '#7ad0ff' },
  { id: 'n04', title: 'Life Will Change',  artist: 'Lyn Inaizumi',               album: '女神异闻录5皇家版(P5R) OST',      file: '/music/acg/Life Will Change - Lyn Inaizumi.mp3',       cover: '/covers/acg/Life Will Change - Lyn Inaizumi.jpg',      bpm: 174, color: '#ff4d6d' },
  { id: 'n05', title: 'Moon Halo',         artist: '茶理理/TetraCalyx/Hanser',   album: '崩坏3《薪炎永燃》短片印象曲',      file: '/music/acg/Moon Halo - 茶理理&TetraCalyx&Hanser.mp3', cover: '/covers/acg/Moon Halo - 茶理理&TetraCalyx&Hanser.jpg', bpm: 86,  color: '#9ad0ff' },
  { id: 'n06', title: 'One Last Kiss',     artist: '宇多田光',                   album: 'EVA新剧场版：终 主题曲',           file: '/music/acg/One Last Kiss - 宇多田光.mp3',              cover: '/covers/acg/One Last Kiss - 宇多田光.jpg',             bpm: 108, color: '#ffd9a0' },
  { id: 'n07', title: 'only my railgun',   artist: 'fripSide',                   album: '某科学的超电磁炮 OP1',            file: '/music/acg/only my railgun - fripSide.mp3',            cover: '/covers/acg/only my railgun - fripSide.jpg',           bpm: 143, color: '#7dffd4' },
  { id: 'n08', title: 'PLAYBACK',          artist: '中本悠太(YUTA)',             album: '假面骑士ZEZTZ OP2主题曲',         file: '/music/acg/PLAYBACK - 中本悠太.mp3',                  cover: '/covers/acg/PLAYBACK - 中本悠太.jpg',                  bpm: 150, color: '#c98aff' },
  { id: 'n09', title: 'Ring of Fortune',   artist: '佐藤',                       album: '可塑性记忆ED',                     file: '/music/acg/Ring of Fortune - 佐藤.mp3',                cover: '/covers/acg/Ring of Fortune - 佐藤.jpg',               bpm: 180, color: '#ff9ad5' },
  { id: 'n10', title: 'some like it hot!!',artist: 'SPYAIR',                     album: '银魂 片尾曲',                      file: '/music/acg/some like it hot!! - SPYAIR.mp3',            cover: '/covers/acg/some like it hot!! - SPYAIR.jpg',           bpm: 188, color: '#ff8a5a' },
  { id: 'n11', title: 'STYX HELIX',        artist: 'MYTH & ROID',                album: 'Re:从零开始的异世界生活 ED1',     file: '/music/acg/STYX HELIX - MYTH & ROID.mp3',              cover: '/covers/acg/STYX HELIX - MYTH & ROID.jpg',             bpm: 170, color: '#8ad4ff' },
  { id: 'n12', title: 'デート',             artist: 'RADWIMPS',                   album: '《你的名字。》电影原声专辑',        file: '/music/acg/デート - RADWIMPS.mp3',                     cover: '/covers/acg/デート - RADWIMPS.jpg',                    bpm: 110, color: '#a8e0ff' },
  { id: 'n13', title: '不问天',             artist: '说说Crystal',                album: '2021 Bilibili拜年纪单品',          file: '/music/acg/不问天 - 说说Crystal.mp3',                  cover: '/covers/acg/不问天 - 说说Crystal.jpg',                 bpm: 92,  color: '#d4b8ff' },
  { id: 'n14', title: '我不曾忘记',         artist: '半甜气泡安小琪等',            album: '2023原神新春会同人曲',            file: '/music/acg/我不曾忘记 - 半甜气泡安小琪等.mp3',         cover: '/covers/acg/我不曾忘记 - 半甜气泡安小琪等.jpg',        bpm: 80,  color: '#ffe08a' },
  { id: 'n15', title: '打上花火',           artist: 'DAOKO、米津玄师',            album: '动画电影《烟花》主题曲',           file: '/music/acg/打上花火 - DAOKO&米津玄师.mp3',             cover: '/covers/acg/打上花火 - DAOKO&米津玄师.jpg',           bpm: 96,  color: '#ff9ab8' },
  { id: 'n16', title: '旅人の唄',           artist: '大原ゆい子',                 album: '无职转生 第一季OP1',              file: '/music/acg/旅人の唄 - 大原ゆい子.mp3',                 cover: '/covers/acg/旅人の唄 - 大原ゆい子.jpg',                bpm: 138, color: '#b8f0a8' },
  { id: 'n17', title: '横竖撇点折',         artist: '米白mii',                    album: '2020 Bilibili拜年祭单品',          file: '/music/acg/横竖撇点折 - 米白mii.mp3',                  cover: '/covers/acg/横竖撇点折 - 米白mii.jpg',                 bpm: 112, color: '#c8e8ff' },
  { id: 'n18', title: '经过',               artist: '张杰',                       album: '原神四周年中文主题曲',             file: '/music/acg/经过 - 张杰.mp3',                           cover: '/covers/acg/经过 - 张杰.jpg',                          bpm: 100, color: '#ffc48a' },
  { id: 'n19', title: '深海少女',           artist: '初音未来',                   album: '初音未来原创Vocaloid单曲',         file: '/music/acg/深海少女 - 初音未来.mp3',                   cover: '/covers/acg/深海少女 - 初音未来.jpg',                  bpm: 122, color: '#7ee0ff' },
  { id: 'n20', title: '鳥の詩',             artist: 'Lia',                        album: 'AIR(青空) OP主题曲',               file: '/music/acg/鳥の詩 - Lia.mp3',                          cover: '/covers/acg/鳥の詩 - Lia.jpg',                         bpm: 96,  color: '#e8f4ff' },
]
