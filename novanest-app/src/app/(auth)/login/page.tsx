'use client'

import { useState } from 'react'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">NovaNest</h1>
          <p className="text-zinc-400 mt-2 text-sm">打造屬於你的體態</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <h2 className="text-lg font-semibold text-white">登入帳號</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">密碼</label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {loading ? '登入中...' : '登入'}
            </button>
          </form>

          <p className="text-sm text-center text-zinc-500">
            還沒有帳號？{' '}
            <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
              立即註冊
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
