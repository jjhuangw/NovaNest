import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getI18n } from '@/lib/i18n/server'
import { CONTACT_EMAIL, SiteFooter, SiteHeader } from '../site-chrome'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: t.story.metaTitle,
    description: t.story.intro,
    openGraph: { title: t.story.metaTitle, description: t.story.intro },
  }
}

// 品牌故事：名稱由來、理念與聯絡方式。不讀取登入狀態，任何人都能看
export default async function StoryPage() {
  const { t } = await getI18n()
  const ts = t.story
  const primary =
    'inline-flex min-h-12 items-center justify-center bg-accent px-8 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90'

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader t={t} sectionBase="/about" />

      <main>
        {/* 開場 */}
        <section className="mx-auto max-w-6xl px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{ts.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-black leading-tight sm:text-6xl">{ts.title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{ts.intro}</p>
        </section>

        {/* 名字的由來 */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
            <h2 className="text-3xl font-bold sm:text-5xl">{ts.nameTitle}</h2>
            <dl className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2">
              {ts.names.map((n) => (
                <div key={n.word} className="bg-background p-8 sm:p-10">
                  <dt>
                    <span className="text-4xl font-black uppercase tracking-[0.15em] sm:text-5xl">{n.word}</span>
                    <span className="ml-3 text-sm font-semibold text-accent">{n.meaning}</span>
                  </dt>
                  <dd className="mt-4 text-sm leading-relaxed text-muted sm:text-base">{n.body}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-10 max-w-2xl text-lg font-semibold sm:text-xl">{ts.together}</p>
          </div>
        </section>

        {/* Logo 的紅點 */}
        <section className="bg-foreground text-background">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 sm:py-28 md:grid-cols-[auto_1fr] md:gap-16">
            <p className="inline-flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-accent sm:h-8 sm:w-8" />
              <span className="text-2xl font-black uppercase tracking-[0.25em] sm:text-4xl">NovaNest</span>
            </p>
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">{ts.dotTitle}</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed opacity-80 sm:text-base">{ts.dotBody}</p>
            </div>
          </div>
        </section>

        {/* 我們相信 */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <h2 className="text-3xl font-bold sm:text-5xl">{ts.beliefsTitle}</h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-3">
            {ts.beliefs.map((b, i) => (
              <li key={b.title}>
                <span className="text-sm font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 text-xl font-bold">{b.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{b.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 為誰而做 */}
        <section className="bg-stone">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold sm:text-5xl">{ts.forTitle}</h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{ts.forBody}</p>
              <Link href="/register" className={`${primary} mt-8`}>
                {ts.cta}
              </Link>
            </div>
            <div className="relative aspect-[4/3]">
              <Image src="/images/training.jpg" alt={ts.imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        </section>

        {/* 聯絡我們 */}
        <section className="border-b border-line">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="text-2xl font-bold">{ts.contactTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{ts.contactBody}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="mt-6 inline-block text-lg font-semibold underline underline-offset-4 hover:text-accent">
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>
      </main>

      <SiteFooter t={t} />
    </div>
  )
}
