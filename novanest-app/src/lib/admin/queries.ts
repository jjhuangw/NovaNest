import 'server-only'
import { and, count, desc, eq, getTableName, gte, ilike, isNotNull, or, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db/client'
import { aiUsage, bodyPhotos, foodEntries, trainingPlans, users, workoutLogs } from '@/lib/db/schema'
import { estimateCostUsd, type TokenCounts } from '@/lib/ai/pricing'
import { TIME_ZONE } from '@/lib/training/dates'

// 資料庫的 timestamp 不含時區，以 UTC 儲存；依台灣時間分日
// 子查詢裡的欄位要寫成「資料表.欄位」：Drizzle 在只查一張表時不會加上資料表名稱，
// 於是子查詢裡的 "id" 會被當成子查詢那張表的欄位（例如 workout_logs.id），條件永遠對不上。
const qualified = (column: PgColumn) => sql`${sql.identifier(getTableName(column.table))}.${sql.identifier(column.name)}`
const userId = qualified(users.id)

const taipeiDay = (col: AnyColumn) =>
  sql<string>`to_char((${col} at time zone 'UTC') at time zone ${TIME_ZONE}, 'YYYY-MM-DD')`

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000)

const tokenSums = {
  calls: sql<number>`count(*)::int`,
  inputTokens: sql<number>`coalesce(sum(${aiUsage.inputTokens}), 0)::int`,
  outputTokens: sql<number>`coalesce(sum(${aiUsage.outputTokens}), 0)::int`,
  cacheReadTokens: sql<number>`coalesce(sum(${aiUsage.cacheReadTokens}), 0)::int`,
  cacheWriteTokens: sql<number>`coalesce(sum(${aiUsage.cacheWriteTokens}), 0)::int`,
}

export interface UsageTotals extends TokenCounts {
  calls: number
  // 有未知模型的呼叫時，金額只計算已知模型的部分
  costUsd: number
  unpricedCalls: number
}

function emptyTotals(): UsageTotals {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd: 0, unpricedCalls: 0 }
}

// 價格依模型而異，所以先在 SQL 依模型分組，再於這裡加總金額
function addRow(total: UsageTotals, row: TokenCounts & { calls: number; model: string }) {
  total.calls += row.calls
  total.inputTokens += row.inputTokens
  total.outputTokens += row.outputTokens
  total.cacheReadTokens += row.cacheReadTokens
  total.cacheWriteTokens += row.cacheWriteTokens
  const cost = estimateCostUsd(row.model, row)
  if (cost === null) total.unpricedCalls += row.calls
  else total.costUsd += cost
}

function groupTotals<K extends string>(rows: (TokenCounts & { calls: number; model: string } & Record<K, string>)[], key: K) {
  const map = new Map<string, UsageTotals>()
  for (const row of rows) {
    const k = row[key]
    if (!map.has(k)) map.set(k, emptyTotals())
    addRow(map.get(k)!, row)
  }
  return map
}

// ---------- 總覽 ----------

export async function getOverview() {
  const since7 = daysAgo(7)
  const since30 = daysAgo(30)
  const since14 = daysAgo(14)

  const [userStats, active, records, usageRows, signups] = await Promise.all([
    db
      .select({
        total: count(),
        new7: sql<number>`count(*) filter (where ${users.createdAt} >= ${since7})::int`,
        new30: sql<number>`count(*) filter (where ${users.createdAt} >= ${since30})::int`,
        disabled: sql<number>`count(*) filter (where ${users.disabledAt} is not null)::int`,
        admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
        pro: sql<number>`count(*) filter (where ${users.plan} = 'pro' and (${users.proUntil} is null or ${users.proUntil} > now()))::int`,
      })
      .from(users),
    // 近 7 天有任何紀錄（訓練、飲食、照片）的使用者
    db.execute<{ n: number }>(sql`
      select count(distinct user_id)::int as n from (
        select ${workoutLogs.userId} as user_id from ${workoutLogs} where ${workoutLogs.updatedAt} >= ${since7}
        union all select ${foodEntries.userId} from ${foodEntries} where ${foodEntries.createdAt} >= ${since7}
        union all select ${bodyPhotos.userId} from ${bodyPhotos} where ${bodyPhotos.createdAt} >= ${since7}
      ) a`),
    db.execute<{ workouts: number; foods: number; photos: number; plans: number }>(sql`
      select
        (select count(*)::int from ${workoutLogs}) as workouts,
        (select count(*)::int from ${foodEntries}) as foods,
        (select count(*)::int from ${bodyPhotos}) as photos,
        (select count(*)::int from ${trainingPlans}) as plans`),
    db
      .select({ model: aiUsage.model, ...tokenSums })
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, since30))
      .groupBy(aiUsage.model),
    db
      .select({ day: taipeiDay(users.createdAt), n: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, since14))
      .groupBy(sql`1`),
  ])

  const ai30 = emptyTotals()
  for (const row of usageRows) addRow(ai30, row)

  return {
    users: userStats[0],
    active7: active.rows[0]?.n ?? 0,
    records: records.rows[0],
    ai30,
    signups: new Map(signups.map((s) => [s.day, s.n])),
  }
}

// ---------- 使用者列表 ----------

export const USERS_PAGE_SIZE = 50

const lastActiveAt = sql`greatest(
  (select max(${qualified(workoutLogs.updatedAt)}) from ${workoutLogs} where ${qualified(workoutLogs.userId)} = ${userId}),
  (select max(${qualified(foodEntries.createdAt)}) from ${foodEntries} where ${qualified(foodEntries.userId)} = ${userId}),
  (select max(${qualified(bodyPhotos.createdAt)}) from ${bodyPhotos} where ${qualified(bodyPhotos.userId)} = ${userId})
)`.mapWith(users.createdAt)

export type UserFilter = 'all' | 'pro' | 'admin' | 'disabled'

export async function listUsers({ q, filter, page }: { q: string; filter: UserFilter; page: number }) {
  const conditions: SQL[] = []
  if (q) {
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    conditions.push(or(ilike(users.username, pattern), ilike(users.email, pattern))!)
  }
  if (filter === 'admin') conditions.push(eq(users.role, 'admin'))
  if (filter === 'disabled') conditions.push(isNotNull(users.disabledAt))
  // 目前有效的 Pro（未到期）
  if (filter === 'pro') conditions.push(sql`${qualified(users.plan)} = 'pro' and (${qualified(users.proUntil)} is null or ${qualified(users.proUntil)} > now())`)
  const where = conditions.length ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        plan: users.plan,
        proUntil: users.proUntil,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
        lastSeenAt: users.lastSeenAt,
        lastActiveAt,
        workouts: sql<number>`(select count(*)::int from ${workoutLogs} where ${qualified(workoutLogs.userId)} = ${userId})`,
        foods: sql<number>`(select count(*)::int from ${foodEntries} where ${qualified(foodEntries.userId)} = ${userId})`,
        aiCalls: sql<number>`(select count(*)::int from ${aiUsage} where ${qualified(aiUsage.userId)} = ${userId})`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(USERS_PAGE_SIZE)
      .offset((page - 1) * USERS_PAGE_SIZE),
    db.select({ total: count() }).from(users).where(where),
  ])
  return { rows, total }
}

// ---------- 單一使用者 ----------

export async function getUserDetail(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      plan: users.plan,
      proUntil: users.proUntil,
      gender: users.gender,
      birthYear: users.birthYear,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      lastSeenAt: users.lastSeenAt,
      lastActiveAt,
      workouts: sql<number>`(select count(*)::int from ${workoutLogs} where ${qualified(workoutLogs.userId)} = ${userId})`,
      foods: sql<number>`(select count(*)::int from ${foodEntries} where ${qualified(foodEntries.userId)} = ${userId})`,
      photos: sql<number>`(select count(*)::int from ${bodyPhotos} where ${qualified(bodyPhotos.userId)} = ${userId})`,
      plans: sql<number>`(select count(*)::int from ${trainingPlans} where ${qualified(trainingPlans.userId)} = ${userId})`,
    })
    .from(users)
    .where(eq(users.id, userId))
  if (!user) return null

  const usageRows = await db
    .select({ feature: aiUsage.feature, model: aiUsage.model, ...tokenSums })
    .from(aiUsage)
    .where(eq(aiUsage.userId, userId))
    .groupBy(aiUsage.feature, aiUsage.model)
  const total = emptyTotals()
  for (const row of usageRows) addRow(total, row)

  return { user, ai: { total, byFeature: groupTotals(usageRows, 'feature') } }
}

// ---------- AI 用量 ----------

export const USAGE_PERIODS = [7, 30, 90] as const
export type UsagePeriod = (typeof USAGE_PERIODS)[number]

export async function getAiUsageReport(days: UsagePeriod) {
  const since = daysAgo(days)
  const inPeriod = gte(aiUsage.createdAt, since)

  const [byFeatureModel, byDay, byUser, failures] = await Promise.all([
    db
      .select({ feature: aiUsage.feature, model: aiUsage.model, ...tokenSums })
      .from(aiUsage)
      .where(inPeriod)
      .groupBy(aiUsage.feature, aiUsage.model),
    db
      .select({ day: taipeiDay(aiUsage.createdAt), model: aiUsage.model, ...tokenSums })
      .from(aiUsage)
      .where(inPeriod)
      .groupBy(sql`1`, aiUsage.model),
    db
      .select({
        userId: aiUsage.userId,
        username: users.username,
        email: users.email,
        model: aiUsage.model,
        ...tokenSums,
      })
      .from(aiUsage)
      .leftJoin(users, eq(users.id, aiUsage.userId))
      .where(inPeriod)
      .groupBy(aiUsage.userId, users.username, users.email, aiUsage.model),
    db
      .select({ feature: aiUsage.feature, n: sql<number>`count(*)::int` })
      .from(aiUsage)
      .where(and(inPeriod, eq(aiUsage.success, false)))
      .groupBy(aiUsage.feature),
  ])

  const total = emptyTotals()
  for (const row of byFeatureModel) addRow(total, row)

  // 使用者刪除後 user_id 為 null，合併成一列
  const userRows = byUser.map((r) => ({ ...r, key: r.userId ?? '' }))
  const users_ = groupTotals(userRows, 'key')
  const names = new Map(userRows.map((r) => [r.key, { username: r.username, email: r.email }]))
  const topUsers = [...users_.entries()]
    .map(([id, totals]) => ({ userId: id || null, username: names.get(id)?.username ?? null, email: names.get(id)?.email ?? null, totals }))
    .sort((a, b) => b.totals.costUsd - a.totals.costUsd || b.totals.calls - a.totals.calls)
    .slice(0, 20)

  return {
    total,
    byFeature: groupTotals(byFeatureModel, 'feature'),
    byModel: groupTotals(byFeatureModel, 'model'),
    byDay: groupTotals(byDay, 'day'),
    failures: new Map(failures.map((f) => [f.feature, f.n])),
    topUsers,
  }
}
