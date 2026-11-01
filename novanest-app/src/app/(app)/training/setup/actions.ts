'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { todayISO } from '@/lib/training/dates'
import { CURRENT_SHAPES, findShape, questionnaireSchema, TARGET_SHAPES } from '@/lib/training/questionnaire'
import { saveQuestionnaire } from '@/lib/training/questionnaire-store'
import { BODY_LIMITS, getBodyData, isGender, saveBodyData, setGender } from '@/lib/user/profile'

export interface SetupPayload {
  answers: unknown
  profile: { gender: unknown; heightCm: number | null; weightKg: number | null; birthYear: number | null }
}

export type SetupError = 'profile' | 'invalid' | 'failed'

function inRange(n: number | null, min: number, max: number) {
  return n === null || (Number.isFinite(n) && n >= min && n <= max)
}

// 問卷與基本資料一起儲存；成功後回到問卷頁顯示摘要
export async function saveSetupAction(payload: SetupPayload): Promise<{ error: SetupError }> {
  const session = await getSession()
  if (!session) redirect('/login')

  const { gender, heightCm, weightKg, birthYear } = payload.profile
  const thisYear = Number(todayISO().slice(0, 4))
  if (
    !isGender(gender) ||
    !inRange(heightCm, BODY_LIMITS.heightCm.min, BODY_LIMITS.heightCm.max) ||
    !inRange(weightKg, BODY_LIMITS.weightKg.min, BODY_LIMITS.weightKg.max) ||
    !inRange(birthYear, BODY_LIMITS.birthYear.min, thisYear - 10)
  ) {
    return { error: 'profile' }
  }

  const parsed = questionnaireSchema.safeParse(payload.answers)
  if (!parsed.success) return { error: 'invalid' }
  const answers = parsed.data
  // 體態代號必須屬於該性別；器材只在居家時有意義
  if (answers.currentShape !== null && !findShape(CURRENT_SHAPES[gender], answers.currentShape)) return { error: 'invalid' }
  if (answers.targetShape !== null && !findShape(TARGET_SHAPES[gender], answers.targetShape)) return { error: 'invalid' }
  if (answers.venue !== 'home') answers.equipment = []

  try {
    const current = await getBodyData(session.userId)
    await setGender(session.userId, gender)
    await saveBodyData(
      session.userId,
      {
        heightCm: heightCm === null ? null : Math.round(heightCm * 10) / 10,
        weightKg: weightKg === null ? null : Math.round(weightKg * 10) / 10,
        birthYear: birthYear === null ? null : Math.round(birthYear),
      },
      current,
    )
    await saveQuestionnaire(session.userId, answers)
  } catch (e) {
    console.error('Saving plan questionnaire failed', e)
    return { error: 'failed' }
  }

  redirect('/training/setup')
}
