import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { inArray } from 'drizzle-orm'
import { z } from 'zod'
import { recordAiUsage } from '@/lib/ai/usage'
import { db } from '@/lib/db/client'
import { exerciseGuides } from '@/lib/db/schema'
import type { Locale } from '@/lib/i18n/config'
import { EXERCISE_CATALOG, findCatalogEntry, matchCatalog, normalizeExerciseName } from './exercise-catalog'

// 動作說明：第一次有人打開某個動作時由 AI 產生（中英文一起），存進 exercise_guides 讓所有使用者共用。
export const GUIDE_MODEL = 'claude-sonnet-5-5'

const sectionsSchema = z.object({
  // 器材設定：座椅高度、握法、站距等開始前要調整的地方
  setup: z.array(z.string()),
  // 動作步驟
  steps: z.array(z.string()),
  // 發力與感受：哪裡出力、呼吸、節奏
  force: z.array(z.string()),
  // 常見錯誤與修正
  mistakes: z.array(z.string()),
})
export type GuideSections = z.infer<typeof sectionsSchema>

const contentSchema = z.object({ 'zh-TW': sectionsSchema, en: sectionsSchema })
type GuideContent = z.infer<typeof contentSchema>

export interface ExerciseGuide {
  catalogId: string | null
  sections: GuideSections
}

const outputSchema = z.object({ catalogId: z.string(), zh: sectionsSchema, en: sectionsSchema })

export function guideKey(name: string): string {
  return normalizeExerciseName(name).slice(0, 200)
}

function isMissingTable(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } }
  return (err.code ?? err.cause?.code) === '42P01'
}

// 一次讀取課表上所有動作已經產生過的說明；資料表還不存在（尚未執行 0006_exercise_guides.sql）時當作都沒有
export async function getGuides(names: string[], locale: Locale): Promise<Map<string, ExerciseGuide>> {
  const keys = [...new Set(names.map(guideKey))]
  const result = new Map<string, ExerciseGuide>()
  if (keys.length === 0) return result
  try {
    const rows = await db
      .select({ nameKey: exerciseGuides.nameKey, catalogId: exerciseGuides.catalogId, content: exerciseGuides.content })
      .from(exerciseGuides)
      .where(inArray(exerciseGuides.nameKey, keys))
    for (const row of rows) {
      const content = contentSchema.safeParse(row.content)
      if (content.success) result.set(row.nameKey, { catalogId: findCatalogEntry(row.catalogId)?.id ?? null, sections: content.data[locale] })
    }
  } catch (e) {
    if (!isMissingTable(e)) throw e
  }
  return result
}

const CATALOG_LIST = EXERCISE_CATALOG.map((e) => `${e.id}｜${e.zh}｜${e.en}`).join('\n')

const SYSTEM_PROMPT = `你是 NovaNest 的私人教練，具備 NSCA-CSCS 等級的專業。你要為一個重量訓練動作寫一份「第一次做也看得懂」的動作說明，
同時提供繁體中文（台灣用語）與英文兩個版本，內容相同。

# 內容
- setup（器材設定，2–4 條）：開始前要調整或準備的地方，例如座椅高度、靠墊位置、握法與握距、站距、選擇的重量。
  徒手動作寫起始姿勢。
- steps（動作步驟，3–5 條）：依順序描述一次完整的動作，從起始到回到起點。
- force（發力與感受，2–4 條）：該由哪塊肌肉出力、應該感覺到哪裡痠或緊、呼吸方式（何時吸氣、何時吐氣）、
  建議節奏（例如放下約 2–3 秒）。
- mistakes（常見錯誤，2–4 條）：每條寫「錯誤 → 怎麼修正」。
- 每條 1–2 句、具體、可以直接照著做。不要提到特定品牌，不做醫療建議；有可能受傷的地方提醒「感到疼痛就停止」。
- 中文版用台灣常見的健身用語（例如啞鈴、槓鈴、滑輪、組數、離心），英文版用一般健身房常見的說法。

# 圖解
catalogId：從下面的圖解目錄挑出和這個動作「相同或幾乎相同」的一個 id（器材與動作方式都要一致）。
如果有指定的 id，直接使用它。目錄中沒有夠接近的動作時，填空字串，不要勉強配對。

圖解目錄（id｜中文｜英文）：
${CATALOG_LIST}`

export type GenerateGuideResult = { ok: true; guide: ExerciseGuide } | { ok: false; reason: 'unconfigured' | 'failed' }

let client: Anthropic | null = null

export async function generateGuide(input: { userId: string; name: string; cue?: string; locale: Locale }): Promise<GenerateGuideResult> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, reason: 'unconfigured' }
  client ??= new Anthropic()
  const matched = matchCatalog(input.name)

  let response
  try {
    response = await client.beta.messages.parse(
      {
        model: GUIDE_MODEL,
        max_tokens: 4000,
        output_config: { effort: 'low', format: betaZodOutputFormat(outputSchema) },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        // 目錄很長而且每次都一樣，快取起來降低費用
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: [
              `動作名稱：${input.name}`,
              input.cue ? `課表上的感受提示：${input.cue}` : null,
              matched ? `指定的圖解 id：${matched}` : null,
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      },
      { timeout: 60_000, maxRetries: 1 },
    )
  } catch (e) {
    console.error('Exercise guide request failed', e)
    return { ok: false, reason: 'failed' }
  }

  const raw = response.parsed_output
  const clean = (items: string[], max: number) => items.map((s) => s.trim().slice(0, 300)).filter(Boolean).slice(0, max)
  const tidy = (s: GuideSections): GuideSections => ({
    setup: clean(s.setup, 5),
    steps: clean(s.steps, 6),
    force: clean(s.force, 5),
    mistakes: clean(s.mistakes, 5),
  })
  const content: GuideContent | null = raw ? { 'zh-TW': tidy(raw.zh), en: tidy(raw.en) } : null
  const ok = Boolean(content && content['zh-TW'].steps.length && content.en.steps.length)
  await recordAiUsage({ userId: input.userId, feature: 'exercise_guide', response, success: ok })
  if (!content || !ok) {
    console.error('Exercise guide returned no usable output', response.stop_reason)
    return { ok: false, reason: 'failed' }
  }

  const catalogId = matched ?? findCatalogEntry(raw?.catalogId.trim())?.id ?? null
  try {
    // 兩個人同時產生同一個動作時，保留先存進去的那一份
    await db
      .insert(exerciseGuides)
      .values({ nameKey: guideKey(input.name), name: input.name.slice(0, 200), catalogId, content, model: response.model, createdBy: input.userId })
      .onConflictDoNothing()
  } catch (e) {
    // 資料表不存在時仍然把這次的結果給使用者看，只是不會保存
    if (!isMissingTable(e)) throw e
  }
  return { ok: true, guide: { catalogId, sections: content[input.locale] } }
}
