import type { AiLimits, LimitGroup, Period } from '@/lib/ai/limits'
import { LIMIT_GROUPS } from '@/lib/ai/limits'
import type { Session } from '@/lib/auth/session'
import type { Messages } from '@/lib/i18n/messages'
import { isoDateOf } from '@/lib/training/dates'

// 設定頁的「方案」：目前方案、到期日，以及這個期間各 AI 功能與照片的使用量
export default function PlanSummary({
  session,
  limits,
  usage,
  photos,
  t,
}: {
  session: Session
  limits: AiLimits
  usage: Record<LimitGroup, Record<Period, number>>
  photos: number
  t: Messages
}) {
  const tp = t.plans
  const tier = limits.tiers[session.plan]
  const rows = [
    ...LIMIT_GROUPS.map((g) => ({
      key: g,
      label: t.aiLimit.features[g],
      used: usage[g][tier[g].period],
      limit: tier[g].count,
      period: tp.periods[tier[g].period],
    })),
    { key: 'photos', label: tp.photos, used: photos, limit: tier.photos, period: tp.total },
  ]

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="text-2xl font-bold">{tp.names[session.plan]}</span>
        {session.plan === 'pro' && (
          <span className="text-sm text-muted">{session.proUntil ? tp.until(isoDateOf(session.proUntil).replaceAll('-', '/')) : tp.noExpiry}</span>
        )}
        {session.role === 'admin' && <span className="text-xs text-muted">{tp.adminNote}</span>}
      </p>

      <table className="mt-5 w-full text-sm">
        <caption className="sr-only">{tp.usageCaption}</caption>
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="pb-2 font-semibold">{tp.feature}</th>
            <th className="pb-2 font-semibold">{tp.period}</th>
            <th className="pb-2 text-right font-semibold">{tp.used}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const full = r.used >= r.limit
            return (
              <tr key={r.key}>
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  {r.label}
                </th>
                <td className="py-2.5 pr-3 text-muted">{r.period}</td>
                <td className={`py-2.5 text-right tabular-nums ${full ? 'font-semibold text-accent' : ''}`}>
                  {r.used.toLocaleString('en-US')} / {r.limit.toLocaleString('en-US')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {session.plan === 'free' && (
        <div className="mt-6 border border-line bg-stone p-4 text-sm">
          <p className="font-semibold">{tp.proTitle}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            {tp.proPerks.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="mt-3">{tp.contact}</p>
        </div>
      )}
    </div>
  )
}
