import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAiUsageReport, USAGE_PERIODS, type UsageTotals } from '@/lib/admin/queries'
import { getAiLimits, globalUsageToday, LIMIT_GROUPS, PERIODS } from '@/lib/ai/limits'
import { PLANS } from '@/lib/user/plan'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import { saveAiLimitsAction } from '../actions'
import { loadForAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { formatInt, formatUsd, tableClass, tdClass, thClass } from '../format'

export const instant = false

export default async function AdminAiUsagePage(props: PageProps<'/admin/ai-usage'>) {
  const params = await props.searchParams
  const days = USAGE_PERIODS.find((d) => String(d) === params.days) ?? 30

  const result = await loadForAdmin(() => Promise.all([getAiUsageReport(days), globalUsageToday(), getAiLimits(), getI18n()]))
  if (!result) notFound()
  const [report, todayCalls, limits, { t }] = result.data
  const savedAt = typeof params.limitsSaved === 'string' ? params.limitsSaved : null
  const limitsError = params.limitsError === '1' ? 'invalid' : params.limitsError === 'table' ? 'table' : null
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

      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={tg.limits.saved} />}

      {/* 使用上限：存在 app_settings，修改後立即生效 */}
      <section className="border border-line p-5 text-sm">
        <h2 className="font-bold">{tg.limits.title}</h2>
        <p className="mt-1 text-xs text-muted">{tg.limits.hint}</p>
        <p className="mt-3 font-semibold">{tg.limits.global(todayCalls, limits.globalDaily)}</p>
        <form action={saveAiLimitsAction} className="mt-5">
          <input type="hidden" name="days" value={days} />
          <fieldset>
            <legend className="mb-2 text-xs font-semibold tracking-wider text-muted">{tg.limits.perUserTitle}</legend>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <thead>
                  <tr>
                    <th className="border-b border-line py-2 pr-3 text-xs font-semibold text-muted">{tg.feature}</th>
                    {PLANS.map((plan) => (
                      <th key={plan} className="border-b border-line px-2 py-2 text-xs font-semibold text-muted">
                        {t.plans.names[plan]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LIMIT_GROUPS.map((g) => (
                    <tr key={g}>
                      <th scope="row" className="border-b border-line py-2 pr-3 font-normal">
                        {t.aiLimit.features[g]}
                      </th>
                      {PLANS.map((plan) => (
                        <td key={plan} className="border-b border-line px-2 py-2">
                          <div className="flex items-center gap-2">
                            <NumberInput name={`${plan}.${g}.count`} value={limits.tiers[plan][g].count} max={10000} label={`${t.plans.names[plan]} ${t.aiLimit.features[g]}`} />
                            <select
                              name={`${plan}.${g}.period`}
                              defaultValue={limits.tiers[plan][g].period}
                              aria-label={`${t.plans.names[plan]} ${t.aiLimit.features[g]} ${tg.limits.periodLabel}`}
                              className="min-h-11 border border-line bg-surface px-2 text-sm focus:border-foreground focus:outline-none"
                            >
                              {PERIODS.map((p) => (
                                <option key={p} value={p}>
                                  {tg.limits.periods[p]}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row" className="py-2 pr-3 font-normal">
                      {tg.limits.photos}
                    </th>
                    {PLANS.map((plan) => (
                      <td key={plan} className="px-2 py-2">
                        <NumberInput name={`${plan}.photos`} value={limits.tiers[plan].photos} max={10000} label={`${t.plans.names[plan]} ${tg.limits.photos}`} />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </fieldset>
          <fieldset className="mt-5">
            <legend className="mb-2 text-xs font-semibold tracking-wider text-muted">{tg.limits.otherTitle}</legend>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <LimitField name="burst.calls" label={tg.limits.burstCalls} value={limits.burst.calls} min={1} max={1000} />
              <LimitField name="burst.minutes" label={tg.limits.burstMinutes} value={limits.burst.minutes} min={1} max={1440} />
              <LimitField name="globalDaily" label={tg.limits.globalDaily} value={limits.globalDaily} min={1} max={100000} />
            </div>
          </fieldset>
          <p className="mt-3 text-xs text-muted">{tg.limits.zeroHint}</p>
          {limitsError && (
            <p className="mt-3 border-l-2 border-accent bg-stone px-3 py-2 text-accent">{limitsError === 'table' ? tg.limits.noTable : tg.limits.invalid}</p>
          )}
          <SubmitButton label={tg.limits.save} />
        </form>
      </section>

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
                sub: u.email ?? undefined,
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
  // sub：名稱可能重複，使用者列表以 Email 區分
  rows: { key: string; label: string; sub?: string; href?: string; totals: UsageTotals; failures?: number }[]
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
                  {r.sub && <span className="block text-xs text-muted">{r.sub}</span>}
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

function LimitField({ name, label, value, min = 0, max }: { name: string; label: string; value: number; min?: number; max: number }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs">{label}</span>
      <input
        type="number"
        name={name}
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        required
        defaultValue={value}
        className="block min-h-11 w-full border border-line bg-surface px-3 py-2 text-sm tabular-nums focus:border-foreground focus:outline-none"
      />
    </label>
  )
}

function NumberInput({ name, value, max, label }: { name: string; value: number; max: number; label: string }) {
  return (
    <input
      type="number"
      name={name}
      inputMode="numeric"
      min={0}
      max={max}
      step={1}
      required
      defaultValue={value}
      aria-label={label}
      className="block min-h-11 w-24 border border-line bg-surface px-3 py-2 text-sm tabular-nums focus:border-foreground focus:outline-none"
    />
  )
}
