import 'server-only'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { foodEstimates } from '@/lib/db/schema'
import type { Locale } from '@/lib/i18n/config'
import { foodItemSchema, type FoodItem } from './nutrients'

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

export async function findFoodEstimate(input: { name: string; amount: string | null; locale: Locale }): Promise<FoodItem | null> {
  const where = and(
    eq(foodEstimates.nameKey, estimateKey(input.name)),
    eq(foodEstimates.amountKey, estimateKey(input.amount)),
    eq(foodEstimates.locale, input.locale),
  )
  try {
    const [row] = await db.select({ item: foodEstimates.item }).from(foodEstimates).where(where).limit(1)
    const parsed = row ? foodItemSchema.safeParse(row.item) : null
    if (!parsed?.success) return null
    // 次數只是參考用，更新失敗不影響回傳
    db.update(foodEstimates)
      .set({ hits: sql`${foodEstimates.hits} + 1` })
      .where(where)
      .catch((e) => console.error('Counting food estimate hit failed', e))
    return parsed.data
  } catch (e) {
    // 資料表還不存在（尚未執行 0008_food_estimates.sql）時當作沒有紀錄
    if (!isMissingTable(e)) throw e
    return null
  }
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
