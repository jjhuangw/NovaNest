import 'server-only'
import { and, asc, between, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { foodEntries } from '@/lib/db/schema'
import { isMeal, type FoodItem, type Meal, type Nutrients, type Source } from './nutrients'

export interface EntryView extends Nutrients {
  id: string
  meal: Meal
  source: Source
  name: string
  amount: string | null
}

const num = (v: string | null) => (v === null ? null : Number(v))
const str = (v: number | null) => (v === null ? null : String(v))

export async function listEntries(userId: string, date: string): Promise<EntryView[]> {
  const rows = await db
    .select()
    .from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), eq(foodEntries.date, date)))
    .orderBy(asc(foodEntries.createdAt))
  return rows.map((r) => ({
    id: r.id,
    meal: isMeal(r.meal) ? r.meal : 'snack',
    source: r.source as Source,
    name: r.name,
    amount: r.amount,
    kcal: Number(r.kcal),
    proteinG: Number(r.proteinG),
    carbsG: Number(r.carbsG),
    fatG: Number(r.fatG),
    fiberG: num(r.fiberG),
    sugarG: num(r.sugarG),
    sodiumMg: num(r.sodiumMg),
  }))
}

// 各日加總；沒有任何紀錄的日期不會出現在結果中
export async function dailyTotals(userId: string, from: string, to: string): Promise<Map<string, Nutrients>> {
  const rows = await db
    .select({
      date: foodEntries.date,
      kcal: sql<string>`sum(${foodEntries.kcal})`,
      proteinG: sql<string>`sum(${foodEntries.proteinG})`,
      carbsG: sql<string>`sum(${foodEntries.carbsG})`,
      fatG: sql<string>`sum(${foodEntries.fatG})`,
      // sum 會略過 null，全部為 null 時結果才是 null
      fiberG: sql<string | null>`sum(${foodEntries.fiberG})`,
      sugarG: sql<string | null>`sum(${foodEntries.sugarG})`,
      sodiumMg: sql<string | null>`sum(${foodEntries.sodiumMg})`,
    })
    .from(foodEntries)
    .where(and(eq(foodEntries.userId, userId), between(foodEntries.date, from, to)))
    .groupBy(foodEntries.date)

  return new Map(
    rows.map((r) => [
      r.date,
      {
        kcal: Number(r.kcal),
        proteinG: Number(r.proteinG),
        carbsG: Number(r.carbsG),
        fatG: Number(r.fatG),
        fiberG: num(r.fiberG),
        sugarG: num(r.sugarG),
        sodiumMg: num(r.sodiumMg),
      },
    ]),
  )
}

export async function addEntries(input: { userId: string; date: string; meal: Meal; source: Source; items: FoodItem[] }) {
  if (input.items.length === 0) return
  await db.insert(foodEntries).values(
    input.items.map((item) => ({
      userId: input.userId,
      date: input.date,
      meal: input.meal,
      source: input.source,
      name: item.name,
      amount: item.amount,
      kcal: String(item.kcal),
      proteinG: String(item.proteinG),
      carbsG: String(item.carbsG),
      fatG: String(item.fatG),
      fiberG: str(item.fiberG),
      sugarG: str(item.sugarG),
      sodiumMg: str(item.sodiumMg),
    })),
  )
}

// 只刪除屬於該使用者的紀錄
export async function deleteEntry(userId: string, id: string) {
  await db.delete(foodEntries).where(and(eq(foodEntries.id, id), eq(foodEntries.userId, userId)))
}
