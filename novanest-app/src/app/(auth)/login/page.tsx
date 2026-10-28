'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell, { buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell'
import { useI18n } from '@/lib/i18n/client'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const { t } = useI18n()
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
        setError(t.auth.errors[data.error] ?? t.auth.errors.unknown)
        return
      }
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell image="/images/login.jpg" imageAlt={t.auth.loginImageAlt} tagline={t.auth.loginTagline} title={t.auth.loginTitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>{t.auth.email}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>{t.auth.password}</label>
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
          {loading ? t.auth.loggingIn : t.auth.login}
        </button>
      </form>

      <p className="text-sm text-muted">
        {t.auth.noAccount}{' '}
        <Link href="/register" className="font-semibold text-foreground underline underline-offset-4">
          {t.auth.registerNow}
        </Link>
      </p>
    </AuthShell>
  )
}
