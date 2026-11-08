'use client'

import { useFormStatus } from 'react-dom'

// 送出前跳出確認視窗的單一按鈕表單
export default function ConfirmForm({
  action,
  fields,
  confirm,
  label,
  danger = false,
}: {
  action: (formData: FormData) => Promise<void>
  fields: Record<string, string>
  confirm: string
  label: string
  danger?: boolean
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) e.preventDefault()
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button label={label} danger={danger} />
    </form>
  )
}

function Button({ label, danger }: { label: string; danger: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 w-full border px-5 text-sm font-semibold transition-opacity disabled:opacity-50 sm:w-auto ${
        danger ? 'border-accent text-accent hover:bg-accent hover:text-background' : 'border-foreground hover:bg-foreground hover:text-background'
      }`}
    >
      {label}
    </button>
  )
}
