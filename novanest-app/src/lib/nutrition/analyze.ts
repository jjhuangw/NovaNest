import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Locale } from '@/lib/i18n/config'
import { foodItemSchema, type FoodItem } from './nutrients'

export type AnalyzeMode = 'photo' | 'label'

const MODEL = 'claude-opus-5-5'

// 模型輸出的格式。數值範圍不放在這裡（結構化輸出不支援），回來後再以 foodItemSchema 驗證。
const outputSchema = z.object({
  recognized: z.boolean(),
  items: z.array(
    z.object({
      name: z.string(),
      amount: z.string().nullable(),
      kcal: z.number(),
      proteinG: z.number(),
      carbsG: z.number(),
      fatG: z.number(),
      fiberG: z.number().nullable(),
      sugarG: z.number().nullable(),
      sodiumMg: z.number().nullable(),
    }),
  ),
  servingsPerPackage: z.number().nullable(),
  note: z.string().nullable(),
})

const COMMON = `Report every nutrient for the stated amount: kcal, protein/carbs/fat/fiber/sugar in grams, sodium in milligrams. Use null for fiber, sugar or sodium only when you truly cannot tell. "note" is one short sentence for the user (e.g. what was hard to judge), or null.`

const PROMPTS: Record<AnalyzeMode, string> = {
  photo: `You estimate the nutrition of a meal from a photo for a fitness app.
List each distinct food or drink you can see as its own item, with the portion you estimate in "amount" (e.g. "1 bowl, about 200 g"). Base the numbers on typical recipes and portion sizes in Taiwan unless the photo suggests otherwise, and account for visible oil, sauces and drinks. If the user adds a description, trust it over what you see for portions and ingredients.
Set "servingsPerPackage" to null. If the photo shows no food, set "recognized" to false and return no items.
${COMMON}`,
  label: `You read a packaged food's nutrition facts label from a photo for a fitness app.
Return exactly one item with the values for ONE serving as printed on the label. Taiwan labels list "每份" (per serving) and "每100公克/毫升" (per 100 g/ml): use the per-serving column, and put the serving size in "amount" (e.g. "1 serving, 30 g"). If the label only gives per-100 g/ml values, use those and set "amount" to "100 g" or "100 ml". Use the product name for "name" if visible, otherwise a short description. Copy the numbers exactly; convert kJ to kcal only if kcal is missing. "servingsPerPackage" is the number of servings in the package (本包裝含 N 份) or null.
If the photo is not a readable nutrition label, set "recognized" to false and return no items.
${COMMON}`,
}

const LANGUAGE: Record<Locale, string> = {
  'zh-TW': 'Write "name", "amount" and "note" in Traditional Chinese (Taiwan).',
  en: 'Write "name", "amount" and "note" in English.',
}

export type AnalyzeResult =
  | { ok: true; items: FoodItem[]; servingsPerPackage: number | null; note: string | null }
  | { ok: false; reason: 'unconfigured' | 'unrecognized' | 'failed' }

export function isAnalyzerConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

let client: Anthropic | null = null

export async function analyzeFoodImage(input: {
  mode: AnalyzeMode
  jpeg: Uint8Array
  hint: string | null
  locale: Locale
}): Promise<AnalyzeResult> {
  if (!isAnalyzerConfigured()) return { ok: false, reason: 'unconfigured' }
  client ??= new Anthropic()

  const text = [LANGUAGE[input.locale], input.hint ? `The user's description: ${input.hint}` : null]
    .filter(Boolean)
    .join('\n')

  let response
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium', format: betaZodOutputFormat(outputSchema) },
      // 被安全機制拒絕時，自動改由其他模型處理
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: PROMPTS[input.mode],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: Buffer.from(input.jpeg).toString('base64') } },
            { type: 'text', text },
          ],
        },
      ],
    })
  } catch (e) {
    console.error('Food analysis request failed', e)
    return { ok: false, reason: 'failed' }
  }

  if (response.stop_reason === 'refusal') return { ok: false, reason: 'unrecognized' }
  const parsed = response.parsed_output
  if (!parsed) {
    console.error('Food analysis returned no parsable output', response.stop_reason)
    return { ok: false, reason: 'failed' }
  }
  if (!parsed.recognized || parsed.items.length === 0) return { ok: false, reason: 'unrecognized' }

  // 模型偶爾給出負數或超出範圍的值：夾到合理範圍，名稱過長就截斷
  const items: FoodItem[] = []
  for (const raw of parsed.items.slice(0, 20)) {
    const candidate = {
      ...raw,
      name: raw.name.trim().slice(0, 100),
      amount: raw.amount?.trim().slice(0, 100) || null,
    }
    const result = foodItemSchema.safeParse(clampItem(candidate))
    if (result.success) items.push(result.data)
  }
  if (items.length === 0) return { ok: false, reason: 'unrecognized' }

  const servings = parsed.servingsPerPackage
  return {
    ok: true,
    items,
    servingsPerPackage: servings !== null && servings > 0 && servings < 1000 ? servings : null,
    note: parsed.note?.trim().slice(0, 300) || null,
  }
}

function clampItem<T extends Record<string, unknown>>(item: T): T {
  const out: Record<string, unknown> = { ...item }
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'number') out[k] = Number.isFinite(v) ? Math.max(0, v) : 0
  }
  return out as T
}
