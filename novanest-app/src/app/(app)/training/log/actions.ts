'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { plannedSetsFor } from '@/lib/training/completion'
import { dayKeyOf, isISODate, todayISO } from '@/lib/training/dates'
import { saveWorkoutLog, type LoggedSet } from '@/lib/training/logs'
import { mockPlan } from '@/lib/training/plan'

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
  const day = mockPlan.days.find((d) => d.day === dayKey)!
  if (day.exercises.length === 0) {
    throw new Error('Cannot log a rest day')
  }

  // 欄位名稱：reps-{動作索引}-{第幾組}、weight-{動作索引}-{第幾組}
  const sets: LoggedSet[] = []
  day.exercises.forEach((exercise, exerciseIndex) => {
    for (let setNumber = 1; setNumber <= exercise.sets; setNumber++) {
      const reps = parseNumber(formData.get(`reps-${exerciseIndex}-${setNumber}`), { integer: true })
      if (!reps) continue
      const weightKg = parseNumber(formData.get(`weight-${exerciseIndex}-${setNumber}`), { integer: false })
      sets.push({ exerciseIndex, exerciseName: exercise.name, setNumber, weightKg, reps })
    }
  })

  const notes = formData.get('notes')
  await saveWorkoutLog({
    userId: session.userId,
    date,
    planDay: dayKey,
    plannedSets: plannedSetsFor(mockPlan, dayKey),
    notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 2000) : null,
    sets,
  })

  redirect(`/training/log?date=${date}&saved=${Date.now()}`)
}
