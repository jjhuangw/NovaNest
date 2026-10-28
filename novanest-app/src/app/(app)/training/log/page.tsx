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
import { getFirstLogDate, getLoggedDays, getSetCounts, getWorkoutLog } from '@/lib/training/logs'
import { computeMuscleVolume } from '@/lib/training/muscles'
import { getGender } from '@/lib/user/profile'
import { DAY_KEYS, mockPlan } from '@/lib/training/plan'
import { planText } from '@/lib/training/plan-copy'
import { getI18n } from '@/lib/i18n/server'
import type { Messages } from '@/lib/i18n/messages'
import { saveWorkoutLogAction } from './actions'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import MuscleMap from './muscle-map'
import { RestButton, RestTimerProvider } from './rest-timer'

export const instant = false

export default async function TrainingLogPage(props: PageProps<'/training/log'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const today = todayISO()
  const date = isISODate(params.date) ? params.date : today
  const savedAt = typeof params.saved === 'string' ? params.saved : null

  const plan = mockPlan
  const day = plan.days.find((d) => d.day === dayKeyOf(date))!

  const week = { from: weekStart(date), to: addDays(weekStart(date), 6) }
  const monthRange = { from: monthStart(date), to: monthEnd(date) }
  const [logged, log, firstLogDate, weekSetCounts, gender, { locale, t }] = await Promise.all([
    getLoggedDays(session.userId, week.from < monthRange.from ? week.from : monthRange.from, week.to > monthRange.to ? week.to : monthRange.to),
    getWorkoutLog(session.userId, date),
    getFirstLogDate(session.userId),
    getSetCounts(session.userId, week.from, week.to),
    getGender(session.userId),
    getI18n(),
  ])
  const text = planText(locale)
  const month = Number(date.slice(5, 7))

  // 還沒有任何紀錄時，從今天開始算
  const trackingStart = firstLogDate ?? today
  const weekStats = computeCompletion(plan, week, trackingStart, today, logged)
  const monthStats = computeCompletion(plan, monthRange, trackingStart, today, logged)
  const dayStats = monthStats.days.find((d) => d.date === date)!
  const muscleVolumes = computeMuscleVolume(plan, weekStats.days, weekSetCounts)
  const completed = t.log.completed(dayStats.completedSets, dayStats.plannedSets)

  const setValue = (exerciseIndex: number, setNumber: number) =>
    log?.sets.find((s) => s.exerciseIndex === exerciseIndex && s.setNumber === setNumber)

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Training log</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{t.log.title}</h1>
          <p className="mt-4 text-base">{t.log.intro}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6">
            <Stat label={t.log.weekRate} value={formatRate(weekStats.rate)} />
            <Stat label={t.log.monthRate(month)} value={formatRate(monthStats.rate)} />
            <Stat label={t.log.monthDays(month)} value={`${monthStats.trainedDays} / ${monthStats.trainingDays}`} />
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="calendar-heading">
          <div className="flex items-center justify-between">
            <h2 id="calendar-heading" className="text-xl font-bold">
              {t.log.monthTitle(date.slice(0, 4), month)}
            </h2>
            <div className="flex gap-4 text-sm font-semibold">
              <Link href={`/training/log?date=${addMonths(date, -1)}`} className="underline-offset-4 hover:underline">
                {t.log.prevMonth}
              </Link>
              <Link href={`/training/log?date=${addMonths(date, 1)}`} className="underline-offset-4 hover:underline">
                {t.log.nextMonth}
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-1 text-center">
            {DAY_KEYS.map((k) => (
              <div key={k} className="pb-2 text-xs text-muted">
                {t.daysShort[k]}
              </div>
            ))}
            {Array.from({ length: DAY_KEYS.indexOf(dayKeyOf(monthRange.from)) }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {monthStats.days.map((d) => (
              <CalendarCell key={d.date} day={d} selected={d.date === date} isToday={d.date === today} t={t} />
            ))}
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <Legend className="bg-foreground" label={t.log.legendDone} />
            <Legend className="bg-stone" label={t.log.legendPartial} />
            <Legend className="border border-accent" label={t.log.legendMissed} />
            <Legend className="border border-line" label={t.log.legendOther} />
          </ul>

          <MuscleMap
            volumes={muscleVolumes}
            weekLabel={t.log.weekLabel(formatDate(week.from), formatDate(week.to))}
            gender={gender ?? 'male'}
            t={t}
          />
        </section>

        <section aria-labelledby="log-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="log-heading" className="text-2xl font-bold">
              {t.log.dayHeading(formatDate(date), t.days[day.day], text.day(day.day).title)}
            </h2>
            <nav className="flex gap-4 text-sm font-semibold" aria-label={t.log.switchDate}>
              <Link href={`/training/log?date=${addDays(date, -1)}`} className="underline-offset-4 hover:underline">
                {t.log.prevDay}
              </Link>
              {date !== today && (
                <Link href="/training/log" className="underline-offset-4 hover:underline">
                  {t.common.today}
                </Link>
              )}
              <Link href={`/training/log?date=${addDays(date, 1)}`} className="underline-offset-4 hover:underline">
                {t.log.nextDay}
              </Link>
            </nav>
          </div>

          {savedAt && (
            <SavedToast
              key={savedAt}
              savedAt={savedAt}
              message={t.log.savedToast(formatDate(date), dayStats.completedSets, dayStats.plannedSets, formatRate(dayStats.rate))}
            />
          )}

          {day.exercises.length === 0 ? (
            <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">{t.log.restDay}</p>
          ) : date > today ? (
            <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">{t.log.future}</p>
          ) : (
            <RestTimerProvider>
              {/* key：切換日期時重新掛載，讓 defaultValue 換成該日期的紀錄 */}
              <form key={date} action={saveWorkoutLogAction} className="mt-6 pb-28">
                <input type="hidden" name="date" value={date} />
                <p className="text-sm">
                  {completed.before}
                  <span className="font-bold tabular-nums">{completed.done}</span>
                  {completed.after}
                  <span className="font-bold">{formatRate(dayStats.rate)}</span>
                </p>

                <ol className="mt-6 space-y-8">
                  {day.exercises.map((e, i) => (
                    <li key={e.name}>
                      <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-2">
                        <h3 className="font-bold">
                          <span className="mr-3 text-sm text-muted">{String(i + 1).padStart(2, '0')}</span>
                          {text.exercise(e.name)}
                        </h3>
                        <span className="flex shrink-0 items-center gap-3">
                          <span className="text-sm text-muted">{t.training.volume(e.sets, e.reps, e.perSide)}</span>
                          <RestButton label={text.exercise(e.name)} seconds={e.restSeconds} />
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-[3.5rem_1fr_1fr] items-center gap-x-3 gap-y-2 text-sm">
                        <span />
                        <span className="text-xs text-muted">{t.log.weight}</span>
                        <span className="text-xs text-muted">{t.log.reps}</span>
                        {Array.from({ length: e.sets }, (_, s) => {
                          const n = s + 1
                          const prev = setValue(i, n)
                          return (
                            <SetRow key={n} exerciseIndex={i} setNumber={n} reps={e.reps} prev={prev} t={t} />
                          )
                        })}
                      </div>
                    </li>
                  ))}
                </ol>

                <label className="mt-8 block">
                  <span className="text-xs font-semibold uppercase tracking-wider">{t.log.notes}</span>
                  <textarea
                    name="notes"
                    rows={3}
                    defaultValue={log?.notes ?? ''}
                    placeholder={t.log.notesPlaceholder}
                    className="mt-2 w-full border border-line bg-surface px-4 py-3 text-sm focus:border-foreground focus:outline-none"
                  />
                </label>

                <SubmitButton />
              </form>
            </RestTimerProvider>
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
  t,
}: {
  t: Messages
  exerciseIndex: number
  setNumber: number
  reps: string
  prev?: { weightKg: number | null; reps: number }
}) {
  const inputClass =
    'w-full border border-line bg-surface px-3 py-2 text-sm tabular-nums placeholder-muted/60 focus:border-foreground focus:outline-none'
  return (
    <>
      <span className="text-muted">{t.log.setN(setNumber)}</span>
      <input
        name={`weight-${exerciseIndex}-${setNumber}`}
        type="number"
        inputMode="decimal"
        min={0}
        max={1000}
        step={0.25}
        defaultValue={prev?.weightKg ?? ''}
        aria-label={t.log.setWeight(setNumber)}
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
        aria-label={t.log.setReps(setNumber)}
        className={inputClass}
      />
    </>
  )
}

const cellStyles: Record<DayStatus, string> = {
  done: 'bg-foreground text-background',
  partial: 'bg-stone',
  missed: 'border border-accent text-accent',
  rest: 'border border-line text-muted',
  untracked: 'border border-line text-muted/60',
  future: 'border border-line text-muted/60',
}

function CalendarCell({ day, selected, isToday, t }: { day: DayCompletion; selected: boolean; isToday: boolean; t: Messages }) {
  return (
    <Link
      href={`/training/log?date=${day.date}`}
      aria-current={selected ? 'date' : undefined}
      className={`relative flex aspect-square flex-col items-center justify-center text-sm transition-opacity hover:opacity-80 ${
        cellStyles[day.status]
      } ${selected ? 'outline-2 outline-offset-2 outline-foreground' : ''}`}
    >
      <span className="font-semibold tabular-nums">{Number(day.date.slice(8))}</span>
      <span className="text-[10px] leading-tight">{day.status === 'rest' ? t.log.restShort : day.rate === null ? '' : formatRate(day.rate)}</span>
      {isToday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent" aria-label={t.common.today} />}
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
