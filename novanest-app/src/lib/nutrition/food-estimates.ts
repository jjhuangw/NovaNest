import 'server-only'
import { and, desc, eq, like, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { foodEstimates } from '@/lib/db/schema'
import type { Locale } from '@/lib/i18n/config'
import { foodItemSchema, scaleNutrients, type FoodItem } from './nutrients'
import { portionFactor } from './portion'

// 以名稱估算食物時的共用紀錄：先查這裡，查不到才呼叫 AI，結果再存回來給所有使用者共用。

// 大小寫、全形半形與空白不同視為同一個名稱（「雞腿 便當」＝「雞腿便當」）
export function estimateKey(text: string | null): string {
  if (!text) return ''
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, '').slice(0, 100)
}

function isMissingTable(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } }
  return (err.code ?? err.cause?.code) === '42P01'
}

type Row = { amountKey: string; item: FoodItem }

function parseRows(rows: { amountKey: string; item: unknown }[]): Row[] {
  const out: Row[] = []
  for (const r of rows) {
    const parsed = foodItemSchema.safeParse(r.item)
    if (parsed.success) out.push({ amountKey: r.amountKey, item: parsed.data })
  }
  return out
}

// 依序嘗試：相同份量 → 沒有填份量時用最常被使用的那筆 → 由同名稱的紀錄依份量換算（「1 個，約 200 g」→「300 g」）。
// 都對不上時回傳 null，由 AI 估算。
export async function findFoodEstimate(input: { name: string; amount: string | null; locale: Locale }): Promise<FoodItem | null> {
  const nameKey = estimateKey(input.name)
  const amountKey = estimateKey(input.amount)
  let rows: Row[]
  try {
    rows = parseRows(
      await db
        .select({ amountKey: foodEstimates.amountKey, item: foodEstimates.item })
        .from(foodEstimates)
        .where(and(eq(foodEstimates.nameKey, nameKey), eq(foodEstimates.locale, input.locale)))
        // 沒有填份量的那筆（一般的一份）排最前面，其次是最常被使用的
        .orderBy(sql`${foodEstimates.amountKey} = '' desc`, desc(foodEstimates.hits))
        .limit(20),
    )
  } catch (e) {
    // 資料表還不存在（尚未執行 0008_food_estimates.sql）時當作沒有紀錄
    if (!isMissingTable(e)) throw e
    return null
  }

  const exact = rows.find((r) => r.amountKey === amountKey) ?? (amountKey === '' ? rows[0] : undefined)
  if (exact) {
    countHit(nameKey, exact.amountKey, input.locale)
    return exact.item
  }

  for (const r of rows) {
    const factor = portionFactor(r.item.amount, input.amount!)
    if (factor === null) continue
    countHit(nameKey, r.amountKey, input.locale)
    return { ...scaleNutrients(r.item, factor), amount: input.amount!.trim().slice(0, 100) }
  }
  return null
}

// 次數只是參考用，更新失敗不影響回傳
function countHit(nameKey: string, amountKey: string, locale: Locale) {
  db.update(foodEstimates)
    .set({ hits: sql`${foodEstimates.hits} + 1` })
    .where(and(eq(foodEstimates.nameKey, nameKey), eq(foodEstimates.amountKey, amountKey), eq(foodEstimates.locale, locale)))
    .catch((e) => console.error('Counting food estimate hit failed', e))
}

export const MAX_SUGGESTIONS = 6

// 輸入名稱時的建議：名稱包含輸入文字的紀錄，同一個名稱只列一筆（優先用沒有填份量的那筆），開頭相同的排前面
export async function searchFoodEstimates(input: { query: string; locale: Locale }): Promise<FoodItem[]> {
  const q = estimateKey(input.query)
  if (!q) return []
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  let rows: { nameKey: string; amountKey: string; item: unknown }[]
  try {
    rows = await db
      .select({ nameKey: foodEstimates.nameKey, amountKey: foodEstimates.amountKey, item: foodEstimates.item })
      .from(foodEstimates)
      .where(and(eq(foodEstimates.locale, input.locale), like(foodEstimates.nameKey, pattern)))
      .orderBy(sql`starts_with(${foodEstimates.nameKey}, ${q}) desc`, sql`${foodEstimates.amountKey} = '' desc`, desc(foodEstimates.hits))
      .limit(40)
  } catch (e) {
    if (!isMissingTable(e)) throw e
    return []
  }

  const seen = new Set<string>()
  const out: FoodItem[] = []
  for (const r of rows) {
    if (seen.has(r.nameKey)) continue
    const parsed = foodItemSchema.safeParse(r.item)
    if (!parsed.success) continue
    seen.add(r.nameKey)
    out.push(parsed.data)
    if (out.length === MAX_SUGGESTIONS) break
  }
  return out
}

export async function saveFoodEstimate(input: {
  name: string
  amount: string | null
  locale: Locale
  item: FoodItem
  model: string
  userId: string
}) {
  try {
    // 兩個人同時查同一個食物時，保留先存進去的那一份
    await db
      .insert(foodEstimates)
      .values({
        nameKey: estimateKey(input.name),
        amountKey: estimateKey(input.amount),
        locale: input.locale,
        item: input.item,
        model: input.model,
        createdBy: input.userId,
      })
      .onConflictDoNothing()
  } catch (e) {
    // 存不進去時仍然把這次的結果給使用者，只是下次會再呼叫 AI
    if (!isMissingTable(e)) console.error('Saving food estimate failed', e)
  }
}
