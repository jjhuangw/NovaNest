import Link from 'next/link'
import LanguageToggle from '@/components/language-toggle'
import type { Messages } from '@/lib/i18n/messages'

// 對外的聯絡信箱（Cloudflare Email Routing 轉寄）
export const CONTACT_EMAIL = 'contact@novanestfit.com'

// 產品介紹頁與品牌故事頁共用的頁首。sectionBase：功能、如何開始兩個區塊所在的頁面（同一頁時為空字串）
export function SiteHeader({ t, sectionBase = '' }: { t: Messages; sectionBase?: string }) {
  const tl = t.landing
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={sectionBase || '/'} className="inline-flex shrink-0 items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-base font-black uppercase tracking-[0.15em] sm:text-lg sm:tracking-[0.2em]">NovaNest</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold sm:gap-6">
          <a href={`${sectionBase}#features`} className="hidden hover:underline sm:inline">
            {tl.nav.features}
          </a>
          <a href={`${sectionBase}#how`} className="hidden hover:underline md:inline">
            {tl.nav.how}
          </a>
          <Link href="/story" className="hidden hover:underline sm:inline">
            {tl.nav.story}
          </Link>
          <LanguageToggle />
          <Link href="/login" className="hover:underline">
            {tl.nav.login}
          </Link>
          <Link href="/register" className="hidden bg-foreground px-4 py-2 text-background hover:opacity-85 sm:inline-block">
            {tl.nav.start}
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter({ t }: { t: Messages }) {
  const tl = t.landing
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-xs text-muted">
      <span>{tl.footer}</span>
      <Link href="/story" className="hover:text-foreground hover:underline">
        {tl.footerStory}
      </Link>
      <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-foreground hover:underline">
        {CONTACT_EMAIL}
      </a>
    </footer>
  )
}
