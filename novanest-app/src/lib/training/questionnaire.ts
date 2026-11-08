// 建立課表的問卷：選項、體態示意的參數與驗證格式。
// 答案之後會整理成文字交給 AI 教練產生課表（見 docs/prompts/personal-trainer.md）。
import { z } from 'zod'
import { DAY_KEYS } from './plan'
import type { Gender } from '@/lib/user/profile'

export const GOALS = ['muscle_gain', 'fat_loss', 'recomp', 'fitness', 'health'] as const
export const EXPERIENCES = ['beginner', 'intermediate', 'advanced'] as const
// 訓練時能不能感覺到目標肌肉出力（新手常只覺得手臂或關節累）
export const MUSCLE_FEEL = ['clear', 'sometimes', 'rarely'] as const
// 姿勢有把握的主要動作；沒把握的由教練換成較容易學的版本
export const KNOWN_LIFTS = ['squat', 'deadlift', 'bench', 'overhead_press', 'row', 'pulldown'] as const
export const WEEKLY_HOURS = [2, 3, 4, 5, 6, 8, 10] as const
export const TIMES_OF_DAY = ['morning', 'daytime', 'evening', 'varies'] as const
export const VENUES = ['gym', 'small_gym', 'home', 'bodyweight', 'outdoor'] as const
// 只有選「居家」時才需要勾選器材
export const HOME_EQUIPMENT = ['dumbbells', 'kettlebell', 'bands', 'pullup_bar', 'bench', 'barbell_rack'] as const
export const INJURIES = ['shoulder', 'lower_back', 'knee', 'wrist_elbow', 'neck', 'hip', 'ankle'] as const
export const ALLERGIES = ['peanut_nuts', 'shellfish', 'fish', 'dairy', 'egg', 'gluten', 'soy'] as const
export const DIETS = ['none', 'no_beef', 'lacto_ovo', 'vegan'] as const
export const EATING_OUT = ['mostly_out', 'mixed', 'mostly_home'] as const

// 體態示意：以體脂率（%）與肌肉量（0–1）畫出剪影。
// 「目前體態」只變化體脂，「理想體態」是常見的幾種目標體型。
export interface BodyShape {
  id: string
  bodyFat: number
  muscle: number
}

export const CURRENT_SHAPES: Record<Gender, BodyShape[]> = {
  male: [
    { id: 'bf10', bodyFat: 10, muscle: 0.45 },
    { id: 'bf15', bodyFat: 15, muscle: 0.4 },
    { id: 'bf20', bodyFat: 20, muscle: 0.35 },
    { id: 'bf25', bodyFat: 25, muscle: 0.3 },
    { id: 'bf30', bodyFat: 30, muscle: 0.3 },
    { id: 'bf35', bodyFat: 35, muscle: 0.3 },
  ],
  female: [
    { id: 'bf18', bodyFat: 18, muscle: 0.45 },
    { id: 'bf22', bodyFat: 22, muscle: 0.4 },
    { id: 'bf27', bodyFat: 27, muscle: 0.35 },
    { id: 'bf32', bodyFat: 32, muscle: 0.3 },
    { id: 'bf37', bodyFat: 37, muscle: 0.3 },
    { id: 'bf42', bodyFat: 42, muscle: 0.3 },
  ],
}

export const TARGET_SHAPES: Record<Gender, BodyShape[]> = {
  male: [
    { id: 'lean', bodyFat: 11, muscle: 0.35 },
    { id: 'athletic', bodyFat: 13, muscle: 0.6 },
    { id: 'muscular', bodyFat: 10, muscle: 0.9 },
    { id: 'powerful', bodyFat: 19, muscle: 0.85 },
    { id: 'healthy', bodyFat: 17, muscle: 0.4 },
  ],
  female: [
    { id: 'slim', bodyFat: 20, muscle: 0.25 },
    { id: 'toned', bodyFat: 21, muscle: 0.5 },
    { id: 'athletic', bodyFat: 18, muscle: 0.7 },
    { id: 'muscular', bodyFat: 16, muscle: 0.9 },
    { id: 'healthy', bodyFat: 25, muscle: 0.4 },
  ],
}

export function findShape(list: BodyShape[], id: string | null): BodyShape | null {
  return list.find((s) => s.id === id) ?? null
}

const shortText = z
  .string()
  .trim()
  .max(300)
  .transform((s) => s || null)
  .nullable()

export const questionnaireSchema = z.object({
  goal: z.enum(GOALS),
  // 選「不確定」時為 null
  currentShape: z.string().max(20).nullable(),
  targetShape: z.string().max(20).nullable(),
  experience: z.enum(EXPERIENCES),
  // 後來新增的題目：舊的答案沒有這兩項時給預設值
  muscleFeel: z.enum(MUSCLE_FEEL).default('sometimes'),
  knownLifts: z.array(z.enum(KNOWN_LIFTS)).default([]),
  weeklyHours: z.number().int().min(1).max(15),
  // 空陣列代表哪天都可以，由教練安排
  days: z.array(z.enum(DAY_KEYS)).max(7),
  timeOfDay: z.enum(TIMES_OF_DAY),
  venue: z.enum(VENUES),
  equipment: z.array(z.enum(HOME_EQUIPMENT)),
  // 空陣列且沒有說明代表沒有傷病
  injuries: z.array(z.enum(INJURIES)),
  injuryNote: shortText,
  allergies: z.array(z.enum(ALLERGIES)),
  allergyNote: shortText,
  diet: z.enum(DIETS),
  eatingOut: z.enum(EATING_OUT),
})

export type Questionnaire = z.infer<typeof questionnaireSchema>

export const DEFAULT_ANSWERS: Questionnaire = {
  goal: 'muscle_gain',
  currentShape: null,
  targetShape: null,
  experience: 'beginner',
  muscleFeel: 'sometimes',
  knownLifts: [],
  weeklyHours: 4,
  days: [],
  timeOfDay: 'evening',
  venue: 'gym',
  equipment: [],
  injuries: [],
  injuryNote: null,
  allergies: [],
  allergyNote: null,
  diet: 'none',
  eatingOut: 'mixed',
}
