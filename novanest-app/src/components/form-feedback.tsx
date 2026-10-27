'use client'

import { useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'

export function SubmitButton({ label = '儲存紀錄' }: { label?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto sm:px-12"
    >
      {pending ? '儲存中…' : label}
    </button>
  )
}

// 儲存後固定在畫面頂部顯示提示（底部留給休息計時器），幾秒後自動消失。
// 每次儲存的 savedAt 都不同，讓連續儲存也會重新顯示。
export function SavedToast({ savedAt, message }: { savedAt: string; message: string }) {
  const [hiddenFor, setHiddenFor] = useState<string | null>(null)
  const visible = hiddenFor !== savedAt

  useEffect(() => {
    // 從網址移除 saved，避免重新整理時再次顯示
    const url = new URL(window.location.href)
    url.searchParams.delete('saved')
    window.history.replaceState(window.history.state, '', url)

    const timer = setTimeout(() => setHiddenFor(savedAt), 3500)
    return () => clearTimeout(timer)
  }, [savedAt])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 bg-foreground px-5 py-4 text-sm text-white shadow-lg transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'
      }`}
    >
      <span>
        <span aria-hidden className="mr-2 text-accent">
          ✓
        </span>
        {message}
      </span>
      <button type="button" onClick={() => setHiddenFor(savedAt)} className="shrink-0 whitespace-nowrap text-xs text-white/70 hover:text-white">
        關閉
      </button>
    </div>
  )
}
