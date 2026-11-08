import Link from 'next/link'
import { connection } from 'next/server'
import { loadForUser } from '@/lib/auth/session'
import { getQuestionnaire } from '@/lib/training/questionnaire-store'
import { SavedToast } from '@/components/form-feedback'
import { DAY_KEYS, formatDuration, isDayKey, type DietAdvice } from '@/lib/training/plan'
import type { Messages } from '@/lib/i18n/messages'
import { getActivePlan } from '@/lib/training/plan-store'
import { planText } from '@/lib/training/plan-copy'
import { getI18n } from '@/lib/i18n/server'
import { formatDate, isoDateOf, todayKey } from '@/lib/training/dates'
import { translatePlanAction } from './actions'
import TranslateButton from './translate-button'

export const instant = false

export default async function TrainingPage(props: PageProps<'/training'>) {
  const { day, generated, translate } = await props.searchParams
  // 「今天」必須依每次請求計算，不能在預先渲染時決定
  await connection()
  const today = todayKey()
  const selected = isDayKey(day) ? day : today
  const {
    data: [{ locale, t }, questionnaire, active],
  } = await loadForUser((userId) => Promise.all([getI18n(), getQuestionnaire(userId), getActivePlan(userId)]))
  const { plan } = active
  const text = planText(locale, plan, active.translation)
  // AI 課表的語言和目前語系不同、也還沒有翻譯時，提供翻譯
  const needsTranslation = active.generated && active.locale !== null && active.locale !== locale && !active.translation
  const translateError = typeof translate === 'string' ? (t.training.translateErrors[translate] ?? t.training.translateErrors.failed) : null
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
          <p className="mt-2 text-xs text-muted">
            {active.createdAt ? t.training.generatedOn(formatDate(isoDateOf(active.createdAt))) : t.training.sampleNotice}
          </p>
          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label={t.training.currentWeight} value={`${plan.currentWeightKg} kg`} />
            <Stat label={t.training.targetWeight} value={`${plan.targetWeightKg} kg`} />
            <Stat label={t.training.frequency} value={t.training.perWeek(plan.daysPerWeek)} />
            <Stat label={t.training.duration} value={text.sessionLength} />
          </dl>
        </div>
      </section>

      {(needsTranslation || active.translation) && (
        <section className="mx-auto max-w-6xl px-6 pt-8">
          {needsTranslation ? (
            <form action={translatePlanAction} className="flex flex-col gap-3 border border-line p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">{t.training.translatePrompt}</p>
              <TranslateButton label={t.training.translate} pendingLabel={t.training.translating} />
            </form>
          ) : (
            <p className="text-xs text-muted">{t.training.translatedNote}</p>
          )}
          {translateError && <p className="mt-3 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{translateError}</p>}
        </section>
      )}

      {typeof generated === 'string' && <SavedToast key={generated} savedAt={generated} message={t.training.generatedToast} />}

      {active.generated ? (
        <PlanExtras timeline={text.timeline} safetyNotes={text.safetyNotes} t={t} />
      ) : (
      <section className="mx-auto max-w-6xl px-6 pt-12">
        <div className="flex flex-col gap-4 border border-line p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">{questionnaire ? t.setup.cta.doneTitle : t.setup.cta.title}</h2>
            <p className="mt-1 text-sm text-muted">{questionnaire ? t.setup.cta.doneDesc : t.setup.cta.desc}</p>
          </div>
          <Link
            href="/training/setup"
            className="shrink-0 bg-foreground px-8 py-3 text-center text-xs font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85"
          >
            {questionnaire ? t.setup.cta.doneButton : t.setup.cta.button}
          </Link>
        </div>
      </section>
      )}

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
                    <span className="flex-1 font-semibold">
                      {text.exercise(e.name)}
                      {e.substitute && (
                        <span className="mt-1 block text-xs font-normal text-muted">{t.training.substitute(text.substitute(e.name, e.substitute)!)}</span>
                      )}
                    </span>
                    <span className="text-right text-sm tabular-nums">
                      {t.training.volume(e.sets, text.reps(e.name, e.reps), e.perSide)}
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

      {text.diet && <DietSection diet={text.diet} t={t} />}

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
          {active.generated && (
            <Link href="/training/setup" className="mt-8 inline-block text-sm font-semibold underline underline-offset-4">
              {t.training.redo}
            </Link>
          )}
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

// AI 課表的預估時程與安全提醒
function PlanExtras({ timeline, safetyNotes, t }: { timeline?: string; safetyNotes?: string[]; t: Messages }) {
  if (!timeline && !safetyNotes?.length) return null
  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-6 pt-12 md:grid-cols-2">
      {timeline && (
        <div className="border border-line p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest">{t.training.timeline}</h2>
          <p className="mt-3 text-sm leading-relaxed">{timeline}</p>
        </div>
      )}
      {safetyNotes && safetyNotes.length > 0 && (
        <div className="border-l-2 border-accent bg-stone p-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-accent">{t.training.safety}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed">
            {safetyNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function DietSection({ diet, t }: { diet: DietAdvice; t: Messages }) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">{t.training.dietTitle}</h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed">{diet.summary}</p>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {diet.meals.map((m) => (
            <div key={m.meal}>
              <h3 className="text-xs font-semibold uppercase tracking-widest">{t.training.meals[m.meal]}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted marker:text-line">
                {m.ideas.map((idea) => (
                  <li key={idea}>{idea}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {diet.avoid.length > 0 && (
          <p className="mt-8 border-l-2 border-accent bg-stone px-4 py-3 text-sm">
            <span className="font-semibold">{t.training.dietAvoid}</span>
            {diet.avoid.join(t.setup.listSeparator)}
          </p>
        )}
      </div>
    </section>
  )
}
