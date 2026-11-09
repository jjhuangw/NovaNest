import Link from 'next/link'
import { connection } from 'next/server'
import { loadForUser } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { formatDate, todayISO, weekStart } from '@/lib/training/dates'
import { planText } from '@/lib/training/plan-copy'
import { getActivePlan } from '@/lib/training/plan-store'
import { getTrainingTrends, TREND_WEEKS } from '@/lib/training/trends'
import { ColumnChart, LineChart } from './trend-charts'

export const instant = false

export default async function TrendsPage(props: PageProps<'/training/trends'>) {
  const params = await props.searchParams
  // 「今天」必須依每次請求計算，不能在預先渲染時決定
  await connection()
  const today = todayISO()
  const weeks = TREND_WEEKS.find((w) => String(w) === params.weeks) ?? 12

  const {
    data: [trends, active, { locale, t }],
  } = await loadForUser((userId) => Promise.all([getTrainingTrends(userId, weeks, today), getActivePlan(userId), getI18n()]))
  const tt = t.trends
  const text = planText(locale, active.plan, active.translation)
  const thisWeek = weekStart(today)

  const requested = typeof params.exercise === 'string' ? params.exercise : null
  const exercise = trends.exercises.find((e) => e.name === requested) ?? trends.exercises[0] ?? null
  const hasLogs = trends.weeks.some((w) => w.volumeKg > 0 || w.completedSets > 0)
  const href = (next: { weeks?: number; exercise?: string }) => {
    const sp = new URLSearchParams()
    sp.set('weeks', String(next.weeks ?? weeks))
    const ex = next.exercise ?? exercise?.name
    if (ex) sp.set('exercise', ex)
    return `/training/trends?${sp}`
  }
  const chip = (on: boolean) => `border px-3 py-1.5 text-sm ${on ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Trends</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{tt.title}</h1>
          <p className="mt-4 max-w-2xl text-base">{tt.intro}</p>
          <Link href="/training/log" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
            ← {tt.backToLog}
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* 篩選：一列、在所有圖表上方，範圍套用到全部圖表 */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={tt.rangeLabel}>
          {TREND_WEEKS.map((w) => (
            <Link key={w} href={href({ weeks: w })} aria-current={w === weeks ? 'page' : undefined} className={chip(w === weeks)}>
              {tt.weeks(w)}
            </Link>
          ))}
        </div>

        {!hasLogs ? (
          <p className="mt-8 bg-stone px-6 py-10 text-center text-muted">{tt.empty}</p>
        ) : (
          <div className="mt-8 grid gap-12">
            <section>
              <h2 className="text-xl font-bold">{tt.volumeTitle}</h2>
              <p className="mt-1 text-sm text-muted">{tt.volumeHint}</p>
              <div className="mt-4">
                <ColumnChart
                  title={tt.volumeTitle}
                  unit="kg"
                  tableCaption={tt.viewData}
                  columns={[tt.week, tt.volumeTitle]}
                  points={trends.weeks.map((w) => ({
                    key: w.week,
                    label: formatDate(w.week),
                    value: w.volumeKg,
                    note: w.week === thisWeek ? tt.thisWeek : undefined,
                  }))}
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">{tt.completionTitle}</h2>
              <p className="mt-1 text-sm text-muted">{tt.completionHint}</p>
              <div className="mt-4">
                <LineChart
                  title={tt.completionTitle}
                  xLabels={trends.weeks.map((w) => formatDate(w.week))}
                  series={[
                    {
                      key: 'rate',
                      label: tt.completionTitle,
                      color: 'var(--chart-1)',
                      values: trends.weeks.map((w) => (w.rate === null ? null : Math.round(w.rate * 100))),
                    },
                  ]}
                  unit="%"
                  yMax={100}
                  tableCaption={tt.viewData}
                  xColumn={tt.week}
                />
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold">{tt.exerciseTitle}</h2>
              <p className="mt-1 text-sm text-muted">{tt.exerciseHint}</p>
              {exercise ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={tt.exerciseLabel}>
                    {trends.exercises.map((e) => (
                      <Link key={e.name} href={href({ exercise: e.name })} aria-current={e.name === exercise.name ? 'true' : undefined} className={chip(e.name === exercise.name)}>
                        {text.exercise(e.name)}
                        <span className="ml-1.5 text-xs opacity-70 tabular-nums">{e.sessions.length}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-6">
                    {exercise.sessions.length < 2 && <p className="mb-3 text-sm text-muted">{tt.fewSessions}</p>}
                    <LineChart
                      title={`${tt.exerciseTitle}：${text.exercise(exercise.name)}`}
                      xLabels={exercise.sessions.map((s) => formatDate(s.date))}
                      series={[
                        { key: 'best', label: tt.bestWeight, color: 'var(--chart-1)', values: exercise.sessions.map((s) => s.bestWeightKg) },
                        { key: 'e1rm', label: tt.estimated1RM, color: 'var(--chart-2)', values: exercise.sessions.map((s) => s.estimated1RM) },
                      ]}
                      unit="kg"
                      tableCaption={tt.viewData}
                      xColumn={tt.date}
                    />
                    <p className="mt-2 text-xs text-muted">{tt.oneRmNote}</p>
                  </div>
                </>
              ) : (
                <p className="mt-4 bg-stone px-6 py-8 text-center text-sm text-muted">{tt.emptyExercise}</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
