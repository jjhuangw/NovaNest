import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { formatDate, isoDateOf, todayISO } from '@/lib/training/dates'
import { DAY_KEYS } from '@/lib/training/plan'
import { CURRENT_SHAPES, DEFAULT_ANSWERS, findShape, TARGET_SHAPES, type Questionnaire } from '@/lib/training/questionnaire'
import { getQuestionnaire } from '@/lib/training/questionnaire-store'
import { getActivePlan } from '@/lib/training/plan-store'
import { getBodyData, type Gender } from '@/lib/user/profile'
import type { Messages } from '@/lib/i18n/messages'
import { generatePlanAction } from './actions'
import { BodyShapeFigure } from './body-shape'
import { GenerateButton } from './generate-button'
import { SetupWizard } from './wizard'

export const instant = false
// 產生課表的 server action 在這個頁面執行，模型回應約需 1–2 分鐘
export const maxDuration = 300

export default async function SetupPage(props: PageProps<'/training/setup'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { edit, error } = await props.searchParams
  const [saved, body, active, { t }] = await Promise.all([
    getQuestionnaire(session.userId),
    getBodyData(session.userId),
    getActivePlan(session.userId),
    getI18n(),
  ])
  const ts = t.setup
  const showSummary = saved !== null && body.gender !== null && edit !== '1'

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Plan builder</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{ts.title}</h1>
          <p className="mt-4 max-w-xl text-base">{ts.intro}</p>
        </div>
      </section>

      {showSummary ? (
        <Summary
          answers={saved.answers}
          gender={body.gender!}
          planCreatedAt={active.createdAt && isoDateOf(active.createdAt)}
          error={typeof error === 'string' ? (ts.generateErrors[error] ?? null) : null}
          t={t}
        />
      ) : (
        <SetupWizard
          initialAnswers={saved?.answers ?? DEFAULT_ANSWERS}
          initialProfile={{ gender: body.gender, heightCm: body.heightCm, weightKg: body.weightKg, birthYear: body.birthYear }}
          maxBirthYear={Number(todayISO().slice(0, 4)) - 10}
        />
      )}
    </div>
  )
}

function Summary({
  answers,
  gender,
  planCreatedAt,
  error,
  t,
}: {
  answers: Questionnaire
  gender: Gender
  planCreatedAt: string | null
  error: string | null
  t: Messages
}) {
  const ts = t.setup
  const join = (items: string[]) => (items.length ? items.join(ts.listSeparator) : ts.none)
  const current = findShape(CURRENT_SHAPES[gender], answers.currentShape)
  const target = findShape(TARGET_SHAPES[gender], answers.targetShape)
  const venue = ts.venues[answers.venue].label
  const equipment = answers.venue === 'home' && answers.equipment.length ? `・${join(answers.equipment.map((e) => ts.equipmentItems[e]))}` : ''
  const days = answers.days.length ? join(DAY_KEYS.filter((d) => answers.days.includes(d)).map((d) => t.days[d])) : ts.daysAny
  const injuries = [...answers.injuries.map((i) => ts.injuryItems[i]), ...(answers.injuryNote ? [answers.injuryNote] : [])]
  const allergies = [...answers.allergies.map((a) => ts.allergyItems[a]), ...(answers.allergyNote ? [answers.allergyNote] : [])]

  const rows: [string, string][] = [
    [ts.summary.goal, ts.goals[answers.goal].label],
    [ts.summary.experience, ts.experiences[answers.experience].label],
    [ts.summary.schedule, ts.scheduleSummary(ts.hours(answers.weeklyHours), days, ts.times[answers.timeOfDay])],
    [ts.summary.venue, venue + equipment],
    [ts.summary.injuries, join(injuries)],
    [ts.summary.diet, [join(allergies), ts.diets[answers.diet], ts.eatingOutItems[answers.eatingOut]].join('・')],
  ]

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="border-l-2 border-accent pl-5">
        <h2 className="text-2xl font-bold">{ts.savedTitle}</h2>
        <p className="mt-2 text-sm text-muted">{ts.savedNote}</p>
        {planCreatedAt && <p className="mt-1 text-xs text-muted">{ts.hasPlan(formatDate(planCreatedAt))}</p>}
      </div>

      {error && (
        <p role="alert" className="mt-6 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <form action={generatePlanAction} className="mt-6">
        <GenerateButton label={planCreatedAt ? ts.regenerate : ts.generate} pendingLabel={ts.generating} primary={!planCreatedAt} />
      </form>

      <div className="mt-10 grid grid-cols-2 gap-4">
        {(
          [
            [ts.summary.current, current, current && ts.currentShapes[gender][current.id]],
            [ts.summary.target, target, target && ts.targetShapes[gender][target.id]],
          ] as const
        ).map(([label, shape, copy]) => (
          <div key={label} className="bg-stone p-4 text-center">
            <p className="text-xs font-semibold tracking-wider text-muted">{label}</p>
            {shape && copy ? (
              <>
                <BodyShapeFigure gender={gender} bodyFat={shape.bodyFat} muscle={shape.muscle} className="mx-auto mt-3 h-40 w-auto opacity-85" />
                <p className="mt-3 font-bold">{copy.label}</p>
                <p className="text-xs text-muted">{copy.desc}</p>
              </>
            ) : (
              <p className="py-16 text-sm text-muted">{ts.notAnswered}</p>
            )}
          </div>
        ))}
      </div>

      <dl className="mt-8 divide-y divide-line border-y border-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[6rem_1fr] gap-4 py-4 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="font-semibold">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/training/setup?edit=1" className="bg-foreground px-12 py-3.5 text-center text-sm font-semibold uppercase tracking-widest text-background hover:opacity-85">
          {ts.edit}
        </Link>
        <Link href="/training" className="border border-line px-12 py-3.5 text-center text-sm font-semibold uppercase tracking-widest hover:border-foreground">
          {ts.backToPlan}
        </Link>
      </div>
    </div>
  )
}
