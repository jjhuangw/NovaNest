'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkAiLimit } from '@/lib/ai/limits'
import { limitMessage } from '@/lib/ai/limit-message'
import { getSession } from '@/lib/auth/session'
import { getI18n, getLocale } from '@/lib/i18n/server'
import { generateGuide, getGuides, guideKey, type ExerciseGuide } from '@/lib/training/exercise-guide'
import { getActivePlan, saveEditedPlan } from '@/lib/training/plan-store'
import { isDayKey } from '@/lib/training/plan'
import { trainingPlanSchema } from '@/lib/training/plan-schema'
import { normalizeExerciseName } from '@/lib/training/exercise-catalog'
import { translatePlan } from '@/lib/training/plan-translation'

// 把目前的 AI 課表翻成使用者目前的語系；翻譯會存起來，之後切換語言直接使用
export async function translatePlanAction() {
  const session = await getSession()
  if (!session) redirect('/login')
  const [active, locale] = await Promise.all([getActivePlan(session.userId), getLocale()])
  if (!active.id || active.locale === locale || active.translation) redirect('/training')

  const limit = await checkAiLimit(session, 'plan_translate')
  if (!limit.ok) redirect(`/training?translate=limit_${limit.reason}${limit.plan === 'free' ? '&plan=free' : ''}`)

  const result = await translatePlan({ userId: session.userId, planId: active.id, plan: active.plan, to: locale })
  if (!result.ok) redirect(`/training?translate=${result.reason}`)
  revalidatePath('/', 'layout')
  redirect('/training')
}

export type GuideActionResult = { ok: true; guide: ExerciseGuide } | { ok: false; error: string }

// 打開動作說明時呼叫：已經有人產生過就直接回傳，否則用 AI 產生並保存給所有人共用。
// 只接受目前課表上的動作，避免被拿來產生任意內容。
export async function exerciseGuideAction(name: string): Promise<GuideActionResult> {
  const session = await getSession()
  const { t, locale } = await getI18n()
  const tg = t.training.guide
  if (!session) return { ok: false, error: tg.failed }
  const active = await getActivePlan(session.userId)
  const exercise = active.plan.days.flatMap((d) => d.exercises).find((e) => e.name === name)
  if (!exercise) return { ok: false, error: tg.failed }

  const existing = (await getGuides([name], locale)).get(guideKey(name))
  if (existing) return { ok: true, guide: existing }

  const limit = await checkAiLimit(session, 'exercise_guide')
  if (!limit.ok) return { ok: false, error: limitMessage(t, limit, t.aiLimit.features.exercise_guide) }
  const result = await generateGuide({ userId: session.userId, name, cue: exercise.cue, locale })
  if (!result.ok) return { ok: false, error: result.reason === 'unconfigured' ? tg.unavailable : tg.failed }
  return { ok: true, guide: result.guide }
}

export type ReplaceExerciseResult = { ok: true } | { ok: false; error: string }

// 在課表頁永久替換一個動作：組數、次數、休息時間與肌群沿用原本的設定，原本的動作變成「替代動作」，
// 感受提示是針對原本動作寫的，一併移除。存成新版本的課表，過去的紀錄不變。
export async function replaceExerciseAction(input: { day: string; exerciseIndex: number; from: string; name: string }): Promise<ReplaceExerciseResult> {
  const session = await getSession()
  if (!session) redirect('/login')
  const { t } = await getI18n()
  const errors = t.training.swapErrors

  const active = await getActivePlan(session.userId)
  if (!active.generated || !active.id) return { ok: false, error: errors.notGenerated }
  if (!isDayKey(input?.day) || !Number.isInteger(input.exerciseIndex)) return { ok: false, error: errors.failed }
  const day = active.plan.days.find((d) => d.day === input.day)
  const exercise = day?.exercises[input.exerciseIndex]
  // 畫面上的課表已經不是最新的（例如在其他分頁改過）時不套用，避免換錯動作
  if (!day || !exercise || exercise.name !== input.from) return { ok: false, error: errors.stale }

  const name = typeof input.name === 'string' ? input.name.trim().replace(/\s+/g, ' ') : ''
  if (!name) return { ok: false, error: errors.empty }
  if (name.length > MAX_PLAN_NAME) return { ok: false, error: errors.tooLong }
  const key = normalizeExerciseName(name)
  if (key === normalizeExerciseName(exercise.name)) return { ok: false, error: errors.same }
  if (day.exercises.some((e, i) => i !== input.exerciseIndex && normalizeExerciseName(e.name) === key)) {
    return { ok: false, error: errors.duplicate }
  }

  const plan = structuredClone(active.plan)
  const target = plan.days.find((d) => d.day === input.day)!.exercises
  const updated = { ...target[input.exerciseIndex], name, substitute: exercise.name.slice(0, 120) }
  delete updated.cue
  target[input.exerciseIndex] = updated
  const parsed = trainingPlanSchema.safeParse(plan)
  if (!parsed.success) return { ok: false, error: errors.failed }

  try {
    await saveEditedPlan({ userId: session.userId, fromPlanId: active.id, plan: parsed.data })
  } catch (e) {
    console.error('Replacing plan exercise failed', e)
    return { ok: false, error: errors.failed }
  }
  revalidatePath('/training')
  revalidatePath('/training/log')
  return { ok: true }
}

// 課表上動作名稱的長度上限（同 plan-schema.ts）
const MAX_PLAN_NAME = 80
