'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell, { buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
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
    <AuthShell image="/images/login.jpg" imageAlt="在木地板上冥想的人" tagline="每一天，都更接近理想的自己。" title="登入帳號">
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <label className={labelClass}>密碼</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={inputClass}
          />
        </div>

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

        <button type="submit" disabled={loading} className={buttonClass}>
          {loading ? '登入中...' : '登入'}
        </button>
      </form>

      <p className="text-sm text-muted">
        還沒有帳號？{' '}
        <Link href="/register" className="font-semibold text-foreground underline underline-offset-4">
          立即註冊
        </Link>
      </p>
    </AuthShell>
  )
}
