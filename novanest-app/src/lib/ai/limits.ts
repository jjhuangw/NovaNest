import 'server-only'
import { cache } from 'react'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { aiUsage, appSettings } from '@/lib/db/schema'
import type { Session } from '@/lib/auth/session'
import { todayISO } from '@/lib/training/dates'
import type { AiFeature } from './usage'
import type { Plan } from '@/lib/user/plan'

// AI 使用上限，防止大量呼叫造成費用失控。以 ai_usage 的紀錄計算（只有拿到回應的呼叫才會計費與記錄）。
// 「每天」以台灣時間 0 點起算。同時送出多個請求時可能略為超過，這個規模可以接受。

// 各方案（Free／Pro）每位使用者的次數與期間（照片與營養標示分析共用一個額度）、體態照片上限、
// 短時間內的總次數、全站每天的總次數。管理員可以在後台「AI 用量」調整，存在 app_settings；沒有設定時使用這裡的預設值。
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

// day：台灣時間今天 0 點起算；month：最近 30 天
export const PERIODS = ['day', 'month'] as const
export type Period = (typeof PERIODS)[number]

const count = (max: number) => z.number().int().min(0).max(max)
const allowance = (max: number) => z.object({ count: count(max), period: z.enum(PERIODS) })
const tierSchema = z.object({
  food_image: allowance(10000),
  food_name: allowance(10000),
  plan: allowance(1000),
  plan_translate: allowance(1000),
  // 體態照片最多幾張（不是 AI 功能，但同樣依方案限制）
  photos: count(10000),
})
export type TierLimits = z.infer<typeof tierSchema>

export const aiLimitsSchema = z.object({
  tiers: z.object({ free: tierSchema, pro: tierSchema }),
  // 短時間內的總次數（所有 AI 功能合計），擋下連續狂按或腳本
  burst: z.object({ calls: count(1000).min(1), minutes: z.number().int().min(1).max(1440) }),
  // 全站每天的總次數，作為費用的最後一道保險
  globalDaily: z.number().int().min(1).max(100000),
})
export type AiLimits = z.infer<typeof aiLimitsSchema>

// 加入方案之前存的格式（只有一組每天的次數），讀到時當作 Pro 每天的次數
const legacySchema = z.object({
  daily: z.object({ food_image: count(1000), food_name: count(1000), plan: count(100), plan_translate: count(100) }),
  burst: aiLimitsSchema.shape.burst,
  globalDaily: aiLimitsSchema.shape.globalDaily,
})

function envGlobalDaily(): number {
  const n = Number(process.env.AI_DAILY_GLOBAL_LIMIT)
  return Number.isInteger(n) && n > 0 ? n : 500
}

export function defaultAiLimits(): AiLimits {
  return {
    tiers: {
      free: {
        food_image: { count: 3, period: 'day' },
        food_name: { count: 10, period: 'day' },
        plan: { count: 1, period: 'month' },
        plan_translate: { count: 2, period: 'month' },
        photos: 12,
      },
      pro: {
        food_image: { count: 300, period: 'month' },
        food_name: { count: 1000, period: 'month' },
        plan: { count: 10, period: 'month' },
        plan_translate: { count: 20, period: 'month' },
        photos: 500,
      },
    },
    burst: { calls: 15, minutes: 10 },
    globalDaily: envGlobalDaily(),
  }
}

function parseLimits(value: unknown): AiLimits | null {
  const parsed = aiLimitsSchema.safeParse(value)
  if (parsed.success) return parsed.data
  const legacy = legacySchema.safeParse(value)
  if (!legacy.success) return null
  const d = defaultAiLimits()
  const daily = (n: number) => ({ count: n, period: 'day' as const })
  return {
    ...d,
    tiers: {
      free: d.tiers.free,
      pro: {
        food_image: daily(legacy.data.daily.food_image),
        food_name: daily(legacy.data.daily.food_name),
        plan: daily(legacy.data.daily.plan),
        plan_translate: daily(legacy.data.daily.plan_translate),
        photos: d.tiers.pro.photos,
      },
    },
    burst: legacy.data.burst,
    globalDaily: legacy.data.globalDaily,
  }
}

const SETTINGS_KEY = 'ai_limits'

// 同一個請求只讀一次；資料表不存在（尚未執行 0004_app_settings.sql）或格式不符時用預設值
export const getAiLimits = cache(async (): Promise<AiLimits> => {
  try {
    const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, SETTINGS_KEY))
    return (row && parseLimits(row.value)) ?? defaultAiLimits()
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

export type LimitResult =
  | { ok: true }
  | { ok: false; reason: 'daily' | 'monthly' | 'burst' | 'global'; limit: number; plan: Plan }

function taipeiDayStart(): Date {
  // 台灣沒有日光節約時間，固定 +08:00
  return new Date(`${todayISO()}T00:00:00+08:00`)
}

function windowStart(period: Period): Date {
  return period === 'day' ? taipeiDayStart() : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
}

export async function checkAiLimit(session: Session, feature: AiFeature): Promise<LimitResult> {
  const limits = await getAiLimits()
  const group = limitGroupOf(feature)
  const allowance = limits.tiers[session.plan][group]
  const dayStart = taipeiDayStart()
  const userStart = windowStart(allowance.period)
  const burstStart = new Date(Date.now() - limits.burst.minutes * 60 * 1000)
  const since = new Date(Math.min(dayStart.getTime(), userStart.getTime(), burstStart.getTime()))
  const mine = sql`${aiUsage.userId} = ${session.userId}`

  const [row] = await db
    .select({
      used: sql<number>`count(*) filter (where ${mine} and ${inArray(aiUsage.feature, GROUP_FEATURES[group])} and ${aiUsage.createdAt} >= ${userStart})::int`,
      burst: sql<number>`count(*) filter (where ${mine} and ${aiUsage.createdAt} >= ${burstStart})::int`,
      global: sql<number>`count(*) filter (where ${aiUsage.createdAt} >= ${dayStart})::int`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, since)))

  const plan = session.plan
  if (row.global >= limits.globalDaily) return { ok: false, reason: 'global', limit: limits.globalDaily, plan }
  // 管理員測試時不受個人上限限制，但仍受全站上限保護
  if (session.role === 'admin') return { ok: true }
  if (row.burst >= limits.burst.calls) return { ok: false, reason: 'burst', limit: limits.burst.calls, plan }
  if (row.used >= allowance.count) {
    return { ok: false, reason: allowance.period === 'day' ? 'daily' : 'monthly', limit: allowance.count, plan }
  }
  return { ok: true }
}

// 設定頁顯示：每個功能今天與最近 30 天各用了幾次（不必先知道使用者的方案，可以和登入檢查同時查詢）
export async function getUsageCounts(userId: string): Promise<Record<LimitGroup, Record<Period, number>>> {
  const monthStart = windowStart('month')
  const dayStart = taipeiDayStart()
  const fields: Record<string, ReturnType<typeof sql<number>>> = {}
  for (const g of LIMIT_GROUPS) {
    const inGroup = inArray(aiUsage.feature, GROUP_FEATURES[g])
    fields[`${g}_day`] = sql<number>`count(*) filter (where ${inGroup} and ${aiUsage.createdAt} >= ${dayStart})::int`
    fields[`${g}_month`] = sql<number>`count(*) filter (where ${inGroup} and ${aiUsage.createdAt} >= ${monthStart})::int`
  }
  const [row] = await db
    .select(fields)
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, monthStart < dayStart ? monthStart : dayStart)))
  return Object.fromEntries(
    LIMIT_GROUPS.map((g) => [g, { day: Number(row?.[`${g}_day`] ?? 0), month: Number(row?.[`${g}_month`] ?? 0) }]),
  ) as Record<LimitGroup, Record<Period, number>>
}

// 後台顯示今天全站用了多少
export async function globalUsageToday(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, taipeiDayStart()))
  return row.n
}
