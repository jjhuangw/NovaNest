// IG 限時動態打卡圖的繪製。只在瀏覽器執行（用 canvas 與系統字型，中文與 emoji 都能正常顯示）。

export interface StoryCard {
  date: string
  title: string
  rate: string
  completedSets: number
  plannedSets: number
  volumeKg: number
  exercises: { name: string; sets: number; best: string | null }[]
  name: string
}

export interface CardText {
  completion: string
  sets: string
  volume: string
  setCount: (n: number) => string
  more: (n: number) => string
  done: string
  slogan: string
}

export const THEMES = ['dark', 'light', 'red', 'photo'] as const
export type Theme = (typeof THEMES)[number]

export interface StoryOptions {
  theme: Theme
  title: string
  showRate: boolean
  showStats: boolean
  showExercises: boolean
  showName: boolean
}

export interface Sticker {
  id: string
  text: string
  // 中心點（畫布座標）與字級
  x: number
  y: number
  size: number
  // null：跟著背景配色自動調整
  color: string | null
}

// IG 限時動態的尺寸；上下約 250px 會被 IG 的介面蓋住，內容放在中間
export const W = 1080
export const H = 1920
const PAD = 96

interface Palette {
  bg: string
  fg: string
  muted: string
  line: string
  accent: string
}

export const PALETTES: Record<Theme, Palette> = {
  dark: { bg: '#0e0e0e', fg: '#f2f2f0', muted: '#a3a3a0', line: '#34342f', accent: '#ff4b57' },
  light: { bg: '#f4f3f1', fg: '#0e0e0e', muted: '#5f5f5f', line: '#d9d9d9', accent: '#d22030' },
  red: { bg: '#d22030', fg: '#ffffff', muted: 'rgba(255,255,255,0.78)', line: 'rgba(255,255,255,0.35)', accent: '#ffffff' },
  photo: { bg: '#0e0e0e', fg: '#ffffff', muted: 'rgba(255,255,255,0.8)', line: 'rgba(255,255,255,0.35)', accent: '#ff4b57' },
}

export function fontFamily() {
  // 沿用頁面字型，再接上各平台的中文與 emoji 字型
  return `${getComputedStyle(document.body).fontFamily}, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
}

export interface Box {
  id: string
  left: number
  top: number
  right: number
  bottom: number
}

// 畫出整張圖，回傳每個貼紙的範圍（給拖曳時判斷點到哪一個）
export function drawStory(
  ctx: CanvasRenderingContext2D,
  input: {
    card: StoryCard
    options: StoryOptions
    text: CardText
    family: string
    photo: CanvasImageSource & { width: number; height: number } | null
    stickers: Sticker[]
    selectedId?: string | null
  },
): Box[] {
  const { card, options, text, family, photo, stickers } = input
  const theme = options.theme === 'photo' && !photo ? 'dark' : options.theme
  const c = PALETTES[theme]
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`

  ctx.save()
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = c.bg
  ctx.fillRect(0, 0, W, H)

  if (theme === 'photo' && photo) {
    drawCover(ctx, photo)
    // 加深上下與整體，讓白字在任何照片上都看得清楚
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, W, H)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, 'rgba(0,0,0,0.55)')
    g.addColorStop(0.35, 'rgba(0,0,0,0)')
    g.addColorStop(0.6, 'rgba(0,0,0,0)')
    g.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // 品牌
  let y = 300
  ctx.fillStyle = c.accent
  ctx.beginPath()
  ctx.arc(PAD + 14, y - 14, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = c.fg
  ctx.font = font(900, 40)
  const brandEnd = spacedText(ctx, 'NOVANEST', PAD + 46, y, 8)
  // 品牌標語放在同一行右側，空間不夠時省略
  ctx.fillStyle = c.muted
  ctx.font = font(600, 32)
  ctx.textAlign = 'right'
  if (ctx.measureText(text.slogan).width < W - PAD - brandEnd - 40) ctx.fillText(text.slogan, W - PAD, y)
  ctx.textAlign = 'left'

  // 日期與標題
  y += 110
  ctx.fillStyle = c.muted
  ctx.font = font(600, 40)
  ctx.fillText(card.date, PAD, y)
  const title = options.title.trim()
  if (title) {
    ctx.fillStyle = c.fg
    ctx.font = font(800, 84)
    for (const line of wrap(ctx, title, W - PAD * 2, 2)) {
      y += 100
      ctx.fillText(line, PAD, y)
    }
  }

  if (options.showRate) {
    y += 120
    ctx.fillStyle = c.muted
    ctx.font = font(600, 36)
    ctx.fillText(text.completion, PAD, y)
    y += 230
    ctx.fillStyle = c.fg
    ctx.font = font(900, 240)
    ctx.fillText(card.rate, PAD - 8, y)
  }

  if (options.showStats) {
    y += 100
    const colW = (W - PAD * 2) / 2
    const stats = [
      [text.sets, `${card.completedSets} / ${card.plannedSets}`],
      [text.volume, card.volumeKg > 0 ? `${Math.round(card.volumeKg).toLocaleString('en-US')} kg` : '—'],
    ]
    stats.forEach(([label, value], i) => {
      const x = PAD + colW * i
      ctx.fillStyle = c.muted
      ctx.font = font(600, 34)
      ctx.fillText(label, x, y)
      ctx.fillStyle = c.fg
      ctx.font = font(800, 64)
      ctx.fillText(value, x, y + 78)
    })
    y += 78
  }

  if (options.showExercises && card.exercises.length > 0) {
    y += 62
    ctx.fillStyle = c.line
    ctx.fillRect(PAD, y, W - PAD * 2, 2)
    y += 20
    const rowH = 70
    const bottom = 1560
    const maxRows = Math.max(1, Math.floor((bottom - y) / rowH))
    const shown = card.exercises.length > maxRows ? card.exercises.slice(0, maxRows - 1) : card.exercises
    for (const e of shown) {
      y += rowH
      const right = e.best ? `${text.setCount(e.sets)} · ${e.best}` : text.setCount(e.sets)
      ctx.font = font(500, 36)
      const rightW = ctx.measureText(right).width
      ctx.fillStyle = c.muted
      ctx.textAlign = 'right'
      ctx.fillText(right, W - PAD, y)
      ctx.textAlign = 'left'
      ctx.fillStyle = c.fg
      ctx.font = font(700, 40)
      ctx.fillText(ellipsize(ctx, e.name, W - PAD * 2 - rightW - 40), PAD, y)
    }
    if (shown.length < card.exercises.length) {
      y += rowH
      ctx.fillStyle = c.muted
      ctx.font = font(500, 36)
      ctx.fillText(text.more(card.exercises.length - shown.length), PAD, y)
    }
  }

  // 名稱與完成標記
  const footY = 1680
  ctx.fillStyle = c.line
  ctx.fillRect(PAD, footY - 80, W - PAD * 2, 2)
  ctx.fillStyle = c.accent
  ctx.font = font(900, 32)
  ctx.textAlign = 'right'
  const done = `✓ ${text.done}`
  ctx.fillText(done, W - PAD, footY)
  const doneW = ctx.measureText(done).width
  ctx.textAlign = 'left'
  if (options.showName) {
    ctx.fillStyle = c.fg
    ctx.font = font(800, 44)
    ctx.fillText(ellipsize(ctx, card.name, W - PAD * 2 - doneW - 40), PAD, footY)
  }

  // 貼紙（文字與 emoji）
  const boxes: Box[] = []
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const s of stickers) {
    ctx.font = font(800, s.size)
    const w = ctx.measureText(s.text).width
    const h = s.size * 1.2
    // 淡淡的陰影，放在照片或任何底色上都看得清楚
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = s.size * 0.12
    ctx.fillStyle = s.color ?? c.fg
    ctx.fillText(s.text, s.x, s.y)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    const box = { id: s.id, left: s.x - w / 2, top: s.y - h / 2, right: s.x + w / 2, bottom: s.y + h / 2 }
    boxes.push(box)
    if (s.id === input.selectedId) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 4
      ctx.setLineDash([16, 10])
      ctx.strokeRect(box.left - 16, box.top - 12, w + 32, h + 24)
      ctx.setLineDash([])
    }
  }

  ctx.restore()
  return boxes
}

function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }) {
  const scale = Math.max(W / img.width, H / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
}

// 逐字畫出加大字距的文字，回傳結束的 x 座標
function spacedText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, spacing: number): number {
  for (const ch of s) {
    ctx.fillText(ch, x, y)
    x += ctx.measureText(ch).width + spacing
  }
  return x
}

// 中文逐字換行、英文以單字換行；超過行數時最後一行加上省略號
function wrap(ctx: CanvasRenderingContext2D, s: string, maxWidth: number, maxLines: number): string[] {
  const tokens = s.match(/[⺀-鿿豈-﫿＀-￯]|\s+|[^\s⺀-鿿豈-﫿＀-￯]+/g) ?? []
  const lines: string[] = []
  let line = ''
  for (const token of tokens) {
    const next = line + token
    if (ctx.measureText(next).width <= maxWidth || line === '') {
      line = next
    } else {
      lines.push(line.trimEnd())
      line = token.trimStart()
    }
  }
  if (line) lines.push(line.trimEnd())
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]}${lines[maxLines]}`, maxWidth)
  return kept
}

function ellipsize(ctx: CanvasRenderingContext2D, s: string, maxWidth: number): string {
  if (ctx.measureText(s).width <= maxWidth) return s
  const chars = [...s]
  while (chars.length > 0 && ctx.measureText(`${chars.join('')}…`).width > maxWidth) chars.pop()
  return `${chars.join('')}…`
}

// IG 限時動態只能從手機 App 發佈；電腦上的系統分享選單沒有 Instagram
export function isMobileDevice(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } }
  if (nav.userAgentData?.mobile !== undefined) return nav.userAgentData.mobile
  const ua = navigator.userAgent
  // iPadOS 的 Safari 會偽裝成 Mac，以觸控點數判斷
  return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}
