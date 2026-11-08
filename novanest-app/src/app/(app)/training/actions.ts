'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { checkAiLimit } from '@/lib/ai/limits'
import { getSession } from '@/lib/auth/session'
import { getLocale } from '@/lib/i18n/server'
import { getActivePlan } from '@/lib/training/plan-store'
import { translatePlan } from '@/lib/training/plan-translation'

// 把目前的 AI 課表翻成使用者目前的語系；翻譯會存起來，之後切換語言直接使用
export async function translatePlanAction() {
  const session = await getSession()
  if (!session) redirect('/login')
  const [active, locale] = await Promise.all([getActivePlan(session.userId), getLocale()])
  if (!active.id || active.locale === locale || active.translation) redirect('/training')

  const limit = await checkAiLimit(session, 'plan_translate')
  if (!limit.ok) redirect(`/training?translate=limit_${limit.reason}`)

  const result = await translatePlan({ userId: session.userId, planId: active.id, plan: active.plan, to: locale })
  if (!result.ok) redirect(`/training?translate=${result.reason}`)
  revalidatePath('/', 'layout')
  redirect('/training')
}
