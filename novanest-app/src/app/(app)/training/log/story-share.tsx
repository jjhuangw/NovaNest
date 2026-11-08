'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/lib/i18n/client'

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

// IG 限時動態的尺寸；上下約 250px 會被 IG 的介面蓋住，內容放在中間
const W = 1080
const H = 1920
const PAD = 96
const COLORS = { bg: '#0e0e0e', fg: '#f2f2f0', muted: '#a3a3a0', line: '#34342f', accent: '#ff4b57' }

type Status = 'idle' | 'drawing' | 'ready' | 'error'

export default function StoryShare({ card, fileName }: { card: StoryCard; fileName: string }) {
  const { t } = useI18n()
  const ts = t.log.share
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 先把圖片產生好；分享必須在點擊當下呼叫，Safari 不允許等待太久
  async function start() {
    setOpen(true)
    setMessage(null)
    if (file) return
    setStatus('drawing')
    try {
      const blob = await drawCard(card, ts.card)
      const f = new File([blob], fileName, { type: 'image/png' })
      setFile(f)
      setUrl(URL.createObjectURL(blob))
      setStatus('ready')
    } catch (e) {
      console.error('Drawing story card failed', e)
      setStatus('error')
    }
  }

  const canShareFile = file !== null && typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] })

  async function share() {
    if (!file) return
    try {
      // 只帶檔案：附上文字時，部分 App 會只收文字或不顯示 Instagram
      await navigator.share({ files: [file] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('Sharing story card failed', e)
      setMessage(ts.failed)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="inline-flex min-h-11 items-center gap-2 border border-foreground px-4 text-sm font-semibold hover:bg-foreground hover:text-background"
      >
        <InstagramIcon />
        {ts.button}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="story-share-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="max-h-full w-full max-w-md overflow-y-auto bg-background p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 id="story-share-title" className="text-lg font-bold">
                {ts.title}
              </h2>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="text-sm text-muted hover:text-foreground">
                {t.common.close}
              </button>
            </div>

            <div className="mx-auto mt-4 aspect-[9/16] w-full max-w-[16rem] bg-stone">
              {/* eslint-disable-next-line @next/next/no-img-element -- 本機產生的 blob 圖片，不需要最佳化 */}
              {url && <img src={url} alt={ts.previewAlt} className="h-full w-full object-contain" />}
              {status === 'drawing' && <p className="flex h-full items-center justify-center text-sm text-muted">{ts.preparing}</p>}
              {status === 'error' && <p className="flex h-full items-center justify-center px-4 text-center text-sm text-accent">{ts.drawFailed}</p>}
            </div>

            {status === 'ready' && (
              <div className="mt-6 space-y-3">
                {canShareFile && (
                  <button type="button" onClick={share} className="block min-h-11 w-full bg-foreground text-sm font-semibold text-background hover:opacity-85">
                    {ts.share}
                  </button>
                )}
                <a
                  href={url ?? undefined}
                  download={fileName}
                  className={`flex min-h-11 w-full items-center justify-center text-sm font-semibold ${
                    canShareFile ? 'border border-line hover:border-foreground' : 'bg-foreground text-background hover:opacity-85'
                  }`}
                >
                  {ts.download}
                </a>
                <p className="text-xs text-muted">{canShareFile ? ts.shareHint : ts.downloadHint}</p>
                {message && <p className="text-xs text-accent">{message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function InstagramIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ---------- 繪製 ----------

type CardText = ReturnType<typeof useI18n>['t']['log']['share']['card']

async function drawCard(card: StoryCard, text: CardText): Promise<Blob> {
  await document.fonts.ready
  // 沿用頁面字型，再接上各平台的中文字型
  const family = `${getComputedStyle(document.body).fontFamily}, "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif`
  const font = (weight: number, size: number) => `${weight} ${size}px ${family}`

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is not supported')
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)

  // 品牌
  let y = 300
  ctx.fillStyle = COLORS.accent
  ctx.beginPath()
  ctx.arc(PAD + 14, y - 14, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COLORS.fg
  ctx.font = font(900, 40)
  spacedText(ctx, 'NOVANEST', PAD + 46, y, 8)

  // 日期與課表
  y += 110
  ctx.fillStyle = COLORS.muted
  ctx.font = font(600, 40)
  ctx.fillText(card.date, PAD, y)
  ctx.fillStyle = COLORS.fg
  ctx.font = font(800, 84)
  for (const line of wrap(ctx, card.title, W - PAD * 2, 2)) {
    y += 100
    ctx.fillText(line, PAD, y)
  }

  // 完成率
  y += 120
  ctx.fillStyle = COLORS.muted
  ctx.font = font(600, 36)
  ctx.fillText(text.completion, PAD, y)
  y += 230
  ctx.fillStyle = COLORS.fg
  ctx.font = font(900, 240)
  ctx.fillText(card.rate, PAD - 8, y)

  // 組數與訓練量
  y += 100
  const colW = (W - PAD * 2) / 2
  const stats = [
    [text.sets, `${card.completedSets} / ${card.plannedSets}`],
    [text.volume, card.volumeKg > 0 ? `${Math.round(card.volumeKg).toLocaleString('en-US')} kg` : '—'],
  ]
  stats.forEach(([label, value], i) => {
    const x = PAD + colW * i
    ctx.fillStyle = COLORS.muted
    ctx.font = font(600, 34)
    ctx.fillText(label, x, y)
    ctx.fillStyle = COLORS.fg
    ctx.font = font(800, 64)
    ctx.fillText(value, x, y + 78)
  })

  // 動作清單
  y += 140
  ctx.fillStyle = COLORS.line
  ctx.fillRect(PAD, y, W - PAD * 2, 2)
  y += 20
  const rowH = 70
  const bottom = 1560
  const maxRows = Math.floor((bottom - y) / rowH)
  const shown = card.exercises.length > maxRows ? card.exercises.slice(0, maxRows - 1) : card.exercises
  for (const e of shown) {
    y += rowH
    const right = e.best ? `${text.setCount(e.sets)} · ${e.best}` : text.setCount(e.sets)
    ctx.font = font(500, 36)
    const rightW = ctx.measureText(right).width
    ctx.fillStyle = COLORS.muted
    ctx.textAlign = 'right'
    ctx.fillText(right, W - PAD, y)
    ctx.textAlign = 'left'
    ctx.fillStyle = COLORS.fg
    ctx.font = font(700, 40)
    ctx.fillText(ellipsize(ctx, e.name, W - PAD * 2 - rightW - 40), PAD, y)
  }
  if (shown.length < card.exercises.length) {
    y += rowH
    ctx.fillStyle = COLORS.muted
    ctx.font = font(500, 36)
    ctx.fillText(text.more(card.exercises.length - shown.length), PAD, y)
  }

  // 名稱與完成標記
  const footY = 1680
  ctx.fillStyle = COLORS.line
  ctx.fillRect(PAD, footY - 80, W - PAD * 2, 2)
  ctx.fillStyle = COLORS.accent
  ctx.font = font(900, 32)
  ctx.textAlign = 'right'
  const done = `✓ ${text.done}`
  ctx.fillText(done, W - PAD, footY)
  const doneW = ctx.measureText(done).width
  ctx.textAlign = 'left'
  ctx.fillStyle = COLORS.fg
  ctx.font = font(800, 44)
  ctx.fillText(ellipsize(ctx, card.name, W - PAD * 2 - doneW - 40), PAD, footY)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'))
}

function spacedText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, spacing: number) {
  for (const ch of s) {
    ctx.fillText(ch, x, y)
    x += ctx.measureText(ch).width + spacing
  }
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
