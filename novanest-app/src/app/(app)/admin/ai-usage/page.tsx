import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAiUsageReport, USAGE_PERIODS, type UsageTotals } from '@/lib/admin/queries'
import { requireAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { formatInt, formatUsd, tableClass, tdClass, thClass } from '../format'

export const instant = false

export default async function AdminAiUsagePage(props: PageProps<'/admin/ai-usage'>) {
  if (!(await requireAdmin())) notFound()
  const params = await props.searchParams
  const days = USAGE_PERIODS.find((d) => String(d) === params.days) ?? 30

  const [report, { t }] = await Promise.all([getAiUsageReport(days), getI18n()])
  const tg = t.admin.usage
  const dayRows = [...report.byDay.entries()].sort(([a], [b]) => b.localeCompare(a))
  const modelRows = [...report.byModel.entries()].sort(([, a], [, b]) => b.costUsd - a.costUsd)
  const featureRows = [...report.byFeature.entries()].sort(([, a], [, b]) => b.costUsd - a.costUsd)

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={tg.periodLabel}>
        {USAGE_PERIODS.map((d) => (
          <Link
            key={d}
            href={`/admin/ai-usage?days=${d}`}
            aria-current={d === days ? 'page' : undefined}
            className={`border px-3 py-1.5 ${d === days ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`}
          >
            {tg.period(d)}
          </Link>
        ))}
      </div>

      <section>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          <Stat label={tg.calls} value={formatInt(report.total.calls)} />
          <Stat label={tg.cost} value={formatUsd(report.total.costUsd)} />
          <Stat label={tg.input} value={formatInt(report.total.inputTokens)} />
          <Stat label={tg.output} value={formatInt(report.total.outputTokens)} />
        </div>
        <p className="mt-2 text-xs text-muted">{tg.costNote}</p>
        {report.total.unpricedCalls > 0 && <p className="mt-1 text-xs text-muted">{tg.unpriced(report.total.unpricedCalls)}</p>}
      </section>

      {report.total.calls === 0 ? (
        <p className="border border-line p-8 text-center text-sm text-muted">{tg.empty}</p>
      ) : (
        <>
          <section>
            <h2 className="text-xl font-bold">{tg.byFeature}</h2>
            <UsageTable
              t={tg}
              firstColumn={tg.feature}
              rows={featureRows.map(([f, totals]) => ({ key: f, label: tg.features[f] ?? f, totals, failures: report.failures.get(f) ?? 0 }))}
              showFailures
            />
          </section>

          <section>
            <h2 className="text-xl font-bold">{tg.byModel}</h2>
            <UsageTable t={tg} firstColumn={tg.model} rows={modelRows.map(([m, totals]) => ({ key: m, label: m, totals }))} />
          </section>

          <section>
            <h2 className="text-xl font-bold">{tg.topUsers}</h2>
            <UsageTable
              t={tg}
              firstColumn={tg.user}
              rows={report.topUsers.map((u) => ({
                key: u.userId ?? 'deleted',
                label: u.username ?? tg.deletedUser,
                href: u.userId ? `/admin/users/${u.userId}` : undefined,
                totals: u.totals,
              }))}
            />
          </section>

          <section>
            <h2 className="text-xl font-bold">{tg.byDay}</h2>
            <UsageTable t={tg} firstColumn={tg.date} rows={dayRows.map(([d, totals]) => ({ key: d, label: d.replaceAll('-', '/'), totals }))} />
          </section>
        </>
      )}
    </div>
  )
}

type UsageText = Awaited<ReturnType<typeof getI18n>>['t']['admin']['usage']

function UsageTable({
  t,
  firstColumn,
  rows,
  showFailures = false,
}: {
  t: UsageText
  firstColumn: string
  rows: { key: string; label: string; href?: string; totals: UsageTotals; failures?: number }[]
  showFailures?: boolean
}) {
  const right = `${thClass} text-right`
  return (
    <div className="mt-4 overflow-x-auto">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>{firstColumn}</th>
            <th className={right}>{t.calls}</th>
            {showFailures && <th className={right}>{t.failures}</th>}
            <th className={right}>{t.input}</th>
            <th className={right}>{t.output}</th>
            <th className={right}>{t.cacheRead}</th>
            <th className={right}>{t.cost}</th>
            <th className={right}>{t.avgCost}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const td = `${tdClass} text-right`
            return (
              <tr key={r.key}>
                <td className={tdClass}>
                  {r.href ? (
                    <Link href={r.href} className="font-semibold underline-offset-4 hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    r.label
                  )}
                </td>
                <td className={td}>{formatInt(r.totals.calls)}</td>
                {showFailures && <td className={td}>{formatInt(r.failures ?? 0)}</td>}
                <td className={td}>{formatInt(r.totals.inputTokens)}</td>
                <td className={td}>{formatInt(r.totals.outputTokens)}</td>
                <td className={td}>{formatInt(r.totals.cacheReadTokens)}</td>
                <td className={td}>{formatUsd(r.totals.costUsd)}</td>
                <td className={td}>{r.totals.calls > 0 ? formatUsd(r.totals.costUsd / r.totals.calls) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <p className="text-xs font-semibold tracking-wider text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}
