// 驗證 AI 產生（或資料庫讀出）的課表，確保頁面與計算用得上。
import { z } from 'zod'
import { DAY_KEYS, DIET_MEALS, MUSCLES, type TrainingPlan } from './plan'

const text = (max: number) => z.string().trim().min(1).max(max)
const list = (max: number, itemMax = 300) => z.array(text(itemMax)).max(max)

const exerciseSchema = z.object({
  name: text(80),
  sets: z.number().int().min(1).max(10),
  reps: text(30),
  perSide: z.boolean().optional(),
  restSeconds: z.number().int().min(15).max(600),
  muscles: z.partialRecord(z.enum(MUSCLES), z.number().min(0).max(1)),
  substitute: text(120).optional(),
})

const daySchema = z.object({
  day: z.enum(DAY_KEYS),
  title: text(60),
  exercises: z.array(exerciseSchema).max(12),
  notes: list(8),
})

export const trainingPlanSchema = z
  .object({
    title: text(60),
    goal: text(200),
    currentWeightKg: z.number().min(20).max(300),
    targetWeightKg: z.number().min(20).max(300),
    daysPerWeek: z.number().int().min(0).max(7),
    sessionLength: text(60),
    nutrition: z.object({
      calorieAdjustment: z.number().min(-1000).max(1000),
      proteinPerKg: z.number().min(0.8).max(3),
      fatPerKg: z.number().min(0.4).max(1.5),
    }),
    days: z.array(daySchema).length(7),
    guidelines: z.array(z.object({ title: text(40), items: list(8) })).max(8),
    weeklyTracking: list(12, 80),
    timeline: text(600).optional(),
    safetyNotes: list(8).optional(),
    diet: z
      .object({
        summary: text(600),
        meals: z.array(z.object({ meal: z.enum(DIET_MEALS), ideas: list(6, 200) })).max(DIET_MEALS.length),
        avoid: list(12, 100),
      })
      .optional(),
  })
  // 七天各一筆，依週一到週日排列
  .refine((p) => new Set(p.days.map((d) => d.day)).size === 7)
  .transform((p): TrainingPlan => ({
    ...p,
    days: [...p.days].sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day)),
    daysPerWeek: p.days.filter((d) => d.exercises.length > 0).length,
  }))
