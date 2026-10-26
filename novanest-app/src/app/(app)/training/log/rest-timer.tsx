'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { formatDuration } from '@/lib/training/plan'

// 以「結束時間」計算剩餘秒數，螢幕關閉或切換分頁回來後仍然準確。
interface Timer {
  label: string
  duration: number
  endAt: number | null
  // 暫停時記錄剩餘毫秒；計時中為 null
  pausedRemaining: number | null
}

interface RestTimerContextValue {
  start: (label: string, seconds: number) => void
}

const RestTimerContext = createContext<RestTimerContextValue | null>(null)

let audioContext: AudioContext | null = null

// 瀏覽器只允許在使用者操作時啟用音效，所以在按下「休息」時先建立 AudioContext
function unlockAudio() {
  try {
    audioContext ??= new AudioContext()
    if (audioContext.state === 'suspended') void audioContext.resume()
  } catch {
    audioContext = null
  }
}

function beep() {
  if (!audioContext) return
  const now = audioContext.currentTime
  ;[0, 0.3, 0.6].forEach((offset) => {
    const osc = audioContext!.createOscillator()
    const gain = audioContext!.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.3, now + offset)
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2)
    osc.connect(gain).connect(audioContext!.destination)
    osc.start(now + offset)
    osc.stop(now + offset + 0.2)
  })
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [timer, setTimer] = useState<Timer | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const notifiedFor = useRef<number | null>(null)

  const start = useCallback((label: string, seconds: number) => {
    unlockAudio()
    const t = Date.now()
    setNow(t)
    setTimer({ label, duration: seconds, endAt: t + seconds * 1000, pausedRemaining: null })
  }, [])

  const remainingMs = !timer ? 0 : timer.pausedRemaining ?? Math.max(0, (timer.endAt ?? 0) - now)
  const remaining = Math.ceil(remainingMs / 1000)
  const running = !!timer && timer.pausedRemaining === null && remainingMs > 0
  const finished = !!timer && timer.pausedRemaining === null && remainingMs === 0

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!finished || !timer?.endAt || notifiedFor.current === timer.endAt) return
    notifiedFor.current = timer.endAt
    beep()
    navigator.vibrate?.([300, 150, 300])
  }, [finished, timer?.endAt])

  useEffect(() => {
    if (!timer) return
    const original = document.title
    document.title = finished ? '休息結束！' : `${formatDuration(remaining)} 休息中`
    return () => {
      document.title = original
    }
  }, [timer, finished, remaining])

  function adjust(deltaSeconds: number) {
    setTimer((t) => {
      if (!t) return t
      if (t.pausedRemaining !== null) {
        return { ...t, pausedRemaining: Math.max(0, t.pausedRemaining + deltaSeconds * 1000) }
      }
      const current = Date.now()
      const endAt = Math.max(current, (t.endAt ?? current) + deltaSeconds * 1000)
      return { ...t, endAt }
    })
  }

  function togglePause() {
    const current = Date.now()
    setNow(current)
    setTimer((t) => {
      if (!t) return t
      if (t.pausedRemaining !== null) {
        return { ...t, endAt: current + t.pausedRemaining, pausedRemaining: null }
      }
      return { ...t, pausedRemaining: Math.max(0, (t.endAt ?? current) - current) }
    })
  }

  const progress = timer ? 1 - remainingMs / (timer.duration * 1000) : 0

  return (
    <RestTimerContext.Provider value={{ start }}>
      {children}
      {timer && (
        <div
          role="timer"
          aria-live={finished ? 'assertive' : 'off'}
          className={`fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] text-white ${
            finished ? 'border-accent bg-accent' : 'border-foreground bg-foreground'
          }`}
        >
          <div className="h-1 bg-white/20">
            <div className="h-full bg-white transition-[width] duration-200" style={{ width: `${Math.min(100, progress * 100)}%` }} />
          </div>
          <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-white/70">{finished ? '休息結束，開始下一組！' : `休息中・${timer.label}`}</p>
              <p className="text-3xl font-bold tabular-nums">{formatDuration(remaining)}</p>
            </div>
            {!finished && (
              <>
                <TimerButton onClick={() => adjust(-15)} label="減少 15 秒">
                  −15
                </TimerButton>
                <TimerButton onClick={() => adjust(15)} label="增加 15 秒">
                  +15
                </TimerButton>
                <TimerButton onClick={togglePause} label={timer.pausedRemaining !== null ? '繼續' : '暫停'}>
                  {timer.pausedRemaining !== null ? '繼續' : '暫停'}
                </TimerButton>
              </>
            )}
            <TimerButton onClick={() => setTimer(null)} label={finished ? '關閉' : '略過休息'}>
              {finished ? '關閉' : '略過'}
            </TimerButton>
          </div>
        </div>
      )}
    </RestTimerContext.Provider>
  )
}

function TimerButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 border border-white/40 px-2.5 py-2 text-xs font-semibold tabular-nums transition-colors hover:bg-white hover:text-foreground sm:px-3"
    >
      {children}
    </button>
  )
}

export function RestButton({ label, seconds }: { label: string; seconds: number }) {
  const ctx = useContext(RestTimerContext)
  if (!ctx) throw new Error('RestButton must be used inside RestTimerProvider')
  return (
    <button
      type="button"
      onClick={() => ctx.start(label, seconds)}
      className="shrink-0 border border-foreground px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-foreground hover:text-white"
    >
      休息 {formatDuration(seconds)}
    </button>
  )
}
