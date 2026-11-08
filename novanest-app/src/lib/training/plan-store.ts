import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { planTranslations, trainingPlans } from '@/lib/db/schema'
import { isLocale, type Locale } from '@/lib/i18n/config'
import { getLocale } from '@/lib/i18n/server'
import { mockPlan, type TrainingPlan } from './plan'
import type { PlanText } from './plan-copy'
import { trainingPlanSchema } from './plan-schema'
import { parsePlanText } from './plan-translation'

export interface ActivePlan {
  plan: TrainingPlan
  // false 代表還沒有 AI 課表，使用範例課表
  generated: boolean
  createdAt: Date | null
  id: string | null
  // 課表文字的語言；範例課表兩種語言都有，為 null
  locale: Locale | null
  // 課表語言與目前語系不同時，目前語系的翻譯（還沒翻譯時為 null）
  translation: PlanText | null
}

// 使用者最新的 AI 課表與目前語系的翻譯（同一次查詢）；沒有或格式不符時退回範例課表
export async function getActivePlan(userId: string): Promise<ActivePlan> {
  const locale = await getLocale()
  const row = await latestPlanRow(userId, locale)
  if (row) {
    const parsed = trainingPlanSchema.safeParse(row.plan)
    if (parsed.success) {
      const planLocale = isLocale(row.locale) ? row.locale : null
      return {
        plan: parsed.data,
        generated: true,
        createdAt: row.createdAt,
        id: row.id,
        locale: planLocale,
        translation: planLocale !== locale && row.translation ? parsePlanText(row.translation) : null,
      }
    }
    console.error('Stored training plan failed validation', row.id)
  }
  return { plan: mockPlan, generated: false, createdAt: null, id: null, locale: null, translation: null }
}

async function latestPlanRow(userId: string, locale: Locale) {
  try {
    const [row] = await db
      .select({
        id: trainingPlans.id,
        plan: trainingPlans.plan,
        locale: trainingPlans.locale,
        createdAt: trainingPlans.createdAt,
        translation: planTranslations.text,
      })
      .from(trainingPlans)
      .leftJoin(planTranslations, and(eq(planTranslations.planId, trainingPlans.id), eq(planTranslations.locale, locale)))
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1)
    return row
  } catch (e) {
    // 還沒建立翻譯資料表（尚未執行 0003_plan_translations.sql）：照常顯示課表，只是沒有翻譯
    const err = e as { code?: string; cause?: { code?: string } }
    if ((err.code ?? err.cause?.code) !== '42P01') throw e
    const [row] = await db
      .select({ id: trainingPlans.id, plan: trainingPlans.plan, locale: trainingPlans.locale, createdAt: trainingPlans.createdAt })
      .from(trainingPlans)
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1)
    return row ? { ...row, translation: null } : undefined
  }
}

export async function savePlan(userId: string, plan: TrainingPlan, locale: Locale, model: string) {
  await db.insert(trainingPlans).values({ userId, plan, locale, model })
}
