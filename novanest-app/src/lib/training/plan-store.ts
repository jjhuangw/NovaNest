import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { trainingPlans } from '@/lib/db/schema'
import type { Locale } from '@/lib/i18n/config'
import { mockPlan, type TrainingPlan } from './plan'
import { trainingPlanSchema } from './plan-schema'

export interface ActivePlan {
  plan: TrainingPlan
  // false 代表還沒有 AI 課表，使用範例課表
  generated: boolean
  createdAt: Date | null
}

// 使用者最新的 AI 課表；沒有或格式不符時退回範例課表
export async function getActivePlan(userId: string): Promise<ActivePlan> {
  const row = await db.query.trainingPlans.findFirst({
    where: eq(trainingPlans.userId, userId),
    orderBy: desc(trainingPlans.createdAt),
  })
  if (row) {
    const parsed = trainingPlanSchema.safeParse(row.plan)
    if (parsed.success) return { plan: parsed.data, generated: true, createdAt: row.createdAt }
    console.error('Stored training plan failed validation', row.id)
  }
  return { plan: mockPlan, generated: false, createdAt: null }
}

export async function savePlan(userId: string, plan: TrainingPlan, locale: Locale, model: string) {
  await db.insert(trainingPlans).values({ userId, plan, locale, model })
}
