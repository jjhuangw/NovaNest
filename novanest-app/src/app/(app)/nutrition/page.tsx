import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import type { Messages } from '@/lib/i18n/messages'
import { dailyTotals, listEntries, type EntryView } from '@/lib/nutrition/entries'
import { formatAmount, mealForHour, MEALS, sumNutrients, UNITS, type Nutrients } from '@/lib/nutrition/nutrients'
import {
  ACTIVITY_FACTOR,
  bodyProfileFrom,
  dayGoalMet,
  dayTargets,
  progressFor,
  type DayTargets,
  type NutrientProgress,
} from '@/lib/nutrition/targets'
import { addDays, dayKeyOf, formatDate, hourOf, isISODate, todayISO, weekStart } from '@/lib/training/dates'
import { mockPlan } from '@/lib/training/plan'
import { planText } from '@/lib/training/plan-copy'
import { getBodyData } from '@/lib/user/profile'
import AddFoodForm from './add-food-form'
import DeleteButton from './delete-button'

export const instant = false

export default async function NutritionPage(props: PageProps<'/nutrition'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const today = todayISO()
  const date = isISODate(params.date) ? params.date : today
  const week = { from: weekStart(date), to: addDays(weekStart(date), 6) }

  const plan = mockPlan
  const [entries, weekTotals, body, { locale, t }] = await Promise.all([
    listEntries(session.userId, date),
    dailyTotals(session.userId, week.from, week.to),
    getBodyData(session.userId),
    getI18n(),
  ])
  const tn = t.nutrition
  const text = planText(locale)

  const profile = bodyProfileFrom(body, plan, today)
  const dayKey = dayKeyOf(date)
  const targets = dayTargets(plan, dayKey, profile)
  const totals = sumNutrients(entries)
  const progress = progressFor(totals, targets)
  const goalMet = entries.length > 0 && dayGoalMet(totals, targets)

  // 本週：只計算今天以前（含）有紀錄的日子
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(week.from, i)
    const dayTotals = weekTotals.get(d) ?? null
    const target = dayTargets(plan, dayKeyOf(d), profile)
    return { date: d, totals: dayTotals, target, met: dayTotals !== null && dayGoalMet(dayTotals, target) }
  })
  const weekLogged = weekDays.filter((d) => d.totals !== null && d.date <= today)
  const weekMet = weekLogged.filter((d) => d.met).length

  const profileIncomplete = body.weightKg === null || body.heightCm === null || body.birthYear === null
  const kcalProgress = progress.find((p) => p.key === 'kcal')!
  const proteinProgress = progress.find((p) => p.key === 'proteinG')!

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Nutrition</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{tn.title}</h1>
          <p className="mt-4 text-base">{tn.intro}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6">
            <Stat label={tn.statKcal} value={`${formatAmount(totals.kcal, 'kcal')}`} sub={`/ ${formatAmount(targets.kcal, 'kcal')} kcal`} status={kcalProgress.status} />
            <Stat
              label={tn.statProtein}
              value={`${formatAmount(totals.proteinG, 'proteinG')}`}
              sub={`/ ${targets.proteinG} g`}
              status={proteinProgress.status}
            />
            <Stat label={tn.statWeek} value={tn.weekDays(weekMet, weekLogged.length)} />
          </dl>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="targets-heading">
          <h2 id="targets-heading" className="text-xl font-bold">
            {tn.targetsTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {targets.isTrainingDay ? tn.trainingDay(text.day(dayKey).title) : tn.restDay}
          </p>

          <ul className="mt-6 space-y-5">
            {progress.map((p) => (
              <ProgressRow key={p.key} progress={p} t={t} />
            ))}
          </ul>

          {entries.length > 0 && (
            <p className={`mt-6 border-l-2 px-3 py-2 text-sm ${goalMet ? 'border-foreground bg-stone font-semibold' : 'border-line text-muted'}`}>
              {goalMet ? `✓ ${tn.goalMet}` : tn.goalNotMet}
            </p>
          )}

          <details className="mt-6 text-sm">
            <summary className="cursor-pointer font-semibold">{tn.howTitle}</summary>
            <HowTargets targets={targets} plan={plan.nutrition} weightKg={profile.weightKg} t={t} />
            <p className="mt-3 text-muted">
              {body.weighedOn ? tn.weightSource.log(body.weighedOn.replaceAll('-', '/')) : tn.weightSource.plan}
            </p>
          </details>

          {profileIncomplete && (
            <p className="mt-4 bg-stone px-4 py-3 text-sm">
              {tn.profileMissing}{' '}
              <Link href="/settings" className="font-semibold underline underline-offset-4">
                {tn.profileLink}
              </Link>
            </p>
          )}

          <h2 className="mt-10 text-xl font-bold">{tn.weekTitle}</h2>
          <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((d) => (
              <WeekCell key={d.date} day={d} selected={d.date === date} isFuture={d.date > today} t={t} />
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">{tn.weekLegend}</p>
        </section>

        <section aria-labelledby="food-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="food-heading" className="text-2xl font-bold">
              {tn.dayHeading(formatDate(date), t.days[dayKey])}
            </h2>
            <nav className="flex gap-4 text-sm font-semibold" aria-label={tn.switchDate}>
              <Link href={`/nutrition?date=${addDays(date, -1)}`} className="underline-offset-4 hover:underline">
                {tn.prevDay}
              </Link>
              {date !== today && (
                <Link href="/nutrition" className="underline-offset-4 hover:underline">
                  {t.common.today}
                </Link>
              )}
              {date < today && (
                <Link href={`/nutrition?date=${addDays(date, 1)}`} className="underline-offset-4 hover:underline">
                  {tn.nextDay}
                </Link>
              )}
            </nav>
          </div>

          {date > today ? (
            <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">{tn.future}</p>
          ) : (
            <>
              <div className="mt-6 border border-line p-4 sm:p-6">
                <h3 className="mb-4 font-bold">{tn.addTitle}</h3>
                {/* key：切換日期時重設表單 */}
                <AddFoodForm key={date} date={date} defaultMeal={mealForHour(hourOf(new Date()))} />
              </div>

              <div className="mt-10">
                {entries.length === 0 ? (
                  <p className="bg-stone px-6 py-10 text-center text-muted">{tn.empty}</p>
                ) : (
                  <div className="space-y-8">
                    {MEALS.map((meal) => {
                      const list = entries.filter((e) => e.meal === meal)
                      if (list.length === 0) return null
                      const mealTotal = sumNutrients(list)
                      return (
                        <div key={meal}>
                          <div className="flex items-baseline justify-between gap-4 border-b border-foreground pb-2">
                            <h3 className="font-bold">{tn.meals[meal]}</h3>
                            <span className="text-sm tabular-nums text-muted">
                              {formatAmount(mealTotal.kcal, 'kcal')} kcal
                            </span>
                          </div>
                          <ul className="divide-y divide-line">
                            {list.map((e) => (
                              <EntryRow key={e.id} entry={e} t={t} />
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

const statusText: Record<NutrientProgress['status'], string> = {
  met: 'text-foreground',
  under: 'text-muted',
  over: 'text-accent',
  empty: 'text-muted',
}

const barColor: Record<NutrientProgress['status'], string> = {
  met: 'bg-foreground',
  under: 'bg-foreground/40',
  over: 'bg-accent',
  empty: 'bg-transparent',
}

function ProgressRow({ progress: p, t }: { progress: NutrientProgress; t: Messages }) {
  const tn = t.nutrition
  const unit = UNITS[p.key]
  const value = p.value ?? 0
  const diff = Math.abs(p.target - value)
  const detail =
    p.status === 'empty'
      ? tn.status.empty
      : p.kind === 'max'
        ? p.status === 'over'
          ? tn.exceeded(formatAmount(diff, p.key), unit)
          : tn.status.met
        : p.status === 'under'
          ? tn.remaining(formatAmount(diff, p.key), unit)
          : p.status === 'over'
            ? tn.exceeded(formatAmount(diff, p.key), unit)
            : tn.status.met
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{tn.nutrients[p.key]}</span>
        <span className="tabular-nums">
          <span className="font-bold">{p.value === null ? '—' : formatAmount(p.value, p.key)}</span>
          <span className="text-muted"> / {formatAmount(p.target, p.key)} {unit}</span>
        </span>
      </div>
      <div
        className="relative mt-1.5 h-2 bg-stone"
        role="meter"
        aria-label={tn.nutrients[p.key]}
        aria-valuemin={0}
        aria-valuemax={p.target}
        aria-valuenow={value}
        aria-valuetext={`${formatAmount(value, p.key)} / ${formatAmount(p.target, p.key)} ${unit}・${detail}`}
      >
        <div className={`h-full ${barColor[p.status]}`} style={{ width: `${Math.min(p.ratio, 1) * 100}%` }} />
      </div>
      <div className="mt-1 flex justify-between gap-3 text-xs">
        <span className="text-muted">{tn.targetLabel[p.kind](formatAmount(p.target, p.key), unit)}</span>
        <span className={statusText[p.status]}>{detail}</span>
      </div>
    </li>
  )
}

function HowTargets({
  targets,
  plan,
  weightKg,
  t,
}: {
  targets: DayTargets
  plan: { calorieAdjustment: number; proteinPerKg: number; fatPerKg: number }
  weightKg: number
  t: Messages
}) {
  const how = t.nutrition.how
  const factor = targets.isTrainingDay ? ACTIVITY_FACTOR.training : ACTIVITY_FACTOR.rest
  return (
    <ul className="mt-3 list-disc space-y-1 pl-5">
      <li>{how.bmr(formatAmount(targets.bmr, 'kcal'), targets.bmrEstimated)}</li>
      <li>{how.maintenance(formatAmount(targets.maintenance, 'kcal'), factor, targets.isTrainingDay)}</li>
      <li>{how.adjust(plan.calorieAdjustment)}</li>
      <li>{how.protein(plan.proteinPerKg, String(weightKg))}</li>
      <li>{how.fat(plan.fatPerKg)}</li>
      <li>{how.carbs}</li>
      <li>{how.limits(targets.fiberG, formatAmount(targets.sodiumMg, 'sodiumMg'))}</li>
    </ul>
  )
}

function WeekCell({
  day,
  selected,
  isFuture,
  t,
}: {
  day: { date: string; totals: Nutrients | null; target: DayTargets; met: boolean }
  selected: boolean
  isFuture: boolean
  t: Messages
}) {
  const ratio = day.totals ? Math.round((day.totals.kcal / day.target.kcal) * 100) : null
  const style = day.met ? 'bg-foreground text-background' : day.totals ? 'bg-stone' : 'border border-line text-muted'
  const body = (
    <>
      <span className="text-[10px] leading-tight">{t.daysShort[dayKeyOf(day.date)]}</span>
      <span className="font-semibold tabular-nums">{Number(day.date.slice(8))}</span>
      <span className="text-[10px] leading-tight tabular-nums">{ratio === null ? '' : `${ratio}%`}</span>
    </>
  )
  const className = `flex aspect-[3/4] flex-col items-center justify-center text-sm ${style} ${
    selected ? 'outline-2 outline-offset-2 outline-foreground' : ''
  }`
  return (
    <li>
      {isFuture ? (
        <span className={`${className} opacity-50`}>{body}</span>
      ) : (
        <Link href={`/nutrition?date=${day.date}`} aria-current={selected ? 'date' : undefined} className={`${className} hover:opacity-80`}>
          {body}
        </Link>
      )}
    </li>
  )
}

function EntryRow({ entry: e, t }: { entry: EntryView; t: Messages }) {
  const tn = t.nutrition
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">
          {e.name}
          {e.source !== 'manual' && (
            <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider text-muted">{tn.sources[e.source]}</span>
          )}
        </p>
        {e.amount && <p className="text-xs text-muted">{e.amount}</p>}
        <p className="mt-1 text-xs tabular-nums text-muted">
          {tn.nutrientsShort.proteinG} {formatAmount(e.proteinG, 'proteinG')} g・{tn.nutrientsShort.carbsG}{' '}
          {formatAmount(e.carbsG, 'carbsG')} g・{tn.nutrientsShort.fatG} {formatAmount(e.fatG, 'fatG')} g
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-bold tabular-nums">{formatAmount(e.kcal, 'kcal')} kcal</span>
        <DeleteButton id={e.id} name={e.name} />
      </div>
    </li>
  )
}

function Stat({ label, value, sub, status }: { label: string; value: string; sub?: string; status?: NutrientProgress['status'] }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1">
        <span className={`text-2xl font-bold tabular-nums ${status === 'over' ? 'text-accent' : ''}`}>{value}</span>
        {sub && <span className="ml-1 text-xs text-muted">{sub}</span>}
      </dd>
    </div>
  )
}
