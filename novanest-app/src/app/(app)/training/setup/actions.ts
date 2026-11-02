'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getLocale } from '@/lib/i18n/server'
import { todayISO } from '@/lib/training/dates'
import { generatePlan, PLAN_MODEL } from '@/lib/training/generate'
import { savePlan } from '@/lib/training/plan-store'
import { CURRENT_SHAPES, findShape, questionnaireSchema, TARGET_SHAPES } from '@/lib/training/questionnaire'
import { getQuestionnaire, saveQuestionnaire } from '@/lib/training/questionnaire-store'
import { BODY_LIMITS, getBodyData, isGender, saveBodyData, setGender } from '@/lib/user/profile'

export interface SetupPayload {
  answers: unknown
  profile: { gender: unknown; heightCm: number | null; weightKg: number | null; birthYear: number | null }
}

export type SetupError = 'profile' | 'invalid' | 'failed'

function inRange(n: number | null, min: number, max: number) {
  return n === null || (Number.isFinite(n) && n >= min && n <= max)
}

// 問卷與基本資料一起儲存，接著產生課表。產生失敗時答案仍會保留，可在摘要頁重試。
export async function saveSetupAction(payload: SetupPayload): Promise<{ error: SetupError }> {
  const session = await getSession()
  if (!session) redirect('/login')

  const { gender, heightCm, weightKg, birthYear } = payload.profile
  const thisYear = Number(todayISO().slice(0, 4))
  // 身高與體重是排課表與計算熱量的必要資料
  if (
    !isGender(gender) ||
    heightCm === null ||
    weightKg === null ||
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
        heightCm: Math.round(heightCm * 10) / 10,
        weightKg: Math.round(weightKg * 10) / 10,
        birthYear: birthYear === null ? null : Math.round(birthYear),
      },
      current,
    )
    await saveQuestionnaire(session.userId, answers)
  } catch (e) {
    console.error('Saving plan questionnaire failed', e)
    return { error: 'failed' }
  }

  redirect(await generateFor(session.userId))
}

// 摘要頁的「產生課表／重新產生」
export async function generatePlanAction() {
  const session = await getSession()
  if (!session) redirect('/login')
  redirect(await generateFor(session.userId))
}

// 依已存的問卷產生課表，回傳接下來要去的網址
async function generateFor(userId: string): Promise<string> {
  const [saved, body, locale] = await Promise.all([getQuestionnaire(userId), getBodyData(userId), getLocale()])
  if (!saved || !body.gender || body.heightCm === null || body.weightKg === null) return '/training/setup?edit=1'

  const thisYear = Number(todayISO().slice(0, 4))
  const result = await generatePlan(
    saved.answers,
    {
      gender: body.gender,
      heightCm: body.heightCm,
      weightKg: body.weightKg,
      age: body.birthYear === null ? null : thisYear - body.birthYear,
    },
    locale,
  )
  if (!result.ok) return `/training/setup?error=${result.reason}`

  try {
    await savePlan(userId, result.plan, locale, PLAN_MODEL)
  } catch (e) {
    console.error('Saving generated plan failed', e)
    return '/training/setup?error=failed'
  }
  return `/training?generated=${Date.now()}`
}
