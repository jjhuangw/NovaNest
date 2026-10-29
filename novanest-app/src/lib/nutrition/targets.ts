// 由課表的飲食策略與個人身體資料，計算每天的營養目標。
// 訓練日與休息日的活動量不同，所以熱量與碳水目標會跟著課表變動；
// 蛋白質與脂肪以體重計算，每天相同。
import type { Gender } from '@/lib/user/profile'
import type { DayKey, TrainingPlan } from '@/lib/training/plan'
import type { NutrientKey, Nutrients } from './nutrients'

export interface BodyProfile {
  weightKg: number
  // 身高與年齡都有時以 Mifflin-St Jeor 公式估算基礎代謝，否則以體重粗估
  heightCm: number | null
  age: number | null
  gender: Gender | null
  // 體重是否來自使用者自己的紀錄（否則為課表上的體重）
  weightFromLog: boolean
}

// 由設定頁的身體資料組出計算用的資料；沒有體重紀錄時使用課表上的目前體重
export function bodyProfileFrom(
  data: { weightKg: number | null; heightCm: number | null; birthYear: number | null; gender: Gender | null },
  plan: TrainingPlan,
  today: string,
): BodyProfile {
  return {
    weightKg: data.weightKg ?? plan.currentWeightKg,
    weightFromLog: data.weightKg !== null,
    heightCm: data.heightCm,
    age: data.birthYear === null ? null : Number(today.slice(0, 4)) - data.birthYear,
    gender: data.gender,
  }
}

// 活動係數：課表平日約 30 分鐘重量訓練，休息日只有日常活動與散步
export const ACTIVITY_FACTOR = { training: 1.5, rest: 1.3 } as const
// 沒有身高或年齡時，以每公斤體重約 24 kcal 粗估基礎代謝
const BMR_PER_KG = 24

export const FIBER_MIN_G = 25
export const SODIUM_MAX_MG = 2300

export interface DayTargets {
  isTrainingDay: boolean
  bmr: number
  bmrEstimated: boolean
  maintenance: number
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
  sodiumMg: number
}

export function estimateBmr(profile: BodyProfile): { bmr: number; estimated: boolean } {
  const { weightKg, heightCm, age, gender } = profile
  if (heightCm === null || age === null) return { bmr: weightKg * BMR_PER_KG, estimated: true }
  // 未指定性別時取男女公式的中間值
  const sexOffset = gender === 'male' ? 5 : gender === 'female' ? -161 : -78
  return { bmr: 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset, estimated: false }
}

export function dayTargets(plan: TrainingPlan, dayKey: DayKey, profile: BodyProfile): DayTargets {
  const day = plan.days.find((d) => d.day === dayKey)!
  const isTrainingDay = day.exercises.length > 0
  const { bmr, estimated } = estimateBmr(profile)
  const maintenance = bmr * (isTrainingDay ? ACTIVITY_FACTOR.training : ACTIVITY_FACTOR.rest)
  const kcal = roundTo(maintenance + plan.nutrition.calorieAdjustment, 10)
  const proteinG = Math.round(profile.weightKg * plan.nutrition.proteinPerKg)
  const fatG = Math.round(profile.weightKg * plan.nutrition.fatPerKg)
  // 剩下的熱量都給碳水，訓練日多出來的熱量因此主要落在碳水
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4))
  return {
    isTrainingDay,
    bmr: Math.round(bmr),
    bmrEstimated: estimated,
    maintenance: roundTo(maintenance, 10),
    kcal,
    proteinG,
    carbsG,
    fatG,
    fiberG: FIBER_MIN_G,
    sodiumMg: SODIUM_MAX_MG,
  }
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step
}

// 每項營養素的判斷方式：
// - 熱量：目標 ±10% 內算達成
// - 蛋白質、纖維：下限，達到 95% 以上算達成
// - 碳水、脂肪：目標 ±15% 內算達成
// - 鈉：上限，不超過算達成
export type TargetKind = 'range' | 'min' | 'max'
export type NutrientStatus = 'under' | 'met' | 'over' | 'empty'

export const TRACKED = ['kcal', 'proteinG', 'carbsG', 'fatG', 'fiberG', 'sodiumMg'] as const
export type TrackedKey = (typeof TRACKED)[number]

const RULES: Record<TrackedKey, { kind: TargetKind; tolerance: number }> = {
  kcal: { kind: 'range', tolerance: 0.1 },
  proteinG: { kind: 'min', tolerance: 0.05 },
  carbsG: { kind: 'range', tolerance: 0.15 },
  fatG: { kind: 'range', tolerance: 0.15 },
  fiberG: { kind: 'min', tolerance: 0.05 },
  sodiumMg: { kind: 'max', tolerance: 0 },
}

export function targetKind(key: TrackedKey): TargetKind {
  return RULES[key].kind
}

export interface NutrientProgress {
  key: TrackedKey
  value: number | null
  target: number
  kind: TargetKind
  ratio: number
  status: NutrientStatus
}

export function nutrientStatus(key: TrackedKey, value: number | null, target: number): NutrientStatus {
  if (value === null) return 'empty'
  const { kind, tolerance } = RULES[key]
  const ratio = target > 0 ? value / target : 0
  if (kind === 'min') return ratio >= 1 - tolerance ? 'met' : 'under'
  if (kind === 'max') return ratio <= 1 + tolerance ? 'met' : 'over'
  if (ratio < 1 - tolerance) return 'under'
  if (ratio > 1 + tolerance) return 'over'
  return 'met'
}

export function progressFor(totals: Nutrients, targets: DayTargets): NutrientProgress[] {
  return TRACKED.map((key) => {
    const value = totals[key as NutrientKey]
    const target = targets[key]
    return {
      key,
      value,
      target,
      kind: targetKind(key),
      ratio: value === null || target === 0 ? 0 : value / target,
      status: nutrientStatus(key, value, target),
    }
  })
}

// 一天是否「達標」：熱量在範圍內且蛋白質足夠，這兩項最直接影響增肌／減脂成效
export function dayGoalMet(totals: Nutrients, targets: DayTargets): boolean {
  return (
    nutrientStatus('kcal', totals.kcal, targets.kcal) === 'met' &&
    nutrientStatus('proteinG', totals.proteinG, targets.proteinG) === 'met'
  )
}
