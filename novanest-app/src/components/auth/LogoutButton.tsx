'use client'

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
    >
      登出
    </button>
  )
}
