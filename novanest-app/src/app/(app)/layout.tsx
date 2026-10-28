import type { Metadata } from 'next'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import LanguageToggle from '@/components/language-toggle'
import NavLink from '@/components/nav-link'
import { I18nProvider } from '@/lib/i18n/client'
import { getI18n } from '@/lib/i18n/server'

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { description: t.meta.description }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const { locale, t } = await getI18n()

  const links = [
    { href: '/training', label: t.nav.plan },
    { href: '/training/log', label: t.nav.log },
    { href: '/progress', label: t.nav.progress },
  ]

  return (
    <I18nProvider locale={locale}>
      <div className="min-h-screen bg-background">
        <div className="bg-foreground px-4 py-2 text-center text-xs tracking-wider text-background">{t.nav.banner}</div>
        <nav aria-label={t.nav.main} className="sticky top-0 z-10 border-b border-line bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
            <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-base font-black uppercase tracking-[0.15em] sm:text-lg sm:tracking-[0.2em]">NovaNest</span>
            </Link>
            <div className="flex items-center gap-4 whitespace-nowrap text-sm sm:gap-6">
              {links.map((l) => (
                <span key={l.href} className="hidden sm:inline">
                  <NavLink href={l.href} variant="inline">
                    {l.label}
                  </NavLink>
                </span>
              ))}
              <NavLink href="/settings" variant="inline" label={t.nav.settingsLabel}>
                <span className="hidden sm:inline">{session.username}</span>
                <GearIcon />
              </NavLink>
              <LanguageToggle />
              <LogoutButton />
            </div>
          </div>
          {/* 手機：主要頁面放在第二列，避免擠在一起 */}
          <div className="grid grid-cols-3 border-t border-line text-sm sm:hidden">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} variant="tab">
                {l.label}
              </NavLink>
            ))}
          </div>
        </nav>
        <main>{children}</main>
      </div>
    </I18nProvider>
  )
}

function GearIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}
