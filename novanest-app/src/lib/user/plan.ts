// Free／Pro 方案。目前由管理員在後台手動開通 Pro，可設定到期日；到期後自動視為 Free。
export const PLANS = ['free', 'pro'] as const
export type Plan = (typeof PLANS)[number]

export function isPlan(v: unknown): v is Plan {
  return typeof v === 'string' && (PLANS as readonly string[]).includes(v)
}

// 實際適用的方案：Pro 已過期就是 Free
export function effectivePlan(plan: string, proUntil: Date | null, now = new Date()): Plan {
  if (plan !== 'pro') return 'free'
  return proUntil === null || proUntil > now ? 'pro' : 'free'
}
