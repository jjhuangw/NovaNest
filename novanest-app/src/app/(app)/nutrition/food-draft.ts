// 新增與編輯飲食紀錄共用的草稿邏輯（純函式，可在瀏覽器執行）
import { EXTRAS, MACROS, round, type FoodItem, type NutrientKey } from '@/lib/nutrition/nutrients'
import { portionFactor, scaleAmount } from '@/lib/nutrition/portion'

export type Base = Record<NutrientKey, number | null>

// 編輯中的一項食物。base 是「一份」（份量欄位描述的量）的營養素，
// values 是乘上份量倍數後、實際吃下的量，也就是畫面上顯示與存檔的數值。
// 調整倍數或克數時由 base 重新計算 values；直接修改營養素時反推回 base。
export interface Draft {
  key: number
  name: string
  amount: string
  servings: string
  // 使用者直接輸入的克數（null 表示依倍數換算顯示）
  gramsText: string | null
  base: Base
  values: Record<NutrientKey, string>
  // 最近一次依名稱帶入營養素時的名稱，避免同一個名稱重複查詢
  estimatedFor: string | null
  // 營養素是否由 AI 依名稱帶入（查詢失敗時不顯示 AI 說明）
  estimated: boolean
  // 帶入或讀出營養素時的份量文字與一份的營養素。修改份量時以這裡為準換算，
  // 使用者直接改了營養素之後就不再自動換算（null）
  origin: { amount: string; base: Base } | null
  // 份量改了但無法換算（例如「大份」）：營養素還是舊份量的數值，存檔前要重新估算或確認
  stale: boolean
}

export const NUTRIENT_KEYS = [...MACROS, ...EXTRAS] as const
export const PORTIONS = [0.5, 0.75, 1, 1.5, 2]

export function baseFrom(item: FoodItem): Base {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, item[k]])) as Base
}

export function valuesFor(base: Base, factor: number): Record<NutrientKey, string> {
  return Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, base[k] === null ? '' : String(round(base[k]! * factor, k))])) as Record<NutrientKey, string>
}

let nextKey = 0

export function emptyDraft(): Draft {
  return {
    key: nextKey++,
    name: '',
    amount: '',
    servings: '1',
    gramsText: null,
    base: { kcal: null, proteinG: null, carbsG: null, fatG: null, fiberG: null, sugarG: null, sodiumMg: null },
    values: { kcal: '', proteinG: '', carbsG: '', fatG: '', fiberG: '', sugarG: '', sodiumMg: '' },
    estimatedFor: null,
    estimated: false,
    origin: null,
    stale: false,
  }
}

export function draftFrom(item: FoodItem): Draft {
  const base = baseFrom(item)
  const amount = item.amount ?? ''
  return { ...emptyDraft(), name: item.name, amount, base, values: valuesFor(base, 1), origin: { amount, base } }
}

// 帶入新的營養素（AI 估算、之前查過的紀錄）：份量文字與營養素一起換掉，之後改份量就以這組為準換算
export function withEstimate(d: Draft, item: FoodItem, patch: Partial<Draft> = {}): Draft {
  const base = baseFrom(item)
  const amount = patch.amount ?? d.amount
  return withServings({ ...d, ...patch, amount, base, origin: { amount, base }, stale: false, gramsText: null }, d.servings)
}

// 修改份量文字：能從帶入時的份量換算（「1 個」→「2 個」、「200 g」→「300 g」）就依比例調整營養素；
// 清空或改回原本的份量時用原本的數值；換算不了時標記為 stale，營養素維持不變
export function withAmount(d: Draft, amount: string): Draft {
  const next = { ...d, amount, gramsText: null }
  if (!d.origin) return next
  const text = amount.trim()
  if (text === '' || text === d.origin.amount.trim()) return withServings({ ...next, base: d.origin.base, stale: false }, d.servings)
  const factor = portionFactor(d.origin.amount, text)
  if (factor === null) return { ...next, stale: true }
  const base = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, d.origin!.base[k] === null ? null : d.origin!.base[k]! * factor])) as Base
  return withServings({ ...next, base, stale: false }, d.servings)
}

export const hasMacros = (d: Draft) => MACROS.some((k) => d.values[k].trim() !== '')

export function parseNumber(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function servingsOf(d: Draft) {
  const n = parseNumber(d.servings)
  return n !== null && n > 0 ? n : 1
}

// 畫面上的數值已是實際吃下的量；份量文字依倍數調整。必填的四項留空視為 0
export function toItem(d: Draft): FoodItem {
  return {
    name: d.name.trim(),
    amount: scaleAmount(d.amount, servingsOf(d)) || null,
    kcal: parseNumber(d.values.kcal) ?? 0,
    proteinG: parseNumber(d.values.proteinG) ?? 0,
    carbsG: parseNumber(d.values.carbsG) ?? 0,
    fatG: parseNumber(d.values.fatG) ?? 0,
    fiberG: parseNumber(d.values.fiberG),
    sugarG: parseNumber(d.values.sugarG),
    sodiumMg: parseNumber(d.values.sodiumMg),
  }
}

// 調整倍數：由一份的營養素重新計算（沒有基準值的欄位維持原樣）
export function withServings(d: Draft, servings: string, gramsText: string | null = null): Draft {
  const n = parseNumber(servings)
  if (n === null || n <= 0) return { ...d, servings, gramsText }
  const scaled = valuesFor(d.base, n)
  const values = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, d.base[k] === null ? d.values[k] : scaled[k]])) as Draft['values']
  return { ...d, servings, gramsText, values }
}

// 直接修改營養素：反推回一份的值，之後調整份量才會以修改後的數值為準
export function withValue(d: Draft, key: NutrientKey, value: string): Draft {
  const v = parseNumber(value)
  // 使用者自己決定數值後，改份量就不再自動換算
  return { ...d, values: { ...d.values, [key]: value }, base: { ...d.base, [key]: v === null ? null : v / servingsOf(d) }, origin: null, stale: false }
}
