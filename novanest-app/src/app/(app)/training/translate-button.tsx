'use client'

import { useFormStatus } from 'react-dom'

// 翻譯約需數十秒，送出後顯示進行中並避免重複送出
export default function TranslateButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 shrink-0 bg-foreground px-5 text-sm font-semibold text-background hover:opacity-85 disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
