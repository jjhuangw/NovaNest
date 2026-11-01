'use client'

import { useRef, useState, useTransition } from 'react'
import { useI18n } from '@/lib/i18n/client'
import { DAY_KEYS } from '@/lib/training/plan'
import {
  ALLERGIES,
  CURRENT_SHAPES,
  DIETS,
  EATING_OUT,
  EXPERIENCES,
  GOALS,
  HOME_EQUIPMENT,
  INJURIES,
  TARGET_SHAPES,
  TIMES_OF_DAY,
  VENUES,
  WEEKLY_HOURS,
  type BodyShape,
  type Questionnaire,
} from '@/lib/training/questionnaire'
import { BODY_LIMITS, type Gender } from '@/lib/user/body'
import { saveSetupAction, type SetupError } from './actions'
import { BodyShapeFigure } from './body-shape'

const STEPS = ['profile', 'goal', 'current', 'target', 'experience', 'schedule', 'venue', 'injuries', 'diet'] as const
type Step = (typeof STEPS)[number]
// 單選題選完自動進到下一步，減少點擊
const AUTO_ADVANCE: readonly Step[] = ['goal', 'current', 'target', 'experience']

export interface InitialProfile {
  gender: Gender | null
  heightCm: number | null
  weightKg: number | null
  birthYear: number | null
}

const chipClass = (selected: boolean) =>
  `min-h-11 border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    selected ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'
  }`
const cardClass = (selected: boolean) =>
  `flex h-full w-full flex-col border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    selected ? 'border-foreground bg-stone ring-1 ring-foreground' : 'border-line hover:border-foreground'
  }`
const inputClass =
  'block min-h-11 w-full min-w-0 border border-line bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-foreground focus:outline-none'
const fieldLabel = 'mb-2 block text-xs font-semibold tracking-wider'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

export function SetupWizard({
  initialAnswers,
  initialProfile,
  maxBirthYear,
}: {
  initialAnswers: Questionnaire
  initialProfile: InitialProfile
  maxBirthYear: number
}) {
  const { t } = useI18n()
  const ts = t.setup
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(initialAnswers)
  const [gender, setGender] = useState<Gender | null>(initialProfile.gender)
  const [heightCm, setHeightCm] = useState(initialProfile.heightCm?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(initialProfile.weightKg?.toString() ?? '')
  const [birthYear, setBirthYear] = useState(initialProfile.birthYear?.toString() ?? '')
  const [error, setError] = useState<SetupError | null>(null)
  const [pending, startTransition] = useTransition()
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

  const step = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1
  const set = <K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) => setAnswers((a) => ({ ...a, [key]: value }))

  function goTo(index: number) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setStepIndex(index)
    setError(null)
    // 換步驟時把焦點移到標題，螢幕閱讀器才知道內容變了
    requestAnimationFrame(() => headingRef.current?.focus())
  }

  function choose<K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) {
    set(key, value)
    if (AUTO_ADVANCE.includes(step)) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(() => goTo(stepIndex + 1), 180)
    }
  }

  function chooseGender(next: Gender) {
    // 體態代號依性別不同，換性別時清掉已選的體態
    if (next !== gender) setAnswers((a) => ({ ...a, currentShape: null, targetShape: null }))
    setGender(next)
  }

  const profileNumbers = { heightCm: parseNumber(heightCm), weightKg: parseNumber(weightKg), birthYear: parseNumber(birthYear) }
  const profileValid =
    gender !== null &&
    Object.values(profileNumbers).every((n) => n === null || !Number.isNaN(n)) &&
    (profileNumbers.heightCm === null ||
      (profileNumbers.heightCm >= BODY_LIMITS.heightCm.min && profileNumbers.heightCm <= BODY_LIMITS.heightCm.max)) &&
    (profileNumbers.weightKg === null ||
      (profileNumbers.weightKg >= BODY_LIMITS.weightKg.min && profileNumbers.weightKg <= BODY_LIMITS.weightKg.max)) &&
    (profileNumbers.birthYear === null ||
      (profileNumbers.birthYear >= BODY_LIMITS.birthYear.min && profileNumbers.birthYear <= maxBirthYear))

  function next() {
    if (step === 'profile' && !profileValid) {
      setError('profile')
      return
    }
    if (!isLast) {
      goTo(stepIndex + 1)
      return
    }
    startTransition(async () => {
      const result = await saveSetupAction({ answers, profile: { gender, ...profileNumbers } })
      // 成功時會直接導向摘要頁，只有失敗才會回到這裡
      if (result?.error) {
        setError(result.error)
        if (result.error === 'profile') goTo(0)
      }
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-muted">
        <span>{ts.progress(stepIndex + 1, STEPS.length)}</span>
      </div>
      <div
        className="mt-2 h-1 bg-track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={stepIndex + 1}
        aria-label={ts.progress(stepIndex + 1, STEPS.length)}
      >
        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="mt-8 text-2xl font-bold focus:outline-none sm:text-3xl">
        {ts.steps[step].title}
      </h2>
      <p className="mt-2 text-sm text-muted">{ts.steps[step].hint}</p>

      <div className="mt-8">
        {step === 'profile' && (
          <div>
            <fieldset>
              <legend className={fieldLabel}>{t.settings.gender}</legend>
              <div className="grid grid-cols-2 gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g} type="button" aria-pressed={gender === g} onClick={() => chooseGender(g)} className={chipClass(gender === g)}>
                    {t.settings[g]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <NumberField label={t.settings.height} value={heightCm} onChange={setHeightCm} step={0.1} min={BODY_LIMITS.heightCm.min} max={BODY_LIMITS.heightCm.max} />
              <NumberField label={t.settings.weight} value={weightKg} onChange={setWeightKg} step={0.1} min={BODY_LIMITS.weightKg.min} max={BODY_LIMITS.weightKg.max} />
              <NumberField label={t.settings.birthYear} value={birthYear} onChange={setBirthYear} step={1} min={BODY_LIMITS.birthYear.min} max={maxBirthYear} numeric />
            </div>
            {gender === null && <p className="mt-4 text-xs text-muted">{ts.genderRequired}</p>}
          </div>
        )}

        {step === 'goal' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button key={g} type="button" aria-pressed={answers.goal === g} onClick={() => choose('goal', g)} className={cardClass(answers.goal === g)}>
                <span className="font-bold">{ts.goals[g].label}</span>
                <span className="mt-1 text-sm text-muted">{ts.goals[g].desc}</span>
              </button>
            ))}
          </div>
        )}

        {(step === 'current' || step === 'target') && gender && (
          <ShapePicker
            gender={gender}
            shapes={(step === 'current' ? CURRENT_SHAPES : TARGET_SHAPES)[gender]}
            copy={(step === 'current' ? ts.currentShapes : ts.targetShapes)[gender]}
            selected={step === 'current' ? answers.currentShape : answers.targetShape}
            onSelect={(id) => choose(step === 'current' ? 'currentShape' : 'targetShape', id)}
            unsureLabel={ts.unsure}
            note={ts.shapesNote}
          />
        )}

        {step === 'experience' && (
          <div className="grid gap-3">
            {EXPERIENCES.map((e) => (
              <button key={e} type="button" aria-pressed={answers.experience === e} onClick={() => choose('experience', e)} className={cardClass(answers.experience === e)}>
                <span className="font-bold">{ts.experiences[e].label}</span>
                <span className="mt-1 text-sm text-muted">{ts.experiences[e].desc}</span>
              </button>
            ))}
          </div>
        )}

        {step === 'schedule' && (
          <div className="space-y-8">
            <ChipGroup label={ts.weeklyHours}>
              {WEEKLY_HOURS.map((h) => (
                <button key={h} type="button" aria-pressed={answers.weeklyHours === h} onClick={() => set('weeklyHours', h)} className={chipClass(answers.weeklyHours === h)}>
                  {ts.hours(h)}
                </button>
              ))}
            </ChipGroup>
            <ChipGroup label={ts.days} hint={ts.multiHint}>
              <button type="button" aria-pressed={answers.days.length === 0} onClick={() => set('days', [])} className={chipClass(answers.days.length === 0)}>
                {ts.daysAny}
              </button>
              {DAY_KEYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={answers.days.includes(d)}
                  onClick={() => set('days', DAY_KEYS.filter((k) => toggle(answers.days, d).includes(k)))}
                  className={chipClass(answers.days.includes(d))}
                >
                  {t.days[d]}
                </button>
              ))}
            </ChipGroup>
            <ChipGroup label={ts.timeOfDay}>
              {TIMES_OF_DAY.map((v) => (
                <button key={v} type="button" aria-pressed={answers.timeOfDay === v} onClick={() => set('timeOfDay', v)} className={chipClass(answers.timeOfDay === v)}>
                  {ts.times[v]}
                </button>
              ))}
            </ChipGroup>
          </div>
        )}

        {step === 'venue' && (
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-2">
              {VENUES.map((v) => (
                <button key={v} type="button" aria-pressed={answers.venue === v} onClick={() => set('venue', v)} className={cardClass(answers.venue === v)}>
                  <span className="font-bold">{ts.venues[v].label}</span>
                  <span className="mt-1 text-sm text-muted">{ts.venues[v].desc}</span>
                </button>
              ))}
            </div>
            {answers.venue === 'home' && (
              <ChipGroup label={ts.equipment} hint={ts.multiHint}>
                {HOME_EQUIPMENT.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={answers.equipment.includes(e)}
                    onClick={() => set('equipment', toggle(answers.equipment, e))}
                    className={chipClass(answers.equipment.includes(e))}
                  >
                    {ts.equipmentItems[e]}
                  </button>
                ))}
              </ChipGroup>
            )}
          </div>
        )}

        {step === 'injuries' && (
          <div className="space-y-6">
            <ChipGroup label={ts.steps.injuries.title} hint={ts.multiHint} hideLabel>
              <button type="button" aria-pressed={answers.injuries.length === 0} onClick={() => set('injuries', [])} className={chipClass(answers.injuries.length === 0)}>
                {ts.none}
              </button>
              {INJURIES.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={answers.injuries.includes(i)}
                  onClick={() => set('injuries', toggle(answers.injuries, i))}
                  className={chipClass(answers.injuries.includes(i))}
                >
                  {ts.injuryItems[i]}
                </button>
              ))}
            </ChipGroup>
            <TextField label={ts.injuryNote} placeholder={ts.injuryNotePlaceholder} value={answers.injuryNote} onChange={(v) => set('injuryNote', v)} />
          </div>
        )}

        {step === 'diet' && (
          <div className="space-y-8">
            <div className="space-y-4">
              <ChipGroup label={ts.allergies} hint={ts.multiHint}>
                <button type="button" aria-pressed={answers.allergies.length === 0} onClick={() => set('allergies', [])} className={chipClass(answers.allergies.length === 0)}>
                  {ts.none}
                </button>
                {ALLERGIES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={answers.allergies.includes(a)}
                    onClick={() => set('allergies', toggle(answers.allergies, a))}
                    className={chipClass(answers.allergies.includes(a))}
                  >
                    {ts.allergyItems[a]}
                  </button>
                ))}
              </ChipGroup>
              <TextField label={ts.allergyNote} placeholder={ts.allergyNotePlaceholder} value={answers.allergyNote} onChange={(v) => set('allergyNote', v)} />
            </div>
            <ChipGroup label={ts.diet}>
              {DIETS.map((d) => (
                <button key={d} type="button" aria-pressed={answers.diet === d} onClick={() => set('diet', d)} className={chipClass(answers.diet === d)}>
                  {ts.diets[d]}
                </button>
              ))}
            </ChipGroup>
            <ChipGroup label={ts.eatingOut}>
              {EATING_OUT.map((e) => (
                <button key={e} type="button" aria-pressed={answers.eatingOut === e} onClick={() => set('eatingOut', e)} className={chipClass(answers.eatingOut === e)}>
                  {ts.eatingOutItems[e]}
                </button>
              ))}
            </ChipGroup>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-8 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">
          {ts.errors[error]}
        </p>
      )}

      <div className="mt-10 flex gap-3 border-t border-line pt-6">
        {stepIndex > 0 && (
          <button type="button" onClick={() => goTo(stepIndex - 1)} disabled={pending} className="border border-line px-6 py-3.5 text-sm font-semibold uppercase tracking-widest hover:border-foreground disabled:opacity-50">
            {ts.back}
          </button>
        )}
        <button
          type="button"
          onClick={next}
          disabled={pending || (step === 'profile' && gender === null)}
          className="flex-1 bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85 disabled:opacity-50 sm:flex-none sm:px-12"
        >
          {isLast ? (pending ? ts.submitting : ts.submit) : ts.next}
        </button>
      </div>
    </div>
  )
}

function ShapePicker({
  gender,
  shapes,
  copy,
  selected,
  onSelect,
  unsureLabel,
  note,
}: {
  gender: Gender
  shapes: BodyShape[]
  copy: Record<string, { label: string; desc: string }>
  selected: string | null
  onSelect: (id: string | null) => void
  unsureLabel: string
  note: string
}) {
  return (
    <div>
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${shapes.length === 6 ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        {shapes.map((s) => (
          <button key={s.id} type="button" aria-pressed={selected === s.id} onClick={() => onSelect(s.id)} className={cardClass(selected === s.id)}>
            <BodyShapeFigure gender={gender} bodyFat={s.bodyFat} muscle={s.muscle} className="mx-auto h-44 w-auto opacity-85" />
            <span className="mt-3 text-sm font-bold">{copy[s.id].label}</span>
            <span className="mt-1 text-xs text-muted">{copy[s.id].desc}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{note}</p>
        <button type="button" aria-pressed={selected === null} onClick={() => onSelect(null)} className="text-sm font-semibold underline underline-offset-4">
          {unsureLabel}
        </button>
      </div>
    </div>
  )
}

function ChipGroup({ label, hint, hideLabel, children }: { label: string; hint?: string; hideLabel?: boolean; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className={hideLabel ? 'sr-only' : fieldLabel}>
        {label}
        {hint && !hideLabel && <span className="ml-2 font-normal text-muted">{hint}</span>}
      </legend>
      {hideLabel && hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function NumberField(props: {
  label: string
  value: string
  onChange: (v: string) => void
  step: number
  min: number
  max: number
  numeric?: boolean
}) {
  return (
    <label className="block min-w-0">
      <span className={fieldLabel}>{props.label}</span>
      <input
        type="number"
        inputMode={props.numeric ? 'numeric' : 'decimal'}
        step={props.step}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className={inputClass}
      />
    </label>
  )
}

function TextField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <label className="block">
      <span className={fieldLabel}>{label}</span>
      <input
        type="text"
        maxLength={300}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass}
      />
    </label>
  )
}
