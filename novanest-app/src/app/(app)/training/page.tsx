import Link from 'next/link'
import { connection } from 'next/server'
import { DAY_KEYS, formatDuration, isDayKey, mockPlan } from '@/lib/training/plan'
import { planText } from '@/lib/training/plan-copy'
import { getI18n } from '@/lib/i18n/server'
import { todayKey } from '@/lib/training/dates'

export const instant = false

export default async function TrainingPage(props: PageProps<'/training'>) {
  const { day } = await props.searchParams
  // 「今天」必須依每次請求計算，不能在預先渲染時決定
  await connection()
  const today = todayKey()
  const selected = isDayKey(day) ? day : today
  const plan = mockPlan
  const { locale, t } = await getI18n()
  const text = planText(locale)
  const current = plan.days.find((d) => d.day === selected)!
  const isRest = current.exercises.length === 0

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Training plan</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
            {text.title}
            <span className="mt-2 block text-xl font-semibold text-muted sm:text-2xl">
              {plan.currentWeightKg} kg → {plan.targetWeightKg} kg
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base">{text.goal}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label={t.training.currentWeight} value={`${plan.currentWeightKg} kg`} />
            <Stat label={t.training.targetWeight} value={`${plan.targetWeightKg} kg`} />
            <Stat label={t.training.frequency} value={t.training.perWeek(plan.daysPerWeek)} />
            <Stat label={t.training.duration} value={text.sessionLength} />
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <nav aria-label={t.training.chooseDay}>
          <ol className="grid grid-cols-7 border-b border-line sm:flex sm:gap-1">
            {DAY_KEYS.map((key) => {
              const active = key === selected
              return (
                <li key={key}>
                  <Link
                    href={`/training?day=${key}`}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className={`-mb-px block border-b-2 px-1 pb-3 pt-1 text-center transition-colors sm:px-4 sm:text-left ${
                      active ? 'border-foreground' : 'border-transparent text-muted hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1 text-sm font-bold sm:justify-start sm:gap-1.5">
                      {t.days[key]}
                      {key === today && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label={t.common.today} />}
                    </span>
                    <span className="hidden text-xs sm:block">{text.day(key).title}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="mt-10 grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">
                {t.days[current.day]}・{text.day(current.day).title}
              </h2>
              {!isRest && (
                <Link
                  href="/training/log"
                  className="bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85"
                >
                  {t.training.logToday}
                </Link>
              )}
            </div>
            {isRest ? (
              <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">{t.training.restDay}</p>
            ) : (
              <ol className="mt-6 divide-y divide-line border-y border-line">
                {current.exercises.map((e, i) => (
                  <li key={e.name} className="flex items-baseline gap-4 py-4">
                    <span className="w-6 shrink-0 text-sm font-semibold text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 font-semibold">{text.exercise(e.name)}</span>
                    <span className="text-right text-sm tabular-nums">
                      {t.training.volume(e.sets, e.reps, e.perSide)}
                      <span className="block text-xs text-muted">{t.training.restFor(formatDuration(e.restSeconds))}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="border-l-2 border-accent pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest">{isRest ? t.training.todayPlan : t.training.focus}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed">
              {text.day(current.day).notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-bold">{t.training.principles}</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {text.guidelines.map((g) => (
              <div key={g.title}>
                <h3 className="text-xs font-semibold uppercase tracking-widest">{g.title}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-line">
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-stone p-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest">{t.training.weeklyTracking}</h3>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {text.weeklyTracking.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">{t.training.weeklyTrackingNote}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  )
}
