import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import { recordAiUsage } from '@/lib/ai/usage'
import { db } from '@/lib/db/client'
import { planTranslations } from '@/lib/db/schema'
import type { Locale } from '@/lib/i18n/config'
import { DAY_KEYS, DIET_MEALS, type TrainingPlan } from './plan'
import type { PlanText } from './plan-copy'

// 把 AI 課表的顯示文字翻成另一個語言。課表結構（組數、秒數、肌群）不變，只翻文字。
export const TRANSLATE_MODEL = 'claude-sonnet-5-5'

const LANGUAGE: Record<Locale, string> = { 'zh-TW': 'Traditional Chinese as used in Taiwan', en: 'English' }

const dietSchema = z.object({
  summary: z.string(),
  meals: z.array(z.object({ meal: z.enum(DIET_MEALS), ideas: z.array(z.string()) })),
  avoid: z.array(z.string()),
})

// 送給模型與模型回傳的格式相同：陣列依原本順序一一對應
const textSchema = z.object({
  title: z.string(),
  goal: z.string(),
  sessionLength: z.string(),
  days: z.array(
    z.object({
      title: z.string(),
      notes: z.array(z.string()),
      exercises: z.array(z.object({ name: z.string(), reps: z.string(), substitute: z.string() })),
    }),
  ),
  guidelines: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  weeklyTracking: z.array(z.string()),
  timeline: z.string(),
  safetyNotes: z.array(z.string()),
  diet: dietSchema.nullable(),
})
type TextPayload = z.infer<typeof textSchema>

// 存在資料庫的 PlanText；讀出時驗證，格式不符就當作沒有翻譯
const storedSchema = z.object({
  title: z.string(),
  goal: z.string(),
  sessionLength: z.string(),
  days: z.partialRecord(z.enum(DAY_KEYS), z.object({ title: z.string(), notes: z.array(z.string()) })),
  guidelines: z.array(z.object({ title: z.string(), items: z.array(z.string()) })),
  weeklyTracking: z.array(z.string()),
  exercises: z.record(z.string(), z.string()),
  reps: z.record(z.string(), z.string()).optional(),
  substitutes: z.record(z.string(), z.string()).optional(),
  timeline: z.string().optional(),
  safetyNotes: z.array(z.string()).optional(),
  diet: dietSchema.optional(),
})

export function parsePlanText(value: unknown): PlanText | null {
  const parsed = storedSchema.safeParse(value)
  return parsed.success ? (parsed.data as PlanText) : null
}

function toPayload(plan: TrainingPlan): TextPayload {
  return {
    title: plan.title,
    goal: plan.goal,
    sessionLength: plan.sessionLength,
    days: plan.days.map((d) => ({
      title: d.title,
      notes: d.notes,
      exercises: d.exercises.map((e) => ({ name: e.name, reps: e.reps, substitute: e.substitute ?? '' })),
    })),
    guidelines: plan.guidelines,
    weeklyTracking: plan.weeklyTracking,
    timeline: plan.timeline ?? '',
    safetyNotes: plan.safetyNotes ?? [],
    diet: plan.diet ?? null,
  }
}

// 依原本的順序對回課表；數量對不上（模型漏翻或多翻）就視為失敗，不顯示錯位的文字
function fromPayload(plan: TrainingPlan, out: TextPayload): PlanText | null {
  const sameLength = (a: unknown[], b: unknown[]) => a.length === b.length
  if (!sameLength(out.days, plan.days) || !sameLength(out.guidelines, plan.guidelines)) return null
  if (!sameLength(out.weeklyTracking, plan.weeklyTracking)) return null

  const exercises: Record<string, string> = {}
  const reps: Record<string, string> = {}
  const substitutes: Record<string, string> = {}
  const days = {} as PlanText['days']
  for (const [i, day] of plan.days.entries()) {
    const t = out.days[i]
    if (!sameLength(t.exercises, day.exercises) || !sameLength(t.notes, day.notes)) return null
    days[day.day] = { title: t.title, notes: t.notes }
    day.exercises.forEach((e, j) => {
      const te = t.exercises[j]
      exercises[e.name] = te.name.trim() || e.name
      reps[e.name] = te.reps.trim() || e.reps
      if (e.substitute && te.substitute.trim()) substitutes[e.name] = te.substitute
    })
  }
  for (const [i, g] of plan.guidelines.entries()) if (!sameLength(out.guidelines[i].items, g.items)) return null

  const diet = plan.diet && out.diet && sameLength(out.diet.meals, plan.diet.meals) ? out.diet : undefined
  return {
    title: out.title,
    goal: out.goal,
    sessionLength: out.sessionLength,
    days,
    guidelines: out.guidelines,
    weeklyTracking: out.weeklyTracking,
    exercises,
    reps,
    substitutes,
    ...(plan.timeline && out.timeline.trim() ? { timeline: out.timeline } : {}),
    ...(plan.safetyNotes && sameLength(out.safetyNotes, plan.safetyNotes) ? { safetyNotes: out.safetyNotes } : {}),
    ...(diet ? { diet } : {}),
  }
}

let client: Anthropic | null = null

export type TranslateResult = { ok: true; text: PlanText } | { ok: false; reason: 'unconfigured' | 'failed' }

export async function translatePlan(input: {
  userId: string
  planId: string
  plan: TrainingPlan
  to: Locale
}): Promise<TranslateResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: 'unconfigured' }
  client ??= new Anthropic()

  let response
  try {
    response = await client.beta.messages.parse(
      {
        model: TRANSLATE_MODEL,
        max_tokens: 16000,
        // 單純翻譯，用 low 讓回應快一點
        output_config: { effort: 'low', format: betaZodOutputFormat(textSchema) },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: `You translate a personal workout and diet plan for a fitness app into ${LANGUAGE[input.to]}.
Translate every string value and keep the JSON structure exactly the same: same keys, same number of items in every array, same order. Keep numbers, units (kg, cm, kcal, g, sec) and rep ranges such as "8–12" unchanged. Use the exercise names that gym-goers commonly use in that language. Leave empty strings empty and keep "meal" values unchanged.`,
        messages: [{ role: 'user', content: JSON.stringify(toPayload(input.plan)) }],
      },
      { timeout: 120_000, maxRetries: 0 },
    )
  } catch (e) {
    console.error('Plan translation request failed', e)
    return { ok: false, reason: 'failed' }
  }

  const text = response.parsed_output ? fromPayload(input.plan, response.parsed_output) : null
  await recordAiUsage({ userId: input.userId, feature: 'plan_translate', response, success: text !== null })
  if (!text) {
    console.error('Plan translation returned unusable output', response.stop_reason)
    return { ok: false, reason: 'failed' }
  }

  await db
    .insert(planTranslations)
    .values({ planId: input.planId, locale: input.to, text, model: response.model })
    .onConflictDoUpdate({ target: [planTranslations.planId, planTranslations.locale], set: { text, model: response.model } })
  return { ok: true, text }
}
