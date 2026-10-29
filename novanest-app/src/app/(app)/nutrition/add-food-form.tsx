'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SavedToast } from '@/components/form-feedback'
import { useI18n } from '@/lib/i18n/client'
import type { Messages } from '@/lib/i18n/messages'
import {
  EXTRAS,
  formatAmount,
  MACROS,
  MAX_ITEMS_PER_SAVE,
  MEALS,
  scaleNutrients,
  sumNutrients,
  UNITS,
  type FoodItem,
  type Meal,
  type NutrientKey,
  type Source,
} from '@/lib/nutrition/nutrients'
import { checkImage, compressImage, imageProblemMessage } from '@/lib/photos/compress'
import { ACCEPT_ATTR } from '@/lib/photos/limits'
import { analyzeFoodAction, saveFoodAction } from './actions'

// 編輯中的一項食物：營養素為「每份」的值，存檔時才乘上份數
interface Draft {
  key: number
  name: string
  amount: string
  servings: string
  values: Record<NutrientKey, string>
}

let nextKey = 0

function emptyDraft(): Draft {
  return {
    key: nextKey++,
    name: '',
    amount: '',
    servings: '1',
    values: { kcal: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', sugarG: '', sodiumMg: '' },
  }
}

function draftFrom(item: FoodItem): Draft {
  const str = (v: number | null) => (v === null ? '' : String(v))
  return {
    key: nextKey++,
    name: item.name,
    amount: item.amount ?? '',
    servings: '1',
    values: {
      kcal: str(item.kcal),
      proteinG: str(item.proteinG),
      carbsG: str(item.carbsG),
      fatG: str(item.fatG),
      fiberG: str(item.fiberG),
      sugarG: str(item.sugarG),
      sodiumMg: str(item.sodiumMg),
    },
  }
}

function parseNumber(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function servingsOf(d: Draft) {
  const n = parseNumber(d.servings)
  return n !== null && n > 0 ? n : 1
}

// 轉成實際吃下的量；必填的四項留空視為 0
function toItem(d: Draft): FoodItem {
  const servings = servingsOf(d)
  const perServing = {
    name: d.name.trim(),
    amount: d.amount.trim() || null,
    kcal: parseNumber(d.values.kcal) ?? 0,
    proteinG: parseNumber(d.values.proteinG) ?? 0,
    carbsG: parseNumber(d.values.carbsG) ?? 0,
    fatG: parseNumber(d.values.fatG) ?? 0,
    fiberG: parseNumber(d.values.fiberG),
    sugarG: parseNumber(d.values.sugarG),
    sodiumMg: parseNumber(d.values.sodiumMg),
  }
  const item = scaleNutrients(perServing, servings)
  if (servings !== 1) item.amount = `${perServing.amount ?? ''} × ${servings}`.trim()
  return item
}

const inputClass =
  'block min-h-11 w-full min-w-0 border border-line bg-surface px-3 py-2 text-sm tabular-nums placeholder-muted/60 focus:border-foreground focus:outline-none'
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider'

export default function AddFoodForm({ date, defaultMeal }: { date: string; defaultMeal: Meal }) {
  const router = useRouter()
  const { t: messages } = useI18n()
  const t = messages.nutrition
  const [mode, setMode] = useState<Source>('manual')
  const [meal, setMeal] = useState<Meal>(defaultMeal)
  const [drafts, setDrafts] = useState<Draft[]>(() => [emptyDraft()])
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [analyzed, setAnalyzed] = useState<{ note: string | null; servingsPerPackage: number | null } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [analyzing, startAnalyze] = useTransition()
  const [saving, startSave] = useTransition()

  // 手動輸入直接顯示編輯表單；照片模式要等分析完成
  const editing = mode === 'manual' || analyzed !== null

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setFile(null)
    setHint('')
    setAnalyzed(null)
  }

  function switchMode(next: Source) {
    if (next === mode) return
    clearPhoto()
    setError(null)
    setMode(next)
    setDrafts([emptyDraft()])
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const picked = input.files?.[0]
    clearPhoto()
    setError(null)
    if (!picked) return
    const problem = await checkImage(picked)
    if (problem) {
      setError(imageProblemMessage(problem, messages.upload))
      input.value = ''
      return
    }
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  function analyze() {
    if (!file) {
      setError(messages.upload.errors.required)
      return
    }
    setError(null)
    startAnalyze(async () => {
      const data = new FormData()
      data.set('mode', mode)
      data.set('hint', hint)
      try {
        data.set('photo', await compressImage(file), 'food.jpg')
      } catch {
        setError(messages.upload.errors.unreadable)
        return
      }
      const result = await analyzeFoodAction(data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setDrafts(result.items.map(draftFrom))
      setAnalyzed({ note: result.note, servingsPerPackage: result.servingsPerPackage })
    })
  }

  function update(key: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  function updateValue(key: number, nutrient: NutrientKey, value: string) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, values: { ...d.values, [nutrient]: value } } : d)))
  }

  function save() {
    const items = drafts.map(toItem)
    if (items.some((i) => !i.name)) {
      setError(t.errors.invalid)
      return
    }
    setError(null)
    startSave(async () => {
      const result = await saveFoodAction({ date, meal, source: mode, items })
      if (!result.ok) {
        setError(result.error)
        return
      }
      clearPhoto()
      setDrafts([emptyDraft()])
      setSavedCount(items.length)
      setSavedAt(String(Date.now()))
      router.refresh()
    })
  }

  const total = sumNutrients(drafts.map(toItem))

  return (
    <div>
      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={t.saved(savedCount)} />}

      <div role="tablist" aria-label={t.addTitle} className="grid grid-cols-3 border-b border-line text-sm">
        {(['manual', 'photo', 'label'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={`-mb-px border-b-2 py-2.5 font-semibold ${mode === m ? 'border-foreground' : 'border-transparent text-muted'}`}
          >
            {t.modes[m]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">{t.modeHints[mode]}</p>

      <fieldset className="mt-5">
        <legend className={labelClass}>{t.meal}</legend>
        <div className="grid grid-cols-4 gap-2">
          {MEALS.map((m) => (
            <label key={m}>
              <input type="radio" name="meal" value={m} checked={meal === m} onChange={() => setMeal(m)} className="peer sr-only" />
              <span className="block cursor-pointer border border-line py-2.5 text-center text-sm font-semibold peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                {t.meals[m]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode !== 'manual' && (
        <div className="mt-5 grid gap-4 sm:grid-cols-[160px_1fr]">
          <label className="relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-foreground/40 bg-stone text-center text-sm text-muted hover:border-foreground">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽，不需要最佳化
              <img src={preview} alt={messages.upload.preview} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <>
                <span className="text-2xl">＋</span>
                <span className="mt-2 px-3">{t.choosePhoto[mode]}</span>
              </>
            )}
            {/* key：切換模式時清空已選的檔案 */}
            <input key={mode} type="file" accept={ACCEPT_ATTR} onChange={onFileChange} className="sr-only" />
          </label>

          <div className="min-w-0 space-y-4">
            {mode === 'photo' && (
              <label className="block">
                <span className={labelClass}>{t.hint}</span>
                <input
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  maxLength={300}
                  placeholder={t.hintPlaceholder}
                  className={inputClass}
                />
              </label>
            )}
            <button
              type="button"
              onClick={analyze}
              disabled={!file || analyzing}
              className="w-full border border-foreground py-3 text-sm font-semibold uppercase tracking-widest hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground sm:w-auto sm:px-10"
            >
              {analyzing ? t.analyzing : t.analyze}
            </button>
            <p className="text-xs text-muted">{messages.upload.limits}</p>
          </div>
        </div>
      )}

      {error && <p className="mt-5 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

      {editing && (
        <div className="mt-6">
          {analyzed && (
            <div className="mb-4 space-y-1 border-l-2 border-foreground bg-stone px-3 py-2 text-sm">
              <p>{t.aiDisclaimer}</p>
              {analyzed.servingsPerPackage !== null && <p className="text-muted">{t.servingsPerPackage(analyzed.servingsPerPackage)}</p>}
              {analyzed.note && <p className="text-muted">{analyzed.note}</p>}
            </div>
          )}

          <ol className="space-y-6">
            {drafts.map((d, i) => (
              <DraftEditor
                key={d.key}
                draft={d}
                index={i}
                canRemove={drafts.length > 1}
                showServings={mode === 'label'}
                t={t}
                onChange={(patch) => update(d.key, patch)}
                onValue={(k, v) => updateValue(d.key, k, v)}
                onRemove={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}
              />
            ))}
          </ol>

          {drafts.length < MAX_ITEMS_PER_SAVE && (
            <button
              type="button"
              onClick={() => setDrafts((ds) => [...ds, emptyDraft()])}
              className="mt-4 text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t.addItem}
            </button>
          )}

          <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-foreground pt-3 text-sm">
            <span className="font-bold">{t.total}</span>
            {MACROS.map((k) => (
              <span key={k} className="tabular-nums">
                <span className="text-muted">{t.nutrientsShort[k]} </span>
                {formatAmount(total[k], k)} {UNITS[k]}
              </span>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto sm:px-12"
            >
              {saving ? t.saving : t.save}
            </button>
            {analyzed && (
              <button type="button" onClick={clearPhoto} className="text-sm font-semibold underline-offset-4 hover:underline">
                {t.retake}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DraftEditor({
  draft,
  index,
  canRemove,
  showServings,
  t,
  onChange,
  onValue,
  onRemove,
}: {
  draft: Draft
  index: number
  canRemove: boolean
  showServings: boolean
  t: Messages['nutrition']
  onChange: (patch: Partial<Draft>) => void
  onValue: (key: NutrientKey, value: string) => void
  onRemove: () => void
}) {
  const id = useId()
  const hasExtras = EXTRAS.some((k) => draft.values[k] !== '')
  return (
    <li className="border-b border-line pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-muted">{String(index + 1).padStart(2, '0')}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-xs font-semibold text-muted hover:text-foreground">
            {t.removeItem(draft.name || String(index + 1))}
          </button>
        )}
      </div>
      <div className="mt-2 grid gap-3 sm:grid-cols-[3fr_2fr]">
        <label className="block min-w-0">
          <span className={labelClass}>{t.itemName}</span>
          <input
            value={draft.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={100}
            required
            placeholder={t.itemNamePlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block min-w-0">
          <span className={labelClass}>{t.amount}</span>
          <input
            value={draft.amount}
            onChange={(e) => onChange({ amount: e.target.value })}
            maxLength={80}
            placeholder={t.amountPlaceholder}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACROS.map((k) => (
          <NutrientInput key={k} id={`${id}-${k}`} nutrient={k} label={t.withUnit(t.nutrients[k], UNITS[k])} value={draft.values[k]} onChange={(v) => onValue(k, v)} />
        ))}
      </div>

      {showServings && (
        <label className="mt-3 flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider">{t.servings}</span>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            max={50}
            step={0.1}
            value={draft.servings}
            onChange={(e) => onChange({ servings: e.target.value })}
            className={`${inputClass} w-24`}
          />
          <span className="text-xs text-muted">{t.servingsHint}</span>
        </label>
      )}

      <details className="mt-3" open={hasExtras}>
        <summary className="cursor-pointer text-xs font-semibold text-muted">{t.extras}</summary>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {EXTRAS.map((k) => (
            <NutrientInput key={k} id={`${id}-${k}`} nutrient={k} label={t.withUnit(t.nutrients[k], UNITS[k])} value={draft.values[k]} onChange={(v) => onValue(k, v)} />
          ))}
        </div>
      </details>
    </li>
  )
}

function NutrientInput({
  id,
  nutrient,
  label,
  value,
  onChange,
}: {
  id: string
  nutrient: NutrientKey
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-xs text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={nutrient === 'kcal' || nutrient === 'sodiumMg' ? 1 : 0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}
