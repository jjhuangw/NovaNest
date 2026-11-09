'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useI18n } from '@/lib/i18n/client'
import {
  drawStory,
  fontFamily,
  H,
  isMobileDevice,
  PALETTES,
  THEMES,
  W,
  type Box,
  type StoryCard,
  type StoryOptions,
  type Sticker,
  type Theme,
} from './story-card'

export type { StoryCard } from './story-card'

const EMOJIS = ['💪', '🔥', '🏋️', '✅', '💯', '🎯', '😤', '🥵', '⚡', '🙌', '😎', '🏆']
const STICKER_COLORS = [null, '#ffffff', '#0e0e0e', '#ff4b57', '#facc15'] as const
const MIN_SIZE = 32
const MAX_SIZE = 420
const MAX_TEXT = 40

type Photo = ImageBitmap

const noop = () => () => {}

export default function StoryShare({
  card,
  date,
  fileName,
  autoOpen = false,
  canUsePhoto = true,
}: {
  card: StoryCard
  date: string
  fileName: string
  autoOpen?: boolean
  // 用自己的照片當背景是 Pro 功能
  canUsePhoto?: boolean
}) {
  const { t } = useI18n()
  const ts = t.log.share
  const [open, setOpen] = useState(autoOpen)
  const mobile = useSyncExternalStore(noop, isMobileDevice, () => false)

  const [options, setOptions] = useState<StoryOptions>({
    theme: 'dark',
    title: card.title,
    showRate: true,
    showStats: true,
    showExercises: true,
    showName: true,
  })
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<{ id: number; image: Photo } | null>(null)
  const [draft, setDraft] = useState('')
  const [exported, setExported] = useState<{ key: string; file: File; url: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  // Free 使用者點了「我的照片」背景時顯示的說明
  const [proNote, setProNote] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxesRef = useRef<Box[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const familyRef = useRef<string | null>(null)

  const selected = stickers.find((s) => s.id === selectedId) ?? null
  const palette = PALETTES[options.theme === 'photo' && !photo ? 'dark' : options.theme]
  // 內容沒變就沿用已產生的圖片；變了要重新匯出才能分享
  const exportKey = useMemo(() => JSON.stringify({ options, stickers, photo: photo?.id ?? null }), [options, stickers, photo])
  const current = exported?.key === exportKey ? exported : null
  const ready = current !== null

  // 預覽：每次變更都重畫，包含選取框
  useEffect(() => {
    if (!open) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    let cancelled = false
    document.fonts.ready.then(() => {
      if (cancelled) return
      familyRef.current ??= fontFamily()
      boxesRef.current = drawStory(ctx, {
        card,
        options,
        text: ts.card,
        family: familyRef.current,
        photo: photo?.image ?? null,
        stickers,
        selectedId,
      })
    })
    return () => {
      cancelled = true
    }
  }, [open, card, options, stickers, selectedId, photo, ts.card])

  // 匯出：停止編輯一下子後產生 PNG。分享必須在點擊當下呼叫，Safari 不允許先等待產生圖片。
  useEffect(() => {
    if (!open || ready) return
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        await document.fonts.ready
        const canvas = document.createElement('canvas')
        canvas.width = W
        canvas.height = H
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D is not supported')
        familyRef.current ??= fontFamily()
        drawStory(ctx, { card, options, text: ts.card, family: familyRef.current, photo: photo?.image ?? null, stickers })
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
        )
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        setExported((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { key: exportKey, file: new File([blob], fileName, { type: 'image/png' }), url }
        })
      } catch (e) {
        console.error('Exporting story card failed', e)
        if (!cancelled) setMessage(ts.drawFailed)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, ready, exportKey, card, options, stickers, photo, fileName, ts.card, ts.drawFailed])

  // 電腦版：產生給手機掃描的 QR code，在手機上開啟同一頁的打卡編輯器
  useEffect(() => {
    if (!open || mobile || qr) return
    let cancelled = false
    const url = `${window.location.origin}/training/log?date=${date}&share=1`
    import('qrcode')
      .then((QR) => QR.toDataURL(url, { width: 320, margin: 1 }))
      .then((data) => !cancelled && setQr(data))
      .catch((e) => console.error('QR code failed', e))
    return () => {
      cancelled = true
    }
  }, [open, mobile, qr, date])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => photo?.image.close(), [photo])

  const canShareFile = mobile && current !== null && !!navigator.canShare?.({ files: [current.file] })

  // Threads：貼文文字附上產品介紹頁的連結（UTM 參數用來統計從 Threads 來的訪客）
  function threadsCaption() {
    const link = `${window.location.origin}/about?utm_source=threads&utm_medium=social&utm_campaign=workout_share`
    const volume = card.volumeKg > 0 ? `${Math.round(card.volumeKg).toLocaleString('en-US')} kg` : null
    return `${ts.threads.caption(options.title.trim() || card.title, card.rate, volume)}\n${link}`
  }

  // 手機：和 IG 一樣只分享圖片（同時帶文字時，有些 App 只收文字、圖片會不見），
  // 貼文文字先複製到剪貼簿，讓使用者在 Threads 直接貼上。
  // 兩個呼叫都在點擊當下送出，不等待複製完成，避免 Safari 認為分享不是使用者觸發的。
  function shareImageToThreads() {
    if (!current) return
    setMessage(null)
    navigator.clipboard?.writeText(threadsCaption()).catch(() => {})
    navigator.share({ files: [current.file] }).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('Sharing to Threads failed', e)
      setMessage(ts.failed(e instanceof Error ? e.name : 'Error'))
    })
  }

  // 電腦：Threads 的發文網址不能帶圖片，所以先把圖片複製到剪貼簿，再開啟已帶入文字的發文畫面讓使用者貼上。
  // 複製與開新視窗都在點擊當下呼叫（不等待），否則瀏覽器會擋下彈出視窗或剪貼簿寫入。
  const canCopyImage = !mobile && current !== null && typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write
  function copyImageAndOpenThreads() {
    if (!current) return
    setMessage(null)
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': current.file })])
      .then(() => setMessage(ts.threads.imageCopied))
      .catch((e: unknown) => {
        console.error('Copying story card failed', e)
        setMessage(ts.threads.copyFailed)
      })
    postTextToThreads()
  }

  // 文字＋連結：開啟 Threads 的發文畫面（手機會開啟 App），不含圖片
  function postTextToThreads() {
    const url = `https://www.threads.com/intent/post?text=${encodeURIComponent(threadsCaption())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function share() {
    if (!current) return
    setMessage(null)
    try {
      // 只帶檔案：附上文字時，部分 App 會只收文字或不顯示 Instagram
      await navigator.share({ files: [current.file] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      console.error('Sharing story card failed', e)
      setMessage(ts.failed(e instanceof Error ? e.name : 'Error'))
    }
  }

  // ---------- 編輯 ----------

  const setOption = <K extends keyof StoryOptions>(key: K, value: StoryOptions[K]) => setOptions((o) => ({ ...o, [key]: value }))

  function chooseTheme(theme: Theme) {
    if (theme === 'photo' && !canUsePhoto) {
      setProNote(true)
      return
    }
    if (theme === 'photo' && !photo) {
      photoInputRef.current?.click()
      return
    }
    setOption('theme', theme)
  }

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      // 照片只在瀏覽器裡使用，不會上傳
      const image = await createImageBitmap(f)
      setPhoto({ id: Date.now(), image })
      setOption('theme', 'photo')
    } catch (err) {
      console.error('Reading background photo failed', err)
      setMessage(ts.photoFailed)
    }
  }

  function removePhoto() {
    setPhoto(null)
    setOption('theme', 'dark')
  }

  function addSticker(text: string, size: number) {
    const value = [...text.trim()].slice(0, MAX_TEXT).join('')
    if (!value) return
    const id = crypto.randomUUID()
    // 錯開位置，連續新增時不會疊在同一點
    const offset = (stickers.length % 5) * 60
    setStickers((list) => [...list, { id, text: value, x: W / 2, y: 820 + offset, size, color: null }])
    setSelectedId(id)
  }

  const updateSelected = (patch: Partial<Sticker>) =>
    setStickers((list) => list.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)))

  function removeSelected() {
    setStickers((list) => list.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }

  // ---------- 拖曳與雙指縮放 ----------

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ id: string; dx: number; dy: number; startDist: number; startSize: number } | null>(null)

  function toCanvas(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const p = toCanvas(e)
    pointers.current.set(e.pointerId, p)
    e.currentTarget.setPointerCapture(e.pointerId)

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()]
      const sticker = stickers.find((s) => s.id === gesture.current!.id)
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y)
      gesture.current.startSize = sticker?.size ?? 96
      return
    }

    const pad = 24
    const hit = [...boxesRef.current]
      .reverse()
      .find((b) => p.x >= b.left - pad && p.x <= b.right + pad && p.y >= b.top - pad && p.y <= b.bottom + pad)
    if (!hit) {
      setSelectedId(null)
      gesture.current = null
      return
    }
    const sticker = stickers.find((s) => s.id === hit.id)!
    setSelectedId(hit.id)
    gesture.current = { id: hit.id, dx: p.x - sticker.x, dy: p.y - sticker.y, startDist: 0, startSize: sticker.size }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return
    const p = toCanvas(e)
    pointers.current.set(e.pointerId, p)
    const g = gesture.current

    if (pointers.current.size >= 2 && g.startDist > 0) {
      const [a, b] = [...pointers.current.values()]
      const size = clamp(g.startSize * (Math.hypot(a.x - b.x, a.y - b.y) / g.startDist), MIN_SIZE, MAX_SIZE)
      setStickers((list) => list.map((s) => (s.id === g.id ? { ...s, size } : s)))
      return
    }
    const x = clamp(p.x - g.dx, 0, W)
    const y = clamp(p.y - g.dy, 0, H)
    setStickers((list) => list.map((s) => (s.id === g.id ? { ...s, x, y } : s)))
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size === 0) {
      gesture.current = null
    } else if (gesture.current) {
      // 放開一指後改回拖曳，避免剩下那一指造成跳動
      const [rest] = [...pointers.current.values()]
      const s = stickers.find((st) => st.id === gesture.current!.id)
      if (s) gesture.current = { ...gesture.current, dx: rest.x - s.x, dy: rest.y - s.y, startDist: 0 }
    }
  }

  const sectionLabel = 'mb-2 block text-xs font-semibold tracking-wider text-muted'
  const chip = (active: boolean) =>
    `min-h-10 border px-3 text-sm ${active ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMessage(null)
          setOpen(true)
        }}
        className="inline-flex min-h-11 items-center gap-2 border border-foreground px-4 text-sm font-semibold hover:bg-foreground hover:text-background"
      >
        <InstagramIcon />
        {ts.button}
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="story-share-title" className="fixed inset-0 z-50 overflow-y-auto bg-background">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-background px-4 py-3 sm:px-6">
            <h2 id="story-share-title" className="text-lg font-bold">
              {ts.title}
            </h2>
            <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="min-h-10 px-2 text-sm text-muted hover:text-foreground">
              {t.common.close}
            </button>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-6 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)]">
            {/* 預覽：可直接拖曳文字與 emoji */}
            <div className="flex flex-col items-center md:sticky md:top-20 md:self-start">
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                aria-label={ts.previewAlt}
                className="aspect-[9/16] h-[min(62vh,640px)] w-auto touch-none border border-line bg-stone"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
              <p className="mt-2 max-w-xs text-center text-xs text-muted">{ts.dragHint}</p>
            </div>

            <div className="min-w-0 space-y-7">
              <label className="block">
                <span className={sectionLabel}>{ts.titleLabel}</span>
                <input
                  type="text"
                  value={options.title}
                  maxLength={60}
                  onChange={(e) => setOption('title', e.target.value)}
                  className="block min-h-11 w-full border border-line bg-surface px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
                />
              </label>

              <fieldset>
                <legend className={sectionLabel}>{ts.showLabel}</legend>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['showRate', ts.show.rate],
                      ['showStats', ts.show.stats],
                      ['showExercises', ts.show.exercises],
                      ['showName', ts.show.name],
                    ] as const
                  ).map(([key, label]) => (
                    <button key={key} type="button" aria-pressed={options[key]} onClick={() => setOption(key, !options[key])} className={chip(options[key])}>
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={sectionLabel}>{ts.themeLabel}</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {THEMES.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      aria-pressed={options.theme === theme}
                      onClick={() => chooseTheme(theme)}
                      className={`${chip(options.theme === theme)} inline-flex items-center gap-2`}
                    >
                      <span aria-hidden className="h-4 w-4 border border-line" style={{ background: theme === 'photo' ? 'linear-gradient(135deg,#6b7280,#111)' : PALETTES[theme].bg }} />
                      {ts.themes[theme]}
                      {theme === 'photo' && !canUsePhoto && <span className="border border-current px-1 text-[10px] font-bold leading-tight">PRO</span>}
                    </button>
                  ))}
                  <input ref={photoInputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onPhoto} />
                </div>
                {photo && (
                  <div className="mt-2 flex gap-4 text-xs">
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="underline-offset-4 hover:underline">
                      {ts.changePhoto}
                    </button>
                    <button type="button" onClick={removePhoto} className="text-muted underline-offset-4 hover:text-accent hover:underline">
                      {ts.removePhoto}
                    </button>
                  </div>
                )}
                <p className="mt-2 text-xs text-muted">{ts.photoHint}</p>
                {proNote && <p className="mt-2 border-l-2 border-accent bg-stone px-3 py-2 text-xs">{`${ts.photoProOnly}${t.aiLimit.upgrade}`}</p>}
              </fieldset>

              <div>
                <span className={sectionLabel}>{ts.addLabel}</span>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    addSticker(draft, 96)
                    setDraft('')
                  }}
                >
                  <input
                    type="text"
                    value={draft}
                    maxLength={MAX_TEXT * 2}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={ts.textPlaceholder}
                    aria-label={ts.addLabel}
                    className="block min-h-11 min-w-0 flex-1 border border-line bg-surface px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
                  />
                  <button type="submit" disabled={!draft.trim()} className="min-h-11 shrink-0 bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-40">
                    {ts.addText}
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label={ts.emojiLabel}>
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => addSticker(emoji, 160)} className="h-11 w-11 text-2xl hover:bg-stone" aria-label={ts.addEmoji(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {selected && (
                <div className="space-y-4 border border-line p-4">
                  <p className="truncate text-sm font-semibold">{ts.selected(selected.text)}</p>
                  <label className="block">
                    <span className={sectionLabel}>{ts.size}</span>
                    <input
                      type="range"
                      min={MIN_SIZE}
                      max={MAX_SIZE}
                      value={Math.round(selected.size)}
                      onChange={(e) => updateSelected({ size: Number(e.target.value) })}
                      className="w-full accent-current"
                    />
                  </label>
                  <div>
                    <span className={sectionLabel}>{ts.color}</span>
                    <div className="flex gap-2">
                      {STICKER_COLORS.map((color) => (
                        <button
                          key={color ?? 'auto'}
                          type="button"
                          aria-label={color ?? ts.autoColor}
                          title={color ?? ts.autoColor}
                          aria-pressed={selected.color === color}
                          onClick={() => updateSelected({ color })}
                          className={`h-9 w-9 border-2 text-[10px] font-semibold ${selected.color === color ? 'border-foreground' : 'border-line'}`}
                          style={{ background: color ?? `linear-gradient(135deg, ${palette.bg} 50%, ${palette.fg} 50%)` }}
                        >
                          {color === null && <span className="sr-only">{ts.autoColor}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={removeSelected} className="text-sm text-accent underline-offset-4 hover:underline">
                    {ts.removeSticker}
                  </button>
                </div>
              )}

              {/* 分享與下載 */}
              <div className="space-y-3 border-t border-line pt-6">
                {canShareFile && (
                  <button type="button" onClick={share} className="block min-h-12 w-full bg-foreground text-sm font-semibold text-background hover:opacity-85">
                    {ts.share}
                  </button>
                )}
                <a
                  href={current?.url}
                  download={fileName}
                  aria-disabled={!ready}
                  onClick={(e) => !ready && e.preventDefault()}
                  className={`flex min-h-12 w-full items-center justify-center text-sm font-semibold ${
                    canShareFile ? 'border border-line hover:border-foreground' : 'bg-foreground text-background hover:opacity-85'
                  } ${ready ? '' : 'pointer-events-none opacity-50'}`}
                >
                  {ready ? ts.download : ts.preparing}
                </a>
                {mobile ? (
                  <p className="text-xs text-muted">{canShareFile ? ts.shareHint : ts.downloadHint}</p>
                ) : (
                  <div className="flex items-start gap-4 bg-stone p-4">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 本機產生的 QR code */}
                    {qr && <img src={qr} alt={ts.qrAlt} width={120} height={120} className="shrink-0 bg-white p-1" />}
                    <div className="text-sm">
                      <p className="font-semibold">{ts.desktopTitle}</p>
                      <p className="mt-1 text-xs text-muted">{ts.desktopHint}</p>
                    </div>
                  </div>
                )}
                {message && <p className="text-xs text-accent">{message}</p>}

                {/* Threads */}
                <div className="space-y-3 border-t border-line pt-6">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold">
                    <ThreadsIcon />
                    Threads
                  </p>
                  {canShareFile && (
                    <button type="button" onClick={shareImageToThreads} className="block min-h-12 w-full border border-foreground text-sm font-semibold hover:bg-foreground hover:text-background">
                      {ts.threads.shareImage}
                    </button>
                  )}
                  {canCopyImage && (
                    <button type="button" onClick={copyImageAndOpenThreads} className="block min-h-12 w-full border border-foreground text-sm font-semibold hover:bg-foreground hover:text-background">
                      {ts.threads.copyImage}
                    </button>
                  )}
                  <button type="button" onClick={postTextToThreads} className="block min-h-12 w-full border border-line text-sm font-semibold hover:border-foreground">
                    {ts.threads.postText}
                  </button>
                  <p className="text-xs text-muted">{canShareFile ? ts.threads.hintMobile : ts.threads.hintDesktop}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function ThreadsIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M16.5 11.2c-.4-2.4-2-3.7-4.4-3.7-2.7 0-4.4 1.9-4.4 4.6s1.7 4.4 4.2 4.4c2.3 0 3.6-1.3 3.6-3.1 0-1.6-1.2-2.6-3-2.6-1.5 0-2.5.8-2.5 1.9 0 1 .8 1.6 1.9 1.6" />
      <path d="M19.5 8.5C18.4 5 15.6 3 12 3 6.9 3 3.5 6.6 3.5 12s3.4 9 8.5 9c3.4 0 6-1.5 7.2-4" />
    </svg>
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
