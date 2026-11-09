import type { Messages } from '@/lib/i18n/messages'
import type { Plan } from '@/lib/user/plan'
import { formatDay } from './format'

// 方案標示：Pro 會加上到期日；已到期的顯示為 Free 並註明
export function PlanBadge({ plan, proUntil, expired, t }: { plan: Plan; proUntil: Date | null; expired: boolean; t: Messages }) {
  const ta = t.admin
  if (plan === 'pro') {
    return (
      <span className="whitespace-nowrap">
        <span className="border border-foreground px-1.5 py-0.5 text-xs font-bold">PRO</span>
        <span className="ml-2 text-xs text-muted">{proUntil ? ta.planUntil(formatDay(proUntil, ta.never)) : ta.planNoExpiry}</span>
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-sm">
      Free
      {expired && <span className="ml-2 text-xs text-muted">{ta.planExpired}</span>}
    </span>
  )
}
