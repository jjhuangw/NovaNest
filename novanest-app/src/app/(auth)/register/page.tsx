'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthShell, { buttonClass, inputClass, labelClass } from '@/components/auth/AuthShell'
import { useI18n } from '@/lib/i18n/client'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const { t } = useI18n()
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
        setError(t.auth.errors[data.error] ?? t.auth.errors.unknown)
        return
      }
      window.location.href = '/dashboard'
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell image="/images/register.jpg" imageAlt={t.auth.registerImageAlt} tagline={t.auth.registerTagline} title={t.auth.registerTitle}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={labelClass}>{t.auth.username}</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder={t.auth.usernamePlaceholder}
            className={inputClass}
          />
        </div>
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
          <label className={labelClass}>{t.auth.passwordHint}</label>
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
          {loading ? t.auth.registering : t.auth.register}
        </button>
      </form>

      <p className="text-sm text-muted">
        {t.auth.haveAccount}{' '}
        <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
          {t.auth.login}
        </Link>
      </p>
    </AuthShell>
  )
}
