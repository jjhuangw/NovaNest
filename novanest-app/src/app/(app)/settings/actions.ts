'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { todayISO } from '@/lib/training/dates'
import { BODY_LIMITS, getBodyData, isGender, saveBodyData, setGender } from '@/lib/user/profile'

// 空白代表不填；超出範圍時整份不儲存並顯示錯誤
function parseOptional(value: FormDataEntryValue | null, min: number, max: number, decimals: number): number | null | 'invalid' {
  if (typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < min || n > max) return 'invalid'
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

// 性別與身體資料一起儲存；任一欄位不合法時都不儲存
export async function updateProfileAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const gender = formData.get('gender')
  const thisYear = Number(todayISO().slice(0, 4))
  const heightCm = parseOptional(formData.get('heightCm'), BODY_LIMITS.heightCm.min, BODY_LIMITS.heightCm.max, 1)
  const weightKg = parseOptional(formData.get('weightKg'), BODY_LIMITS.weightKg.min, BODY_LIMITS.weightKg.max, 1)
  const birthYear = parseOptional(formData.get('birthYear'), BODY_LIMITS.birthYear.min, thisYear - 10, 0)
  if (heightCm === 'invalid' || weightKg === 'invalid' || birthYear === 'invalid') {
    redirect('/settings?error=body')
  }

  const current = await getBodyData(session.userId)
  await setGender(session.userId, isGender(gender) ? gender : null)
  await saveBodyData(session.userId, { heightCm, weightKg, birthYear }, current)

  redirect(`/settings?saved=${Date.now()}`)
}
