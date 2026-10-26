import { datesBetween, dayKeyOf } from './dates'
import type { DayKey, TrainingPlan } from './plan'

export interface LoggedDay {
  plannedSets: number
  completedSets: number
}

export type DayStatus = 'rest' | 'untracked' | 'future' | 'done' | 'partial' | 'missed'

export interface DayCompletion {
  date: string
  dayKey: DayKey
  status: DayStatus
  plannedSets: number
  completedSets: number
  // 0–1；休息日、開始追蹤前與未來日期為 null
  rate: number | null
}

export interface PeriodCompletion {
  days: DayCompletion[]
  trainingDays: number
  trainedDays: number
  plannedSets: number
  completedSets: number
  rate: number | null
}

export function plannedSetsFor(plan: TrainingPlan, dayKey: DayKey): number {
  const day = plan.days.find((d) => d.day === dayKey)
  return day ? day.exercises.reduce((sum, e) => sum + e.sets, 0) : 0
}

// 計算期間內每天及整體的達成率。
// 只計算 trackingStart（第一筆紀錄的日期）到 today 之間；其間沒有紀錄的訓練日算 0%。
export function computeCompletion(
  plan: TrainingPlan,
  range: { from: string; to: string },
  trackingStart: string,
  today: string,
  logs: Map<string, LoggedDay>,
): PeriodCompletion {
  const { from, to } = range
  const days = datesBetween(from, to).map((date): DayCompletion => {
    const dayKey = dayKeyOf(date)
    const log = logs.get(date)
    const plannedSets = log?.plannedSets ?? plannedSetsFor(plan, dayKey)
    const completedSets = Math.min(log?.completedSets ?? 0, plannedSets)

    if (plannedSets === 0) return { date, dayKey, status: 'rest', plannedSets, completedSets: 0, rate: null }
    if (date < trackingStart) return { date, dayKey, status: 'untracked', plannedSets, completedSets: 0, rate: null }
    if (date > today) return { date, dayKey, status: 'future', plannedSets, completedSets: 0, rate: null }

    const rate = completedSets / plannedSets
    const status = rate >= 1 ? 'done' : rate > 0 ? 'partial' : 'missed'
    return { date, dayKey, status, plannedSets, completedSets, rate }
  })

  const counted = days.filter((d) => d.rate !== null)
  const plannedSets = counted.reduce((sum, d) => sum + d.plannedSets, 0)
  const completedSets = counted.reduce((sum, d) => sum + d.completedSets, 0)

  return {
    days,
    trainingDays: counted.length,
    trainedDays: counted.filter((d) => d.completedSets > 0).length,
    plannedSets,
    completedSets,
    rate: plannedSets > 0 ? completedSets / plannedSets : null,
  }
}

export function formatRate(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)}%`
}
