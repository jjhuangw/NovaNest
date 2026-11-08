'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'
import { EXTRAS, formatAmount, MACROS, MEALS, UNITS, type Meal, type Nutrients, type Source } from '@/lib/nutrition/nutrients'
import { updateFoodAction } from './actions'
import DeleteButton from './delete-button'
import { draftFrom, parseNumber, toItem, withServings, withValue, type Draft } from './food-draft'
import { inputClass, labelClass, MacroRatio, NutrientInput, PortionFields } from './food-fields'

export interface Entry extends Nutrients {
  id: string
  meal: Meal
  source: Source
  name: string
  amount: string | null
}

// 一筆飲食紀錄：平常只顯示，按「編輯」後可以改餐別、名稱、份量與營養素。
// 份量以目前存的數值為 1 份，調整倍數或重量時依比例重新計算。
export default function EntryItem({ entry: e }: { entry: Entry }) {
  const { t: messages } = useI18n()
  const t = messages.nutrition
  const router = useRouter()
  const id = useId()
  const [editing, setEditing] = useState(false)
  const [meal, setMeal] = useState<Meal>(e.meal)
  const [draft, setDraft] = useState<Draft>(() => draftFrom(e))
  const [error, setError] = useState<string | null>(null)
  const [saving, startSave] = useTransition()

  function startEdit() {
    setMeal(e.meal)
    setDraft(draftFrom(e))
    setError(null)
    setEditing(true)
  }

  function save() {
    const item = toItem(draft)
    if (!item.name) {
      setError(t.errors.invalid)
      return
    }
    setError(null)
    startSave(async () => {
      const result = await updateFoodAction({ id: e.id, meal, item })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  if (!editing) {
    return (
      <li className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {e.name}
            {e.source !== 'manual' && (
              <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wider text-muted">{t.sources[e.source]}</span>
            )}
          </p>
          {e.amount && <p className="text-xs text-muted">{e.amount}</p>}
          <p className="mt-1 text-xs tabular-nums text-muted">
            {t.nutrientsShort.proteinG} {formatAmount(e.proteinG, 'proteinG')} g・{t.nutrientsShort.carbsG} {formatAmount(e.carbsG, 'carbsG')} g・
            {t.nutrientsShort.fatG} {formatAmount(e.fatG, 'fatG')} g
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-bold tabular-nums">{formatAmount(e.kcal, 'kcal')} kcal</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={startEdit}
              aria-label={t.editLabel(e.name)}
              className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
            >
              {t.edit}
            </button>
            <DeleteButton id={e.id} name={e.name} />
          </div>
        </div>
      </li>
    )
  }

  const values = draft.values
  return (
    <li className="py-4">
      <div className="border border-foreground p-4">
        <p className="text-sm font-bold">{t.editTitle(e.name)}</p>

        <fieldset className="mt-4">
          <legend className={labelClass}>{t.meal}</legend>
          <div className="grid grid-cols-4 gap-2">
            {MEALS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={meal === m}
                onClick={() => setMeal(m)}
                className={`border py-2 text-sm font-semibold ${meal === m ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`}
              >
                {t.meals[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-[3fr_2fr]">
          <label className="block min-w-0">
            <span className={labelClass}>{t.itemName}</span>
            <input value={draft.name} onChange={(ev) => {
                setDraft({ ...draft, name: ev.target.value })
                setError(null)
              }} maxLength={100} required className={inputClass} />
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>{t.amount}</span>
            <input
              value={draft.amount}
              onChange={(ev) => setDraft({ ...draft, amount: ev.target.value, gramsText: null })}
              maxLength={80}
              placeholder={t.amountPlaceholder}
              className={inputClass}
            />
          </label>
        </div>

        <PortionFields draft={draft} onPortion={(servings, gramsText) => setDraft(withServings(draft, servings, gramsText))} t={t} />

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACROS.map((k) => (
            <NutrientInput
              key={k}
              id={`${id}-${k}`}
              nutrient={k}
              label={t.withUnit(t.nutrients[k], UNITS[k])}
              value={values[k]}
              onChange={(v) => setDraft(withValue(draft, k, v))}
            />
          ))}
        </div>
        <MacroRatio proteinG={parseNumber(values.proteinG) ?? 0} carbsG={parseNumber(values.carbsG) ?? 0} fatG={parseNumber(values.fatG) ?? 0} t={t} />

        <details className="mt-3" open={EXTRAS.some((k) => values[k] !== '')}>
          <summary className="cursor-pointer text-xs font-semibold text-muted">{t.extras}</summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {EXTRAS.map((k) => (
              <NutrientInput
                key={k}
                id={`${id}-${k}`}
                nutrient={k}
                label={t.withUnit(t.nutrients[k], UNITS[k])}
                value={values[k]}
                onChange={(v) => setDraft(withValue(draft, k, v))}
              />
            ))}
          </div>
        </details>

        {error && <p className="mt-4 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="bg-foreground px-8 py-3 text-sm font-semibold uppercase tracking-widest text-background hover:opacity-85 disabled:opacity-50"
          >
            {saving ? t.saving : t.saveEdit}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-sm font-semibold underline-offset-4 hover:underline">
            {t.cancelEdit}
          </button>
        </div>
      </div>
    </li>
  )
}
