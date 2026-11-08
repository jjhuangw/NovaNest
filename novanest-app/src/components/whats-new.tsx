'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/client'

const SEEN_KEY = 'novanest:seen-version'

// 更新後第一次進入時，在導覽列下方顯示這一版的新功能；按「知道了」之後這台裝置不再顯示。
// 記錄存在瀏覽器（localStorage），讀不到時（例如無痕模式）就不顯示，避免每次都跳出來。
export default function WhatsNew({ version, items }: { version: string; items: string[] }) {
  const { t } = useI18n()
  const tw = t.whatsNew
  const [visible, setVisible] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let seen: string | null = 'unknown'
    try {
      seen = window.localStorage.getItem(SEEN_KEY)
    } catch {
      return
    }
    // 只在載入後判斷，伺服器與瀏覽器第一次渲染的內容才會一致
    const show = seen !== version
    const timer = window.setTimeout(() => setVisible(show), 0)
    return () => window.clearTimeout(timer)
  }, [version])

  function dismiss() {
    setVisible(false)
    try {
      window.localStorage.setItem(SEEN_KEY, version)
    } catch {
      // 存不了就算了，這次先關掉
    }
  }

  if (!visible || items.length === 0) return null

  return (
    <aside aria-label={tw.label} className="border-b border-line bg-stone">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm">
            <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />
            <span className="font-semibold">{tw.title(version)}</span>
          </p>
          <div className="flex shrink-0 items-center gap-4 text-sm font-semibold">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="underline-offset-4 hover:underline">
              {expanded ? tw.hide : tw.show}
            </button>
            <button type="button" onClick={dismiss} className="border border-foreground px-3 py-1 hover:bg-foreground hover:text-background">
              {tw.dismiss}
            </button>
          </div>
        </div>
        {expanded && (
          <div className="mt-3">
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link href="/changelog" onClick={dismiss} className="mt-3 inline-block text-sm font-semibold underline-offset-4 hover:underline">
              {tw.viewAll}
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
