import Link from 'next/link'
import { DAY_KEYS, DAY_LABELS, formatVolume, isDayKey, mockPlan } from '@/lib/training/plan'
import { todayKey } from '@/lib/training/dates'

export const instant = false

export default async function TrainingPage(props: PageProps<'/training'>) {
  const { day } = await props.searchParams
  const today = todayKey()
  const selected = isDayKey(day) ? day : today
  const plan = mockPlan
  const current = plan.days.find((d) => d.day === selected)!
  const isRest = current.exercises.length === 0

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Training plan</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">
            {plan.title}
            <span className="mt-2 block text-xl font-semibold text-muted sm:text-2xl">
              {plan.currentWeightKg} kg → {plan.targetWeightKg} kg
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base">{plan.goal}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="目前體重" value={`${plan.currentWeightKg} kg`} />
            <Stat label="目標體重" value={`${plan.targetWeightKg} kg`} />
            <Stat label="訓練頻率" value={`每週 ${plan.daysPerWeek} 天`} />
            <Stat label="訓練時間" value={plan.sessionLength} />
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <nav aria-label="選擇星期">
          <ol className="grid grid-cols-7 border-b border-line sm:flex sm:gap-1">
            {DAY_KEYS.map((key) => {
              const d = plan.days.find((x) => x.day === key)!
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
                      {DAY_LABELS[key]}
                      {key === today && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-label="今天" />}
                    </span>
                    <span className="hidden text-xs sm:block">{d.title}</span>
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
                {DAY_LABELS[current.day]}・{current.title}
              </h2>
              {!isRest && (
                <Link
                  href="/training/log"
                  className="bg-foreground px-6 py-3 text-xs font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85"
                >
                  登記今天的訓練
                </Link>
              )}
            </div>
            {isRest ? (
              <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">休息日，好好恢復。</p>
            ) : (
              <ol className="mt-6 divide-y divide-line border-y border-line">
                {current.exercises.map((e, i) => (
                  <li key={e.name} className="flex items-baseline gap-4 py-4">
                    <span className="w-6 shrink-0 text-sm font-semibold text-muted">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 font-semibold">{e.name}</span>
                    <span className="text-sm tabular-nums">{formatVolume(e)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <aside className="border-l-2 border-accent pl-6">
            <h3 className="text-xs font-semibold uppercase tracking-widest">{isRest ? '今日安排' : '訓練重點'}</h3>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed">
              {current.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="text-2xl font-bold">訓練原則</h2>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {plan.guidelines.map((g) => (
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
            <h3 className="text-xs font-semibold uppercase tracking-widest">每週追蹤項目</h3>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {plan.weeklyTracking.map((t) => (
                <li key={t}>・{t}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted">每 4–6 週檢查一次力量、體重與腰圍變化，再決定是否需要調整訓練量。</p>
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
