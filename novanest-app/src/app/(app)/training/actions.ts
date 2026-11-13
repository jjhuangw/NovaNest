'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkAiLimit } from '@/lib/ai/limits'
import { limitMessage } from '@/lib/ai/limit-message'
import { getSession } from '@/lib/auth/session'
import { getI18n, getLocale } from '@/lib/i18n/server'
import { generateGuide, getGuides, guideKey, type ExerciseGuide } from '@/lib/training/exercise-guide'
import { getActivePlan } from '@/lib/training/plan-store'
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
