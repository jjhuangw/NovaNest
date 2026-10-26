'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell, { buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell image="/images/register.jpg" imageAlt="在瑜珈墊上做樹式的女性" tagline="打造屬於你的體態。" title="建立帳號">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>使用者名稱</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="英數字與底線"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>密碼（至少 8 字元）</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
          />
        </div>

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? '註冊中...' : '建立帳號'}
        </button>
      </form>

      <p className="text-sm text-muted">
        已有帳號？{' '}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
          登入
        </Link>
      </p>
    </AuthShell>
  )
}
