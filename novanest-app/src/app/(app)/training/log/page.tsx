import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { computeCompletion, formatRate, type DayCompletion, type DayStatus } from '@/lib/training/completion'
import {
  addDays,
  addMonths,
  dayKeyOf,
  formatDate,
  isISODate,
  monthEnd,
  monthStart,
  todayISO,
  weekStart,
} from '@/lib/training/dates'
import { getFirstLogDate, getLoggedDays, getWorkoutLog } from '@/lib/training/logs'
import { DAY_KEYS, DAY_LABELS, formatVolume, mockPlan } from '@/lib/training/plan'
import { saveWorkoutLogAction } from './actions'

export const instant = false

export default async function TrainingLogPage(props: PageProps<'/training/log'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const today = todayISO()
  const date = isISODate(params.date) ? params.date : today
  const saved = params.saved === '1'

  const plan = mockPlan
  const day = plan.days.find((d) => d.day === dayKeyOf(date))!

  const week = { from: weekStart(date), to: addDays(weekStart(date), 6) }
  const month = { from: monthStart(date), to: monthEnd(date) }
  const [logged, log, firstLogDate] = await Promise.all([
    getLoggedDays(session.userId, week.from < month.from ? week.from : month.from, week.to > month.to ? week.to : month.to),
    getWorkoutLog(session.userId, date),
    getFirstLogDate(session.userId),
  ])

  // 還沒有任何紀錄時，從今天開始算
  const trackingStart = firstLogDate ?? today
  const weekStats = computeCompletion(plan, week, trackingStart, today, logged)
  const monthStats = computeCompletion(plan, month, trackingStart, today, logged)
  const dayStats = monthStats.days.find((d) => d.date === date)!

  const setValue = (exerciseIndex: number, setNumber: number) =>
    log?.sets.find((s) => s.exerciseIndex === exerciseIndex && s.setNumber === setNumber)

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Training log</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">訓練紀錄</h1>
          <p className="mt-4 text-base">依照日期登記每組的重量與次數，填了次數的組即算完成。</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6">
            <Stat label="本週達成率" value={formatRate(weekStats.rate)} />
            <Stat label={`${Number(date.slice(5, 7))} 月達成率`} value={formatRate(monthStats.rate)} />
            <Stat label={`${Number(date.slice(5, 7))} 月訓練天數`} value={`${monthStats.trainedDays} / ${monthStats.trainingDays}`} />
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="calendar-heading">
          <div className="flex items-center justify-between">
            <h2 id="calendar-heading" className="text-xl font-bold">
              {date.slice(0, 4)} 年 {Number(date.slice(5, 7))} 月
            </h2>
            <div className="flex gap-4 text-sm font-semibold">
              <Link href={`/training/log?date=${addMonths(date, -1)}`} className="underline-offset-4 hover:underline">
                ← 上個月
              </Link>
              <Link href={`/training/log?date=${addMonths(date, 1)}`} className="underline-offset-4 hover:underline">
                下個月 →
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1 text-center">
            {DAY_KEYS.map((k) => (
              <div key={k} className="pb-2 text-xs text-muted">
                {DAY_LABELS[k].slice(1)}
              </div>
            ))}
            {Array.from({ length: DAY_KEYS.indexOf(dayKeyOf(month.from)) }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {monthStats.days.map((d) => (
              <CalendarCell key={d.date} day={d} selected={d.date === date} isToday={d.date === today} />
            ))}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <Legend className="bg-foreground" label="完成" />
            <Legend className="bg-stone" label="部分完成" />
            <Legend className="border border-accent" label="未訓練" />
            <Legend className="border border-line" label="休息／未開始／未來" />
          </ul>
        </section>

        <section aria-labelledby="log-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="log-heading" className="text-2xl font-bold">
              {formatDate(date)}（{DAY_LABELS[day.day]}）・{day.title}
            </h2>
            <nav className="flex gap-4 text-sm font-semibold" aria-label="切換日期">
              <Link href={`/training/log?date=${addDays(date, -1)}`} className="underline-offset-4 hover:underline">
                ← 前一天
              </Link>
              {date !== today && (
                <Link href="/training/log" className="underline-offset-4 hover:underline">
                  今天
                </Link>
              )}
              <Link href={`/training/log?date=${addDays(date, 1)}`} className="underline-offset-4 hover:underline">
                後一天 →
              </Link>
            </nav>
          </div>

          {saved && (
            <p role="status" className="mt-6 border-l-2 border-foreground bg-stone px-4 py-3 text-sm font-semibold">
              已儲存 {formatDate(date)} 的訓練紀錄。
            </p>
          )}

          {day.exercises.length === 0 ? (
            <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">休息日，不需要登記訓練。</p>
          ) : date > today ? (
            <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">還不能登記未來的訓練。</p>
          ) : (
            <form action={saveWorkoutLogAction} className="mt-6">
              <input type="hidden" name="date" value={date} />
              <p className="text-sm">
                已完成 <span className="font-bold tabular-nums">{dayStats.completedSets}</span> / {dayStats.plannedSets} 組・
                <span className="font-bold">{formatRate(dayStats.rate)}</span>
              </p>

              <ol className="mt-6 space-y-8">
                {day.exercises.map((e, i) => (
                  <li key={e.name}>
                    <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-2">
                      <h3 className="font-bold">
                        <span className="mr-3 text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                        {e.name}
                      </h3>
                      <span className="shrink-0 text-sm text-muted">{formatVolume(e)}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[3.5rem_1fr_1fr] items-center gap-x-3 gap-y-2 text-sm">
                      <span />
                      <span className="text-xs text-muted">重量（kg）</span>
                      <span className="text-xs text-muted">次數</span>
                      {Array.from({ length: e.sets }, (_, s) => {
                        const n = s + 1
                        const prev = setValue(i, n)
                        return (
                          <SetRow key={n} exerciseIndex={i} setNumber={n} reps={e.reps} prev={prev} />
                        )
                      })}
                    </div>
                  </li>
                ))}
              </ol>

              <label className="mt-8 block">
                <span className="text-xs font-semibold uppercase tracking-wider">備註</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={log?.notes ?? ''}
                  placeholder="今天的狀態、睡眠、哪裡不舒服…"
                  className="mt-2 w-full border border-line bg-white px-4 py-3 text-sm focus:border-foreground focus:outline-none"
                />
              </label>

              <button
                type="submit"
                className="mt-6 w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85 sm:w-auto sm:px-12"
              >
                儲存紀錄
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}

function SetRow({
  exerciseIndex,
  setNumber,
  reps,
  prev,
}: {
  exerciseIndex: number
  setNumber: number
  reps: string
  prev?: { weightKg: number | null; reps: number }
}) {
  const inputClass =
    'w-full border border-line bg-white px-3 py-2 text-sm tabular-nums placeholder-muted/60 focus:border-foreground focus:outline-none'
  return (
    <>
      <span className="text-muted">第 {setNumber} 組</span>
      <input
        name={`weight-${exerciseIndex}-${setNumber}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={1000}
        step={0.25}
        defaultValue={prev?.weightKg ?? ''}
        aria-label={`第 ${setNumber} 組重量`}
        className={inputClass}
      />
      <input
        name={`reps-${exerciseIndex}-${setNumber}`}
        type="number"
        inputMode="numeric"
        min={0}
        max={1000}
        step={1}
        defaultValue={prev?.reps ?? ''}
        placeholder={reps}
        aria-label={`第 ${setNumber} 組次數`}
        className={inputClass}
      />
    </>
  )
}

const cellStyles: Record<DayStatus, string> = {
  done: 'bg-foreground text-white',
  partial: 'bg-stone',
  missed: 'border border-accent text-accent',
  rest: 'border border-line text-muted',
  untracked: 'border border-line text-muted/60',
  future: 'border border-line text-muted/60',
}

function CalendarCell({ day, selected, isToday }: { day: DayCompletion; selected: boolean; isToday: boolean }) {
  return (
    <Link
      href={`/training/log?date=${day.date}`}
      aria-current={selected ? 'date' : undefined}
      className={`relative flex aspect-square flex-col items-center justify-center text-sm transition-opacity hover:opacity-80 ${
        cellStyles[day.status]
      } ${selected ? 'outline-2 outline-offset-2 outline-foreground' : ''}`}
    >
      <span className="font-semibold tabular-nums">{Number(day.date.slice(8))}</span>
      <span className="text-[10px] leading-tight">{day.status === 'rest' ? '休' : day.rate === null ? '' : formatRate(day.rate)}</span>
      {isToday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" aria-label="今天" />}
    </Link>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`h-3 w-3 ${className}`} />
      {label}
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
