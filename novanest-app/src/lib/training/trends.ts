import 'server-only'
import { and, asc, between, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { setLogs, workoutLogs } from '@/lib/db/schema'
import { computeCompletion } from './completion'
import { addDays, weekStart } from './dates'
import { getFirstLogDate, getLoggedDays } from './logs'
import { getActivePlan } from './plan-store'

export const TREND_WEEKS = [4, 12, 26] as const
export type TrendWeeks = (typeof TREND_WEEKS)[number]

export interface WeekPoint {
  // 週一的日期
  week: string
  volumeKg: number
  // 0–1；這週還沒開始追蹤或沒有訓練日時為 null
  rate: number | null
  completedSets: number
  plannedSets: number
}

export interface ExerciseSession {
  date: string
  // 最重的一組（同重量取次數多的）
  bestWeightKg: number
  bestReps: number
  // 依 Epley 公式推估的最大肌力：重量 ×（1 + 次數 / 30），取當天最高的一組
  estimated1RM: number
}

export interface ExerciseTrend {
  name: string
  sessions: ExerciseSession[]
}

// Epley 公式在 1–12 下最準；次數很高時推估值偏高，所以超過 12 下以 12 計算
export function estimate1RM(weightKg: number, reps: number) {
  if (reps <= 1) return weightKg
  return weightKg * (1 + Math.min(reps, 12) / 30)
}

const round1 = (n: number) => Math.round(n * 10) / 10

// 最近 N 週（含本週）的訓練量、達成率，以及每個動作每次訓練的最佳一組與推估 1RM
export async function getTrainingTrends(userId: string, weeks: TrendWeeks, today: string) {
  const thisWeek = weekStart(today)
  const from = addDays(thisWeek, -7 * (weeks - 1))
  const to = addDays(thisWeek, 6)

  const [{ plan }, sets, logged, firstLogDate] = await Promise.all([
    getActivePlan(userId),
    db
      .select({ date: workoutLogs.date, name: setLogs.exerciseName, weightKg: setLogs.weightKg, reps: setLogs.reps })
      .from(setLogs)
      .innerJoin(workoutLogs, eq(setLogs.workoutLogId, workoutLogs.id))
      .where(and(eq(workoutLogs.userId, userId), between(workoutLogs.date, from, to)))
      .orderBy(asc(workoutLogs.date)),
    getLoggedDays(userId, from, to),
    getFirstLogDate(userId),
  ])

  const trackingStart = firstLogDate ?? today
  const volumeByWeek = new Map<string, number>()
  const byExercise = new Map<string, Map<string, { weight: number; reps: number }[]>>()
  for (const s of sets) {
    const weight = s.weightKg === null ? 0 : Number(s.weightKg)
    const week = weekStart(s.date)
    volumeByWeek.set(week, (volumeByWeek.get(week) ?? 0) + weight * s.reps)
    if (!byExercise.has(s.name)) byExercise.set(s.name, new Map())
    const days = byExercise.get(s.name)!
    if (!days.has(s.date)) days.set(s.date, [])
    days.get(s.date)!.push({ weight, reps: s.reps })
  }

  const weekPoints: WeekPoint[] = Array.from({ length: weeks }, (_, i) => {
    const week = addDays(from, i * 7)
    // 達成率以目前的課表計算；過去的日子若有紀錄，用當時存下的計畫組數
    const c = computeCompletion(plan, { from: week, to: addDays(week, 6) }, trackingStart, today, logged)
    return { week, volumeKg: Math.round(volumeByWeek.get(week) ?? 0), rate: c.rate, completedSets: c.completedSets, plannedSets: c.plannedSets }
  })

  // 只有填了重量的動作才能看出重量進步；依訓練次數多到少排列
  const exercises: ExerciseTrend[] = [...byExercise.entries()]
    .map(([name, days]) => ({
      name,
      sessions: [...days.entries()]
        .map(([date, daySets]) => {
          const weighted = daySets.filter((s) => s.weight > 0)
          if (weighted.length === 0) return null
          const best = weighted.reduce((a, b) => (b.weight > a.weight || (b.weight === a.weight && b.reps > a.reps) ? b : a))
          return {
            date,
            bestWeightKg: round1(best.weight),
            bestReps: best.reps,
            estimated1RM: round1(Math.max(...weighted.map((s) => estimate1RM(s.weight, s.reps)))),
          }
        })
        .filter((s): s is ExerciseSession => s !== null),
    }))
    .filter((e) => e.sessions.length > 0)
    .sort((a, b) => b.sessions.length - a.sessions.length || a.name.localeCompare(b.name))

  return { from, to, weeks: weekPoints, exercises }
}
