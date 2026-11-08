import 'server-only'
import { db } from '@/lib/db/client'
import { aiUsage } from '@/lib/db/schema'

export const AI_FEATURES = ['plan', 'food_photo', 'food_label', 'food_name'] as const
export type AiFeature = (typeof AI_FEATURES)[number]

export function isAiFeature(v: unknown): v is AiFeature {
  return typeof v === 'string' && (AI_FEATURES as readonly string[]).includes(v)
}

interface ResponseLike {
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number | null
    cache_creation_input_tokens?: number | null
  }
}

// 記錄一次 API 呼叫的用量。寫入失敗只記 log，不影響使用者的操作。
export async function recordAiUsage(input: { userId: string; feature: AiFeature; response: ResponseLike; success: boolean }) {
  const { usage } = input.response
  try {
    await db.insert(aiUsage).values({
      userId: input.userId,
      feature: input.feature,
      model: input.response.model,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
      success: input.success,
    })
  } catch (e) {
    console.error('Recording AI usage failed', e)
  }
}
