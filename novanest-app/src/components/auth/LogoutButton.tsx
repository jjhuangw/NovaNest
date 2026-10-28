'use client'

import { useI18n } from '@/lib/i18n/client'

export default function LogoutButton() {
  const { t } = useI18n()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <button
      onClick={handleLogout}
      className="whitespace-nowrap text-sm text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline"
    >
      {t.nav.logout}
    </button>
  )
}
