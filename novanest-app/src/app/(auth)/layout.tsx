import type { Metadata } from 'next'
import LanguageToggle from '@/components/language-toggle'
import { I18nProvider } from '@/lib/i18n/client'
import { getI18n } from '@/lib/i18n/server'

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { description: t.meta.description }
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n()
  return (
    <I18nProvider locale={locale}>
      <div className="relative">
        <LanguageToggle className="absolute right-4 top-4 z-10 bg-background lg:right-6 lg:top-6" />
        {children}
      </div>
    </I18nProvider>
  )
}
