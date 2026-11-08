import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOverview } from '@/lib/admin/queries'
import { requireAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { addDays, todayISO } from '@/lib/training/dates'
import { formatInt, formatUsd } from './format'

export const instant = false

export default async function AdminOverviewPage() {
  // layout 與 page 會平行渲染，所以每一頁都要自己檢查權限
  if (!(await requireAdmin())) notFound()
  const [data, { t }] = await Promise.all([getOverview(), getI18n()])
  const to = t.admin.overview

  const today = todayISO()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const maxSignups = Math.max(1, ...days.map((d) => data.signups.get(d) ?? 0))

  return (
    <div className="space-y-12">
      <section>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          <Stat label={to.users} value={formatInt(data.users.total)} />
          <Stat label={to.new7} value={formatInt(data.users.new7)} />
          <Stat label={to.new30} value={formatInt(data.users.new30)} />
          <Stat label={to.active7} value={formatInt(data.active7)} hint={to.activeHint} />
          <Stat label={to.disabled} value={formatInt(data.users.disabled)} />
          <Stat label={to.admins} value={formatInt(data.users.admins)} />
        </div>
        <Link href="/admin/users" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
          {to.viewUsers} →
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-bold">{to.ai30}</h2>
        <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
          <Stat label={to.calls} value={formatInt(data.ai30.calls)} />
          <Stat label={to.cost} value={formatUsd(data.ai30.costUsd)} />
          <Stat label={to.tokens} value={`${formatInt(data.ai30.inputTokens)} / ${formatInt(data.ai30.outputTokens)}`} />
        </div>
        {data.ai30.unpricedCalls > 0 && <p className="mt-2 text-xs text-muted">{t.admin.usage.unpriced(data.ai30.unpricedCalls)}</p>}
        <Link href="/admin/ai-usage" className="mt-4 inline-block text-sm font-semibold underline-offset-4 hover:underline">
          {to.viewUsage} →
        </Link>
      </section>

      <section>
        <h2 className="text-xl font-bold">{to.records}</h2>
        <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          <Stat label={to.workouts} value={formatInt(data.records.workouts)} />
          <Stat label={to.foods} value={formatInt(data.records.foods)} />
          <Stat label={to.photos} value={formatInt(data.records.photos)} />
          <Stat label={to.plans} value={formatInt(data.records.plans)} />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold">{to.signups}</h2>
        <ol className="mt-6 flex h-40 items-end gap-1 sm:gap-2">
          {days.map((d) => {
            const n = data.signups.get(d) ?? 0
            return (
              <li key={d} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${d}: ${n}`}>
                <span className="text-xs tabular-nums text-muted">{n > 0 ? n : ''}</span>
                <span className="w-full bg-foreground" style={{ height: `${(n / maxSignups) * 100}%`, minHeight: n > 0 ? 2 : 0 }} />
                <span className="w-full border-t border-line pt-1 text-center text-[10px] tabular-nums text-muted">{d.slice(8)}</span>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background p-5">
      <p className="text-xs font-semibold tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}
