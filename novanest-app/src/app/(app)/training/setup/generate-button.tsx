'use client'

import { useFormStatus } from 'react-dom'

// 產生課表要等 1–2 分鐘，按下後顯示進度文字並停用按鈕
export function GenerateButton({ label, pendingLabel, primary }: { label: string; pendingLabel: string; primary: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full px-12 py-3.5 text-center text-sm font-semibold uppercase tracking-widest transition-opacity disabled:opacity-60 sm:w-auto ${
        primary ? 'bg-accent text-white hover:opacity-85' : 'border border-line hover:border-foreground'
      }`}
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
