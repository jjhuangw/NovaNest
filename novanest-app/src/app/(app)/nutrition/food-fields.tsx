'use client'

// 新增與編輯飲食紀錄共用的欄位：份量（倍數或重量）、營養素輸入、熱量來源比例
import type { Messages } from '@/lib/i18n/messages'
import type { NutrientKey } from '@/lib/nutrition/nutrients'
import { macroRatio, parseWeight, scaleAmount } from '@/lib/nutrition/portion'
import { parseNumber, PORTIONS, type Draft } from './food-draft'

export const inputClass =
  'block min-h-11 w-full min-w-0 border border-line bg-surface px-3 py-2 text-sm tabular-nums placeholder-muted/60 focus:border-foreground focus:outline-none'
export const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider'
const smallInputClass =
  'block min-h-9 border border-line bg-surface px-2 py-1.5 text-sm tabular-nums focus:border-foreground focus:outline-none'

// 份量：選倍數或輸入實際重量，營養素依一份的數值自動重新計算
export function PortionFields({
  draft,
  onPortion,
  t,
}: {
  draft: Draft
  onPortion: (servings: string, gramsText: string | null) => void
  t: Messages['nutrition']
}) {
  const weight = parseWeight(draft.amount)
  const factor = parseNumber(draft.servings)
  return (
      <fieldset className="mt-3">
        <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider">{t.portion}</legend>
        <div className="flex flex-wrap items-center gap-2">
          {PORTIONS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={factor === p}
              onClick={() => onPortion(String(p), null)}
              className={`min-h-9 min-w-11 border px-2 text-sm tabular-nums ${factor === p ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`}
            >
              {t.portionLabel(p)}
            </button>
          ))}
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="number"
              inputMode="decimal"
              min={0.05}
              max={50}
              step={0.05}
              value={draft.servings}
              onChange={(e) => onPortion(e.target.value, null)}
              aria-label={t.portionFactor}
              className={`${smallInputClass} w-20`}
            />
            <span className="text-muted">×</span>
          </label>
          {weight && (
            <label className="flex items-center gap-1.5 text-sm">
              <span className="text-muted">≈</span>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                step={1}
                value={draft.gramsText ?? (factor !== null && factor > 0 ? String(Math.round(weight.value * factor * 10) / 10) : '')}
                onChange={(e) => {
                  const g = parseNumber(e.target.value)
                  onPortion(g !== null && g > 0 ? String(Math.round((g / weight.value) * 10000) / 10000) : draft.servings, e.target.value)
                }}
                aria-label={t.portionWeight(weight.unit)}
                className={`${smallInputClass} w-24`}
              />
              <span className="text-muted">{weight.unit}</span>
            </label>
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {factor !== null && factor > 0 && factor !== 1 && draft.amount.trim()
            ? t.portionResult(scaleAmount(draft.amount, factor))
            : weight
              ? t.portionHintWeight
              : t.portionHint}
        </p>
      </fieldset>
  )
}

export function NutrientInput({
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

// 三大營養素占熱量的比例，數值一改就跟著更新
const RATIO_COLORS = { proteinG: 'bg-accent', carbsG: 'bg-foreground', fatG: 'bg-muted' } as const

export function MacroRatio({ proteinG, carbsG, fatG, t }: { proteinG: number; carbsG: number; fatG: number; t: Messages['nutrition'] }) {
  const ratio = macroRatio(proteinG, carbsG, fatG)
  if (!ratio) return null
  const keys = ['proteinG', 'carbsG', 'fatG'] as const
  return (
    <div className="mt-3">
      <div className="flex h-1.5 w-full overflow-hidden bg-track" aria-hidden>
        {keys.map((k) => (
          <span key={k} className={RATIO_COLORS[k]} style={{ width: `${ratio[k]}%` }} />
        ))}
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-muted">
        <span className="font-semibold text-foreground">{t.ratioLabel}</span>
        {keys.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 tabular-nums">
            <span aria-hidden className={`h-2 w-2 ${RATIO_COLORS[k]}`} />
            {t.nutrientsShort[k]} {ratio[k]}%
          </span>
        ))}
      </p>
    </div>
  )
}
