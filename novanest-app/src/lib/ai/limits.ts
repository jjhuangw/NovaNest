import 'server-only'
import { cache } from 'react'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { aiUsage, appSettings } from '@/lib/db/schema'
import type { Session } from '@/lib/auth/session'
import { todayISO } from '@/lib/training/dates'
import type { AiFeature } from './usage'

// AI 使用上限，防止大量呼叫造成費用失控。以 ai_usage 的紀錄計算（只有拿到回應的呼叫才會計費與記錄）。
// 「每天」以台灣時間 0 點起算。同時送出多個請求時可能略為超過，這個規模可以接受。

// 每位使用者每天的次數（照片與營養標示分析共用一個額度）、短時間內的總次數、全站每天的總次數。
// 管理員可以在後台「AI 用量」調整，存在 app_settings；沒有設定時使用這裡的預設值。
export const LIMIT_GROUPS = ['food_image', 'food_name', 'plan', 'plan_translate'] as const
export type LimitGroup = (typeof LIMIT_GROUPS)[number]

const GROUP_FEATURES: Record<LimitGroup, AiFeature[]> = {
  plan: ['plan'],
  plan_translate: ['plan_translate'],
  food_image: ['food_photo', 'food_label'],
  food_name: ['food_name'],
}

export function limitGroupOf(feature: AiFeature): LimitGroup {
  if (feature === 'food_photo' || feature === 'food_label') return 'food_image'
  return feature
}

const count = (max: number) => z.number().int().min(0).max(max)
export const aiLimitsSchema = z.object({
  daily: z.object({ food_image: count(1000), food_name: count(1000), plan: count(100), plan_translate: count(100) }),
  // 短時間內的總次數（所有 AI 功能合計），擋下連續狂按或腳本
  burst: z.object({ calls: count(1000).min(1), minutes: z.number().int().min(1).max(1440) }),
  // 全站每天的總次數，作為費用的最後一道保險
  globalDaily: z.number().int().min(1).max(100000),
})
export type AiLimits = z.infer<typeof aiLimitsSchema>

function envGlobalDaily(): number {
  const n = Number(process.env.AI_DAILY_GLOBAL_LIMIT)
  return Number.isInteger(n) && n > 0 ? n : 500
}

export function defaultAiLimits(): AiLimits {
  return {
    daily: { food_image: 20, food_name: 60, plan: 3, plan_translate: 5 },
    burst: { calls: 15, minutes: 10 },
    globalDaily: envGlobalDaily(),
  }
}

const SETTINGS_KEY = 'ai_limits'

// 同一個請求只讀一次；資料表不存在（尚未執行 0004_app_settings.sql）或格式不符時用預設值
export const getAiLimits = cache(async (): Promise<AiLimits> => {
  try {
    const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, SETTINGS_KEY))
    const parsed = row ? aiLimitsSchema.safeParse(row.value) : null
    return parsed?.success ? parsed.data : defaultAiLimits()
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } }
    if ((err.code ?? err.cause?.code) !== '42P01') throw e
    return defaultAiLimits()
  }
})

export async function saveAiLimits(limits: AiLimits, adminId: string) {
  await db
    .insert(appSettings)
    .values({ key: SETTINGS_KEY, value: limits, updatedBy: adminId, updatedAt: new Date() })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: limits, updatedBy: adminId, updatedAt: new Date() } })
}

export type LimitResult = { ok: true } | { ok: false; reason: 'daily' | 'burst' | 'global'; limit: number }

function taipeiDayStart(): Date {
  // 台灣沒有日光節約時間，固定 +08:00
  return new Date(`${todayISO()}T00:00:00+08:00`)
}

export async function checkAiLimit(session: Session, feature: AiFeature): Promise<LimitResult> {
  const limits = await getAiLimits()
  const dayStart = taipeiDayStart()
  const burstStart = new Date(Date.now() - limits.burst.minutes * 60 * 1000)
  const since = dayStart < burstStart ? dayStart : burstStart
  const group = limitGroupOf(feature)
  const mine = sql`${aiUsage.userId} = ${session.userId}`

  const [row] = await db
    .select({
      userDay: sql<number>`count(*) filter (where ${mine} and ${inArray(aiUsage.feature, GROUP_FEATURES[group])} and ${aiUsage.createdAt} >= ${dayStart})::int`,
      burst: sql<number>`count(*) filter (where ${mine} and ${aiUsage.createdAt} >= ${burstStart})::int`,
      global: sql<number>`count(*) filter (where ${aiUsage.createdAt} >= ${dayStart})::int`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, since)))

  if (row.global >= limits.globalDaily) return { ok: false, reason: 'global', limit: limits.globalDaily }
  // 管理員測試時不受個人上限限制，但仍受全站上限保護
  if (session.role === 'admin') return { ok: true }
  if (row.burst >= limits.burst.calls) return { ok: false, reason: 'burst', limit: limits.burst.calls }
  if (row.userDay >= limits.daily[group]) return { ok: false, reason: 'daily', limit: limits.daily[group] }
  return { ok: true }
}

// 後台顯示今天全站用了多少
export async function globalUsageToday(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, taipeiDayStart()))
  return row.n
}
