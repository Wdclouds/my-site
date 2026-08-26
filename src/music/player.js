// ============================================================
// Nova FM 音乐播放器（单例）+ 统一音乐状态 musicState
// ------------------------------------------------------------
// 核心原则（战略文档）：数据只有一份，显示层可以有多个。
// 仪表盘 / 中控屏 / 全息界面 都只读 musicState，
// 歌曲切换后三屏自动同步，不会出现数据打架。
// 模块级单例：切换流派 / 页面时音频继续播放，状态不丢。
// ============================================================
import { reactive } from 'vue'
import { NOVA_TRACKS } from './novaTracks'

// 音频文件由 Express(:3000) 托管。开发环境 vite 不代理 /music
// （避免与前端路由 /music 冲突），所以开发时音频走绝对地址；
// 生产环境 Nginx 反代 /music，直接用相对路径即可。
const AUDIO_ORIGIN = import.meta.env.DEV ? 'http://127.0.0.1:3000' : ''

export const audioUrl = file =>
  /^https?:/.test(file) ? file : AUDIO_ORIGIN + file

// ---- 唯一数据源：所有界面只读这一个状态 ----
export const musicState = reactive({
  index: 0,            // 当前曲目下标
  isPlaying: false,    // 播放状态
  currentTime: 0,      // 当前进度（秒）
  duration: 0,         // 总时长（秒）
  volume: 0.68,        // 音量 0-1
  currentTrack: null,  // 当前曲目（含 bpm / color 等元数据）
})

class MusicPlayer {
  constructor() {
    this.audio = null
  }

  // 懒创建 Audio，并接好状态同步事件
  ensureAudio() {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.volume = musicState.volume

    audio.addEventListener('timeupdate', () => {
      musicState.currentTime = audio.currentTime
    })
    audio.addEventListener('loadedmetadata', () => {
      musicState.duration = audio.duration || 0
    })
    audio.addEventListener('play', () => { musicState.isPlaying = true })
    audio.addEventListener('pause', () => { musicState.isPlaying = false })
    audio.addEventListener('ended', () => this.next())
    audio.addEventListener('error', () => {
      console.warn('[nova] 音频加载失败:', audio.src)
    })

    this.audio = audio
    return audio
  }

  // 初始化：载入第一首（不自动播放，等用户点击 —— 浏览器自动播放策略）
  init() {
    this.ensureAudio()
    if (!musicState.currentTrack) this.select(0, false)
  }

  // 选中第 index 首（自动环绕）。autoplay=false 只载入不播放
  select(index, autoplay = true) {
    const n = NOVA_TRACKS.length
    if (!n) return
    musicState.index = ((index % n) + n) % n
    const track = NOVA_TRACKS[musicState.index]
    musicState.currentTrack = track
    musicState.currentTime = 0
    musicState.duration = 0
    const audio = this.ensureAudio()
    audio.src = audioUrl(track.file)
    if (autoplay) audio.play().catch(() => {})
  }

  toggle() {
    const audio = this.ensureAudio()
    if (!musicState.currentTrack) this.select(0)
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  next() { this.select(musicState.index + 1) }
  prev() { this.select(musicState.index - 1) }

  seek(t) {
    const audio = this.ensureAudio()
    if (!Number.isFinite(t) || !musicState.duration) return
    audio.currentTime = Math.min(Math.max(t, 0), musicState.duration)
  }

  setVolume(v) {
    const val = Math.min(Math.max(Number(v) || 0, 0), 1)
    musicState.volume = val
    if (this.audio) this.audio.volume = val
  }
}

// 全局单例：任何组件 import { player } 拿到的都是同一个
export const player = new MusicPlayer()
