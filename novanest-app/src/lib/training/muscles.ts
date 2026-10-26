import type { DayCompletion } from './completion'
import { MUSCLES, type Muscle, type TrainingPlan } from './plan'

// good：跟上進度；warning：接近；critical：不足；upcoming：本週還沒排到
export type MuscleStatus = 'good' | 'warning' | 'critical' | 'upcoming'

export interface MuscleVolume {
  muscle: Muscle
  // 本週課表的總組數（加權）
  weekTarget: number
  // 到目前為止應完成的組數（只計算已開始追蹤且不在未來的訓練日）
  due: number
  completed: number
  // completed / weekTarget，0–1
  weekRate: number
  status: MuscleStatus
}

// 依日期與動作名稱統計完成的組數：date -> exerciseName -> sets
export type SetCounts = Map<string, Map<string, number>>

export function computeMuscleVolume(plan: TrainingPlan, week: DayCompletion[], setCounts: SetCounts): MuscleVolume[] {
  const muscleWeights = new Map(plan.days.flatMap((d) => d.exercises.map((e) => [e.name, e.muscles] as const)))
  const totals = new Map(MUSCLES.map((m) => [m, { weekTarget: 0, due: 0, completed: 0 }]))

  for (const day of week) {
    const exercises = plan.days.find((d) => d.day === day.dayKey)?.exercises ?? []
    const isDue = day.rate !== null
    for (const e of exercises) {
      for (const [muscle, weight] of Object.entries(e.muscles) as [Muscle, number][]) {
        const t = totals.get(muscle)!
        t.weekTarget += e.sets * weight
        if (isDue) t.due += e.sets * weight
      }
    }
    for (const [name, sets] of setCounts.get(day.date) ?? []) {
      for (const [muscle, weight] of Object.entries(muscleWeights.get(name) ?? {}) as [Muscle, number][]) {
        totals.get(muscle)!.completed += sets * weight
      }
    }
  }

  return MUSCLES.filter((m) => totals.get(m)!.weekTarget > 0).map((muscle) => {
    const { weekTarget, due, completed } = totals.get(muscle)!
    const progress = due > 0 ? completed / due : null
    const status: MuscleStatus =
      progress === null ? 'upcoming' : progress >= 0.9 ? 'good' : progress >= 0.5 ? 'warning' : 'critical'
    return { muscle, weekTarget, due, completed, weekRate: Math.min(1, completed / weekTarget), status }
  })
}

export function formatSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
