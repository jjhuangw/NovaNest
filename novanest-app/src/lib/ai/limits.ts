import 'server-only'
import { and, gte, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { aiUsage } from '@/lib/db/schema'
import type { Session } from '@/lib/auth/session'
import { todayISO } from '@/lib/training/dates'
import type { AiFeature } from './usage'

// AI 使用上限，防止大量呼叫造成費用失控。以 ai_usage 的紀錄計算（只有拿到回應的呼叫才會計費與記錄）。
// 「每天」以台灣時間 0 點起算。同時送出多個請求時可能略為超過，這個規模可以接受。

// 每位使用者每天的次數；照片與營養標示分析共用一個額度
export const DAILY_LIMITS = {
  plan: 3,
  food_image: 20,
  food_name: 60,
} as const
export type LimitGroup = keyof typeof DAILY_LIMITS

const GROUP_FEATURES: Record<LimitGroup, AiFeature[]> = {
  plan: ['plan'],
  food_image: ['food_photo', 'food_label'],
  food_name: ['food_name'],
}

export function limitGroupOf(feature: AiFeature): LimitGroup {
  return feature === 'plan' ? 'plan' : feature === 'food_name' ? 'food_name' : 'food_image'
}

// 短時間內的總次數（所有 AI 功能合計），擋下連續狂按或腳本
export const BURST_LIMIT = { calls: 15, minutes: 10 }

// 全站每天的總次數，作為費用的最後一道保險；可用環境變數 AI_DAILY_GLOBAL_LIMIT 調整
export function globalDailyLimit(): number {
  const n = Number(process.env.AI_DAILY_GLOBAL_LIMIT)
  return Number.isInteger(n) && n > 0 ? n : 500
}

export type LimitResult = { ok: true } | { ok: false; reason: 'daily' | 'burst' | 'global'; limit: number }

function taipeiDayStart(): Date {
  // 台灣沒有日光節約時間，固定 +08:00
  return new Date(`${todayISO()}T00:00:00+08:00`)
}

export async function checkAiLimit(session: Session, feature: AiFeature): Promise<LimitResult> {
  const dayStart = taipeiDayStart()
  const burstStart = new Date(Date.now() - BURST_LIMIT.minutes * 60 * 1000)
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

  const global = globalDailyLimit()
  if (row.global >= global) return { ok: false, reason: 'global', limit: global }
  // 管理員測試時不受個人上限限制，但仍受全站上限保護
  if (session.role === 'admin') return { ok: true }
  if (row.burst >= BURST_LIMIT.calls) return { ok: false, reason: 'burst', limit: BURST_LIMIT.calls }
  if (row.userDay >= DAILY_LIMITS[group]) return { ok: false, reason: 'daily', limit: DAILY_LIMITS[group] }
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
