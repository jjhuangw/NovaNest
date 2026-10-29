// 飲食紀錄的資料模型，瀏覽器與伺服器共用。
import { z } from 'zod'

export const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type Meal = (typeof MEALS)[number]

export const SOURCES = ['manual', 'photo', 'label'] as const
export type Source = (typeof SOURCES)[number]

export function isMeal(value: unknown): value is Meal {
  return typeof value === 'string' && (MEALS as readonly string[]).includes(value)
}

export function isSource(value: unknown): value is Source {
  return typeof value === 'string' && (SOURCES as readonly string[]).includes(value)
}

// 依台灣時間的小時猜目前是哪一餐，作為新增時的預設值
export function mealForHour(hour: number): Meal {
  if (hour >= 4 && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}

export interface Nutrients {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  // 選填：營養標示通常有，照片估算與手動輸入可能沒有
  fiberG: number | null
  sugarG: number | null
  sodiumMg: number | null
}

export const MACROS = ['kcal', 'proteinG', 'carbsG', 'fatG'] as const
export const EXTRAS = ['fiberG', 'sugarG', 'sodiumMg'] as const
export type NutrientKey = (typeof MACROS)[number] | (typeof EXTRAS)[number]

export const UNITS: Record<NutrientKey, string> = {
  kcal: 'kcal',
  proteinG: 'g',
  carbsG: 'g',
  fatG: 'g',
  fiberG: 'g',
  sugarG: 'g',
  sodiumMg: 'mg',
}

// 一項食物的上限，用來擋掉明顯打錯的數字（例如多打一個 0）
const MAX: Record<NutrientKey, number> = {
  kcal: 5000,
  proteinG: 500,
  carbsG: 1000,
  fatG: 500,
  fiberG: 200,
  sugarG: 500,
  sodiumMg: 20000,
}

const amount = (key: NutrientKey) => z.number().finite().min(0).max(MAX[key])

export const foodItemSchema = z.object({
  name: z.string().trim().min(1).max(100),
  amount: z.string().trim().max(100).nullable(),
  kcal: amount('kcal'),
  proteinG: amount('proteinG'),
  carbsG: amount('carbsG'),
  fatG: amount('fatG'),
  fiberG: amount('fiberG').nullable(),
  sugarG: amount('sugarG').nullable(),
  sodiumMg: amount('sodiumMg').nullable(),
})

export type FoodItem = z.infer<typeof foodItemSchema>

export const MAX_ITEMS_PER_SAVE = 20

export function emptyNutrients(): Nutrients {
  return { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: null, sugarG: null, sodiumMg: null }
}

// 加總：選填欄位只要有任一項有值就加總，全部沒有時維持 null
export function sumNutrients(items: Nutrients[]): Nutrients {
  const total = emptyNutrients()
  for (const item of items) {
    for (const key of MACROS) total[key] += item[key]
    for (const key of EXTRAS) {
      const v = item[key]
      if (v !== null) total[key] = (total[key] ?? 0) + v
    }
  }
  return total
}

export function scaleNutrients<T extends Nutrients>(item: T, factor: number): T {
  const out = { ...item }
  for (const key of MACROS) out[key] = round(item[key] * factor, key)
  for (const key of EXTRAS) {
    const v = item[key]
    out[key] = v === null ? null : round(v * factor, key)
  }
  return out
}

export function round(value: number, key: NutrientKey): number {
  return key === 'kcal' || key === 'sodiumMg' ? Math.round(value) : Math.round(value * 10) / 10
}

export function formatAmount(value: number, key: NutrientKey): string {
  const v = round(value, key)
  return key === 'kcal' || key === 'sodiumMg' ? v.toLocaleString('en-US') : String(v)
}
