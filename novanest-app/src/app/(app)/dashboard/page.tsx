import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { DAY_LABELS, mockPlan } from '@/lib/training/plan'
import { addDays, todayISO, todayKey, weekStart } from '@/lib/training/dates'
import { computeCompletion, formatRate } from '@/lib/training/completion'
import { getFirstLogDate, getLoggedDays } from '@/lib/training/logs'

export const instant = false

type Tile = { title: string; subtitle: string; image: string; alt: string; position?: string; href?: string; cta?: string }

const tiles: Tile[] = [
  { title: '今日營養', subtitle: '尚未記錄飲食', image: '/images/nutrition.jpg', alt: '一碗蔬菜沙拉' },
  { title: '體態紀錄', subtitle: '尚未上傳照片', image: '/images/body.jpg', alt: '伸展手臂的女性', position: 'object-[70%_center]' },
]

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const today = mockPlan.days.find((d) => d.day === todayKey())!
  const todayDate = todayISO()
  const week = { from: weekStart(todayDate), to: addDays(weekStart(todayDate), 6) }
  const [logged, firstLogDate] = await Promise.all([
    getLoggedDays(session.userId, week.from, week.to),
    getFirstLogDate(session.userId),
  ])
  const weekStats = computeCompletion(mockPlan, week, firstLogDate ?? todayDate, todayDate, logged)
  const trainingTile: Tile = {
    title: '今日訓練',
    subtitle:
      today.exercises.length > 0
        ? `${DAY_LABELS[today.day]}・${today.title}（${today.exercises.length} 個動作）`
        : `${DAY_LABELS[today.day]}・休息日`,
    image: '/images/training.jpg',
    alt: '在深蹲架前準備槓鈴的女性',
    href: '/training/log',
    cta: `本週達成率 ${formatRate(weekStats.rate)}・前往登記`,
  }

  return (
    <div>
      <section className="relative h-[60vh] min-h-[360px] w-full">
        <Image src="/images/hero.jpg" alt="在窗邊做仰臥起坐的女性" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-12 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Welcome back</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">歡迎回來，{session.username}</h1>
          <p className="mt-3 max-w-md text-base text-white/85">繼續你的健身旅程，今天也動起來。</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">從這裡開始</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[trainingTile, ...tiles].map((t) => {
            const body = (
              <>
                <div className="relative aspect-[4/3] sm:aspect-[4/5] overflow-hidden bg-stone">
                  <Image
                    src={t.image}
                    alt={t.alt}
                    fill
                    sizes="(min-width: 640px) 33vw, 100vw"
                    className={`object-cover ${t.position ?? ''} transition-transform duration-500 group-hover:scale-105`}
                  />
                </div>
                <h3 className="mt-4 text-lg font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted">{t.subtitle}</p>
                <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest underline underline-offset-4">
                  {t.cta ?? '即將推出'}
                </span>
              </>
            )
            return t.href ? (
              <Link key={t.title} href={t.href} className="group block">
                {body}
              </Link>
            ) : (
              <article key={t.title} className="group">
                {body}
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
