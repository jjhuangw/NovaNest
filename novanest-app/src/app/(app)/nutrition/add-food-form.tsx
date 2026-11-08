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
  sumNutrients,
  UNITS,
  type Meal,
  type NutrientKey,
  type Source,
} from '@/lib/nutrition/nutrients'
import { checkImage, compressImage, imageProblemMessage } from '@/lib/photos/compress'
import { ACCEPT_ATTR } from '@/lib/photos/limits'
import { baseFrom, draftFrom, emptyDraft, hasMacros, parseNumber, toItem, withServings, withValue, type Draft } from './food-draft'
import { inputClass, labelClass, MacroRatio, NutrientInput, PortionFields } from './food-fields'
import { analyzeFoodAction, estimateFoodAction, saveFoodAction } from './actions'


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
  const [estimatingKey, setEstimatingKey] = useState<number | null>(null)

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

  // 依食物名稱帶入一般份量的營養素；有填份量時以該份量估算
  // auto：離開欄位時自動觸發，失敗時不顯示錯誤（按按鈕才會顯示原因）
  async function estimate(d: Draft, { auto = false } = {}) {
    const name = d.name.trim()
    if (!name) {
      setError(t.errors.nameRequired)
      return
    }
    if (estimatingKey !== null) return
    if (!auto) setError(null)
    setEstimatingKey(d.key)
    try {
      const result = await estimateFoodAction({ name, amount: d.amount })
      if (!result.ok) {
        if (!auto) setError(result.error)
        update(d.key, { estimatedFor: name })
        return
      }
      setDrafts((ds) =>
        ds.map((x) =>
          x.key === d.key
            ? withServings(
                { ...x, amount: x.amount.trim() || (result.item.amount ?? ''), base: baseFrom(result.item), estimatedFor: name, estimated: true },
                x.servings,
              )
            : x,
        ),
      )
    } catch {
      if (!auto) setError(t.errors.failed)
    } finally {
      setEstimatingKey(null)
    }
  }

  // 離開名稱欄位時，只在營養素都還空白、且這個名稱還沒查過時自動帶入，不會覆蓋已輸入的數值
  function autoEstimate(d: Draft) {
    const name = d.name.trim()
    if (name && !hasMacros(d) && d.estimatedFor !== name) estimate(d, { auto: true })
  }

  function update(key: number, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  }

  function updateValue(key: number, nutrient: NutrientKey, value: string) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? withValue(d, nutrient, value) : d)))
  }

  function updatePortion(key: number, servings: string, gramsText: string | null = null) {
    setDrafts((ds) => ds.map((d) => (d.key === key ? withServings(d, servings, gramsText) : d)))
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
                estimating={estimatingKey === d.key}
                onEstimate={() => estimate(d)}
                onNameBlur={() => autoEstimate(d)}
                t={t}
                onChange={(patch) => update(d.key, patch)}
                onValue={(k, v) => updateValue(d.key, k, v)}
                onPortion={(servings, gramsText) => updatePortion(d.key, servings, gramsText)}
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

          <div className="mt-6 border-t border-foreground pt-3 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <span className="font-bold">{t.total}</span>
              {MACROS.map((k) => (
                <span key={k} className="tabular-nums">
                  <span className="text-muted">{t.nutrientsShort[k]} </span>
                  {formatAmount(total[k], k)} {UNITS[k]}
                </span>
              ))}
            </div>
            <MacroRatio proteinG={total.proteinG} carbsG={total.carbsG} fatG={total.fatG} t={t} />
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
  estimating,
  onEstimate,
  onNameBlur,
  t,
  onChange,
  onValue,
  onPortion,
  onRemove,
}: {
  draft: Draft
  index: number
  canRemove: boolean
  estimating: boolean
  onEstimate: () => void
  onNameBlur: () => void
  t: Messages['nutrition']
  onChange: (patch: Partial<Draft>) => void
  onValue: (key: NutrientKey, value: string) => void
  onPortion: (servings: string, gramsText: string | null) => void
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
        <div className="min-w-0">
          <label htmlFor={`${id}-name`} className={labelClass}>
            {t.itemName}
          </label>
          <div className="flex gap-2">
            <input
              id={`${id}-name`}
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              onBlur={onNameBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  onEstimate()
                }
              }}
              maxLength={100}
              required
              placeholder={t.itemNamePlaceholder}
              className={inputClass}
            />
            <button
              type="button"
              onClick={onEstimate}
              disabled={estimating || !draft.name.trim()}
              className="shrink-0 border border-foreground px-3 text-xs font-semibold hover:bg-foreground hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              {estimating ? t.estimating : t.estimate}
            </button>
          </div>
        </div>
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

      {draft.estimated && draft.estimatedFor === draft.name.trim() && hasMacros(draft) && (
        <p className="mt-2 text-xs text-muted">{t.estimatedNote}</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACROS.map((k) => (
          <NutrientInput key={k} id={`${id}-${k}`} nutrient={k} label={t.withUnit(t.nutrients[k], UNITS[k])} value={draft.values[k]} onChange={(v) => onValue(k, v)} />
        ))}
      </div>
      <MacroRatio
        proteinG={parseNumber(draft.values.proteinG) ?? 0}
        carbsG={parseNumber(draft.values.carbsG) ?? 0}
        fatG={parseNumber(draft.values.fatG) ?? 0}
        t={t}
      />

      <PortionFields draft={draft} onPortion={onPortion} t={t} />

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
