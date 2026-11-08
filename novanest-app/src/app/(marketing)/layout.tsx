import type { Metadata } from 'next'
import { I18nProvider } from '@/lib/i18n/client'
import { getI18n } from '@/lib/i18n/server'

export const instant = false

// 分享連結（Threads、LINE 等）的預覽需要完整網址；Vercel 會提供正式網域
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n()
  return {
    title: t.landing.metaTitle,
    description: t.meta.description,
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    openGraph: {
      title: t.landing.metaTitle,
      description: t.meta.description,
      siteName: 'NovaNest',
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'zh_TW',
      images: [{ url: '/images/hero.jpg', width: 1600, height: 1067, alt: t.landing.heroAlt }],
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getI18n()
  return <I18nProvider locale={locale}>{children}</I18nProvider>
}
