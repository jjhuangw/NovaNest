'use client'

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      登出
    </button>
  )
}
