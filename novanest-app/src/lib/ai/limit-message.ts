import type { Messages } from '@/lib/i18n/messages'
import type { LimitResult } from './limits'

type Blocked = Extract<LimitResult, { ok: false }>

// 上限提示：Free 使用者用完個人額度時，再補一句 Pro 的說明
export function limitMessage(t: Messages, result: Blocked, featureLabel: string): string {
  const base = t.aiLimit[result.reason](featureLabel, result.limit)
  const personal = result.reason === 'daily' || result.reason === 'monthly'
  return personal && result.plan === 'free' ? `${base}${t.aiLimit.upgrade}` : base
}
