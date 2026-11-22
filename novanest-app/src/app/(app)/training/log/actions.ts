'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { plannedSetsFor } from '@/lib/training/completion'
import { dayKeyOf, isISODate, todayISO } from '@/lib/training/dates'
import { saveWorkoutLog, type LoggedSet } from '@/lib/training/logs'
import { getActivePlan } from '@/lib/training/plan-store'
import { checkAiLimit } from '@/lib/ai/limits'
import { limitMessage } from '@/lib/ai/limit-message'
import { getI18n } from '@/lib/i18n/server'
import { findSwaps, generateSwaps, parseEquipment, type SwapOption } from '@/lib/training/exercise-swap'

const MAX_SWAP_LENGTH = 120

function parseNumber(value: FormDataEntryValue | null, { integer }: { integer: boolean }): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 1000) return null
  return integer ? Math.round(n) : Math.round(n * 100) / 100
}

export async function saveWorkoutLogAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const date = formData.get('date')
  if (!isISODate(date) || date > todayISO()) {
    throw new Error('Invalid date')
  }

  const dayKey = dayKeyOf(date)
  const { plan } = await getActivePlan(session.userId)
  const day = plan.days.find((d) => d.day === dayKey)!
  if (day.exercises.length === 0) {
    throw new Error('Cannot log a rest day')
  }

  // 欄位名稱：reps-{動作索引}-{第幾組}、weight-{動作索引}-{第幾組}、swap-{動作索引}
  const sets: LoggedSet[] = []
  day.exercises.forEach((exercise, exerciseIndex) => {
    // 當天換成其他動作時，這個動作的各組記在使用者輸入的名稱下；課表本身不變
    const swap = formData.get(`swap-${exerciseIndex}`)
    const swapName = typeof swap === 'string' ? swap.trim().replace(/\s+/g, ' ').slice(0, MAX_SWAP_LENGTH) : ''
    const exerciseName = swapName || exercise.name
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
      const reps = parseNumber(formData.get(`reps-${exerciseIndex}-${setNumber}`), { integer: true })
      if (!reps) continue
      const weightKg = parseNumber(formData.get(`weight-${exerciseIndex}-${setNumber}`), { integer: false })
      sets.push({ exerciseIndex, exerciseName, setNumber, weightKg, reps })
    }
  })

  const notes = formData.get('notes')
  await saveWorkoutLog({
    userId: session.userId,
    date,
    planDay: dayKey,
    plannedSets: plannedSetsFor(plan, dayKey),
    notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 2000) : null,
    sets,
  })

  redirect(`/training/log?date=${date}&saved=${Date.now()}`)
}

export type SwapActionResult = { ok: true; options: SwapOption[] } | { ok: false; error: string }

// 依手邊的器材建議替代動作：之前查過同一個動作與器材（或器材是這次的子集合）就直接使用，否則用 AI 建議並保存給所有人共用。
// 只接受當天課表上的動作，避免被拿來產生任意內容。
export async function suggestSwapAction(input: { date: string; exerciseIndex: number; equipment: string }): Promise<SwapActionResult> {
  const session = await getSession()
  if (!session) redirect('/login')
  const { t, locale } = await getI18n()
  const errors = t.log.swapErrors

  if (!isISODate(input?.date) || !Number.isInteger(input.exerciseIndex)) return { ok: false, error: errors.failed }
  const { plan } = await getActivePlan(session.userId)
  const exercise = plan.days.find((d) => d.day === dayKeyOf(input.date))?.exercises[input.exerciseIndex]
  if (!exercise) return { ok: false, error: errors.failed }
  const equipment = parseEquipment(typeof input.equipment === 'string' ? input.equipment.slice(0, 300) : '')

  const known = await findSwaps(exercise.name, equipment, locale)
  if (known) return { ok: true, options: known }

  const limit = await checkAiLimit(session, 'exercise_swap')
  if (!limit.ok) return { ok: false, error: limitMessage(t, limit, t.aiLimit.features.exercise_swap) }
  const result = await generateSwaps({ userId: session.userId, exercise, equipment, locale })
  if (!result.ok) return { ok: false, error: errors[result.reason] }
  return result
}
