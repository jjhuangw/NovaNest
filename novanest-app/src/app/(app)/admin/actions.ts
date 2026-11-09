'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/session'
import { deleteUser, setUserDisabled, setUserPlan, setUserRole } from '@/lib/admin/users'
import { aiLimitsSchema, LIMIT_GROUPS, saveAiLimits } from '@/lib/ai/limits'
import { isPlan, type Plan } from '@/lib/user/plan'
import { isISODate } from '@/lib/training/dates'

const UUID = /^[0-9a-f-]{36}$/i

// 取得要操作的使用者 id；不能對自己操作，避免管理員把自己鎖在外面
async function target(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) notFound()
  const id = formData.get('id')
  if (typeof id !== 'string' || !UUID.test(id) || id === admin.userId) notFound()
  return id
}

function done(id: string) {
  revalidatePath('/admin', 'layout')
  redirect(`/admin/users/${id}?saved=${Date.now()}`)
}

export async function setDisabledAction(formData: FormData) {
  const id = await target(formData)
  await setUserDisabled(id, formData.get('disabled') === '1')
  done(id)
}

export async function setRoleAction(formData: FormData) {
  const id = await target(formData)
  await setUserRole(id, formData.get('role') === 'admin' ? 'admin' : 'user')
  done(id)
}

export async function deleteUserAction(formData: FormData) {
  const id = await target(formData)
  await deleteUser(id)
  revalidatePath('/admin', 'layout')
  redirect(`/admin/users?deleted=${Date.now()}`)
}

// AI 使用上限：表單的每個欄位都要是範圍內的整數，否則整份不儲存
export async function saveAiLimitsAction(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) notFound()
  const days = String(formData.get('days') ?? '30').replace(/[^0-9]/g, '') || '30'
  const int = (name: string) => {
    const v = formData.get(name)
    return typeof v === 'string' && /^\d+$/.test(v.trim()) ? Number(v) : NaN
  }
  const tier = (plan: Plan) => ({
    ...Object.fromEntries(LIMIT_GROUPS.map((g) => [g, { count: int(`${plan}.${g}.count`), period: formData.get(`${plan}.${g}.period`) }])),
    photos: int(`${plan}.photos`),
  })
  const parsed = aiLimitsSchema.safeParse({
    tiers: { free: tier('free'), pro: tier('pro') },
    burst: { calls: int('burst.calls'), minutes: int('burst.minutes') },
    globalDaily: int('globalDaily'),
  })
  if (!parsed.success) redirect(`/admin/ai-usage?days=${days}&limitsError=1`)
  try {
    await saveAiLimits(parsed.data, admin.userId)
  } catch (e) {
    // 還沒建立設定資料表（0004_app_settings.sql）
    const err = e as { code?: string; cause?: { code?: string } }
    if ((err.code ?? err.cause?.code) !== '42P01') throw e
    redirect(`/admin/ai-usage?days=${days}&limitsError=table`)
  }
  revalidatePath('/admin/ai-usage')
  redirect(`/admin/ai-usage?days=${days}&limitsSaved=${Date.now()}`)
}

// 方案：可以設定任何人（包含自己）；Pro 的到期日為該日台灣時間 23:59:59，留空表示不到期
export async function setPlanAction(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) notFound()
  const id = formData.get('id')
  const plan = formData.get('plan')
  const until = formData.get('proUntil')
  if (typeof id !== 'string' || !UUID.test(id) || !isPlan(plan)) notFound()
  let proUntil: Date | null = null
  if (plan === 'pro' && typeof until === 'string' && until !== '') {
    if (!isISODate(until)) redirect(`/admin/users/${id}?planError=1`)
    proUntil = new Date(`${until}T23:59:59+08:00`)
  }
  await setUserPlan(id, plan, proUntil)
  revalidatePath('/admin', 'layout')
  redirect(`/admin/users/${id}?saved=${Date.now()}`)
}
