import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { mockPlan } from '@/lib/training/plan'
import { planText } from '@/lib/training/plan-copy'
import { getI18n } from '@/lib/i18n/server'
import { addDays, formatDate, todayISO, todayKey, weekStart } from '@/lib/training/dates'
import { computeCompletion, formatRate } from '@/lib/training/completion'
import { getFirstLogDate, getLoggedDays } from '@/lib/training/logs'
import { countPhotos } from '@/lib/photos/photos'

export const instant = false

type Tile = { title: string; subtitle: string; image: string; alt: string; position?: string; href?: string; cta?: string }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = mockPlan.days.find((d) => d.day === todayKey())!
  const todayDate = todayISO()
  const week = { from: weekStart(todayDate), to: addDays(weekStart(todayDate), 6) }
  const [logged, firstLogDate, photoStats, { locale, t }] = await Promise.all([
    getLoggedDays(session.userId, week.from, week.to),
    getFirstLogDate(session.userId),
    countPhotos(session.userId),
    getI18n(),
  ])
  const text = planText(locale)
  const nutritionTile: Tile = {
    title: t.dashboard.nutritionTitle,
    subtitle: t.dashboard.nutritionSubtitle,
    image: '/images/nutrition.jpg',
    alt: t.dashboard.nutritionAlt,
  }
  const photoTile: Tile = {
    title: t.dashboard.photosTitle,
    subtitle: photoStats.latest ? t.dashboard.photosSubtitle(photoStats.count, formatDate(photoStats.latest)) : t.dashboard.photosEmpty,
    image: '/images/body.jpg',
    alt: t.dashboard.photosAlt,
    position: 'object-[70%_center]',
    href: '/progress',
    cta: photoStats.count > 0 ? t.dashboard.photosCta : t.dashboard.photosCtaFirst,
  }
  const weekStats = computeCompletion(mockPlan, week, firstLogDate ?? todayDate, todayDate, logged)
  const trainingTile: Tile = {
    title: t.dashboard.trainingTitle,
    subtitle:
      today.exercises.length > 0
        ? t.dashboard.trainingSubtitle(t.days[today.day], text.day(today.day).title, today.exercises.length)
        : t.dashboard.restSubtitle(t.days[today.day]),
    image: '/images/training.jpg',
    alt: t.dashboard.trainingAlt,
    href: '/training/log',
    cta: t.dashboard.trainingCta(formatRate(weekStats.rate)),
  }

  return (
    <div>
      <section className="relative h-[60vh] min-h-[360px] w-full">
        <Image src="/images/hero.jpg" alt={t.dashboard.heroAlt} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-12 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Welcome back</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">{t.dashboard.welcome(session.username)}</h1>
          <p className="mt-3 max-w-md text-base text-white/85">{t.dashboard.welcomeSub}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">{t.dashboard.start}</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[trainingTile, nutritionTile, photoTile].map((tile) => {
            const body = (
              <>
                <div className="relative aspect-[4/3] sm:aspect-[4/5] overflow-hidden bg-stone">
                  <Image
                    src={tile.image}
                    alt={tile.alt}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className={`object-cover ${tile.position ?? ''} transition-transform duration-500 group-hover:scale-105`}
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold">{tile.title}</h3>
                <p className="mt-1 text-sm text-muted">{tile.subtitle}</p>
                <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest underline underline-offset-4">
                  {tile.cta ?? t.dashboard.comingSoon}
                </span>
              </>
            )
            return tile.href ? (
              <Link key={tile.title} href={tile.href} className="group block">
                {body}
              </Link>
            ) : (
              <article key={tile.title} className="group">
                {body}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
