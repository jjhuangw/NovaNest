import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Locale } from '@/lib/i18n/config'
import { getMessages } from '@/lib/i18n/messages'
import type { Gender } from '@/lib/user/body'
import { DAY_KEYS, DIET_MEALS, MUSCLES, type TrainingPlan } from './plan'
import { trainingPlanSchema } from './plan-schema'
import { CURRENT_SHAPES, findShape, TARGET_SHAPES, type Questionnaire } from './questionnaire'
import { TRAINER_SYSTEM_PROMPT } from './trainer-prompt'

export const PLAN_MODEL = 'claude-opus-5-5'

// 模型輸出的格式。數值範圍與選填欄位不放在這裡（結構化輸出不支援），回來後再以 trainingPlanSchema 驗證。
// 肌群改用陣列表示，避免物件的鍵不固定。
const outputSchema = z.object({
  title: z.string(),
  goal: z.string(),
  currentWeightKg: z.number(),
  targetWeightKg: z.number(),
  sessionLength: z.string(),
  nutrition: z.object({ calorieAdjustment: z.number(), proteinPerKg: z.number(), fatPerKg: z.number() }),
  days: z.array(
    z.object({
      day: z.enum(DAY_KEYS),
      title: z.string(),
      notes: z.array(z.string()),
      exercises: z.array(
        z.object({
          name: z.string(),
          sets: z.number(),
          reps: z.string(),
          perSide: z.boolean(),
          restSeconds: z.number(),
          muscles: z.array(z.object({ muscle: z.enum(MUSCLES), weight: z.number() })),
          substitute: z.string(),
        }),
      ),
    }),
  ),
  guidelines: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  weeklyTracking: z.array(z.string()),
  timeline: z.string(),
  safetyNotes: z.array(z.string()),
  diet: z.object({
    summary: z.string(),
    meals: z.array(z.object({ meal: z.enum(DIET_MEALS), ideas: z.array(z.string()) })),
    avoid: z.array(z.string()),
  }),
})

export interface PlanProfile {
  gender: Gender
  heightCm: number
  weightKg: number
  age: number | null
}

const LANGUAGE: Record<Locale, string> = { 'zh-TW': '繁體中文（台灣）', en: 'English' }

// 把問卷整理成給教練看的學員資料（固定用中文標籤，輸出語言另外指定）
export function describeTrainee(answers: Questionnaire, profile: PlanProfile, locale: Locale): string {
  const ts = getMessages('zh-TW').setup
  const days = getMessages('zh-TW').days
  const join = (items: string[]) => items.join('、')
  const current = findShape(CURRENT_SHAPES[profile.gender], answers.currentShape)
  const target = findShape(TARGET_SHAPES[profile.gender], answers.targetShape)
  const currentCopy = current && ts.currentShapes[profile.gender][current.id]
  const targetCopy = target && ts.targetShapes[profile.gender][target.id]

  const venue =
    answers.venue === 'home'
      ? `居家；器材：${answers.equipment.length ? join(answers.equipment.map((e) => ts.equipmentItems[e])) : '沒有器材'}`
      : `${ts.venues[answers.venue].label}（${ts.venues[answers.venue].desc}）`
  const injuries = answers.injuries.length ? join(answers.injuries.map((i) => ts.injuryItems[i])) : '沒有'
  const allergies = answers.allergies.length ? join(answers.allergies.map((a) => ts.allergyItems[a])) : '沒有'

  return [
    '學員資料',
    `- 性別：${profile.gender === 'male' ? '男' : '女'}；年齡：${profile.age ?? '未提供'}；身高：${profile.heightCm} cm；體重：${profile.weightKg} kg`,
    `- 目標：${ts.goals[answers.goal].label}（${ts.goals[answers.goal].desc}）`,
    `- 目前體態：${currentCopy ? `體脂${currentCopy.label}（${currentCopy.desc}）` : '未選擇'}`,
    `- 理想體態：${targetCopy ? `${targetCopy.label}（體脂${targetCopy.desc}）` : '未選擇'}`,
    `- 重量訓練經驗：${ts.experiences[answers.experience].label}（${ts.experiences[answers.experience].desc}）`,
    `- 每週可訓練總時數：${ts.hours(answers.weeklyHours)}；可訓練的日子：${
      answers.days.length ? join(answers.days.map((d) => days[d])) : '都可以，由教練安排'
    }；時段：${ts.times[answers.timeOfDay]}`,
    `- 場地：${venue}`,
    `- 傷病：${injuries}${answers.injuryNote ? `；補充說明：${answers.injuryNote}` : ''}`,
    `- 過敏或不能吃：${allergies}${answers.allergyNote ? `；其他：${answers.allergyNote}` : ''}`,
    `- 飲食習慣：${ts.diets[answers.diet]}；平常${ts.eatingOutItems[answers.eatingOut]}`,
    `- 輸出語言：${LANGUAGE[locale]}`,
  ].join('\n')
}

export type GenerateResult = { ok: true; plan: TrainingPlan } | { ok: false; reason: 'unconfigured' | 'failed' }

export function isGeneratorConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let client: Anthropic | null = null

export async function generatePlan(answers: Questionnaire, profile: PlanProfile, locale: Locale): Promise<GenerateResult> {
  if (!isGeneratorConfigured()) return { ok: false, reason: 'unconfigured' }
  client ??= new Anthropic()

  let response
  try {
    response = await client.beta.messages.parse({
      model: PLAN_MODEL,
      max_tokens: 32000,
      // 課表內容多，用 medium 在品質與等待時間之間取平衡
      output_config: { effort: 'medium', format: betaZodOutputFormat(outputSchema) },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: TRAINER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: describeTrainee(answers, profile, locale) }],
    })
  } catch (e) {
    console.error('Plan generation request failed', e)
    return { ok: false, reason: 'failed' }
  }

  const raw = response.parsed_output
  if (!raw) {
    console.error('Plan generation returned no parsable output', response.stop_reason)
    return { ok: false, reason: 'failed' }
  }

  // 轉成 TrainingPlan：肌群陣列轉物件（只保留 1 與 0.5）、空字串的選填欄位拿掉
  // 文字清單去掉空白項目並限制數量，避免模型多寫幾條就整份驗證失敗
  const clean = (items: string[], max: number) => items.map((s) => s.trim()).filter(Boolean).slice(0, max)
  const candidate = {
    ...raw,
    daysPerWeek: 0,
    guidelines: raw.guidelines.slice(0, 8).map((g) => ({ ...g, items: clean(g.items, 8) })),
    weeklyTracking: clean(raw.weeklyTracking, 12),
    safetyNotes: clean(raw.safetyNotes, 8),
    days: raw.days.map((d) => ({
      ...d,
      notes: clean(d.notes, 8),
      exercises: d.exercises.slice(0, 12).map(({ muscles, substitute, perSide, ...e }) => ({
        ...e,
        sets: Math.round(e.sets),
        restSeconds: Math.round(e.restSeconds),
        ...(perSide ? { perSide: true } : {}),
        ...(substitute.trim() ? { substitute } : {}),
        muscles: Object.fromEntries(muscles.map((m) => [m.muscle, m.weight >= 0.75 ? 1 : 0.5])),
      })),
    })),
    diet: {
      ...raw.diet,
      meals: raw.diet.meals.map((m) => ({ ...m, ideas: clean(m.ideas, 6) })).filter((m) => m.ideas.length > 0),
      avoid: clean(raw.diet.avoid, 12),
    },
  }
  const parsed = trainingPlanSchema.safeParse(candidate)
  if (!parsed.success) {
    console.error('Generated plan failed validation', z.prettifyError(parsed.error))
    return { ok: false, reason: 'failed' }
  }
  return { ok: true, plan: parsed.data }
}
