import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { planQuestionnaires } from '@/lib/db/schema'
import { questionnaireSchema, type Questionnaire } from './questionnaire'

export interface SavedQuestionnaire {
  answers: Questionnaire
  updatedAt: Date
}

// 格式不符（例如選項改版）時視為尚未填寫
export async function getQuestionnaire(userId: string): Promise<SavedQuestionnaire | null> {
  const row = await db.query.planQuestionnaires.findFirst({ where: eq(planQuestionnaires.userId, userId) })
  if (!row) return null
  const parsed = questionnaireSchema.safeParse(row.answers)
  return parsed.success ? { answers: parsed.data, updatedAt: row.updatedAt } : null
}

export async function saveQuestionnaire(userId: string, answers: Questionnaire) {
  const updatedAt = new Date()
  await db
    .insert(planQuestionnaires)
    .values({ userId, answers, updatedAt })
    .onConflictDoUpdate({ target: planQuestionnaires.userId, set: { answers, updatedAt } })
}
