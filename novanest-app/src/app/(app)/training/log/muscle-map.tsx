import { formatRate } from '@/lib/training/completion'
import { formatSets, type MuscleStatus, type MuscleVolume } from '@/lib/training/muscles'
import { MUSCLES } from '@/lib/training/plan'
import type { Messages } from '@/lib/i18n/messages'
import type { Gender } from '@/lib/user/profile'
import BodyFigures, { type MuscleFill } from './body-figures'

// 狀態色一定搭配圖示與文字，不單靠顏色。「尚未排到」的灰色依主題調整（CSS 變數）
const STATUS: Record<MuscleStatus, { color: string; icon: string }> = {
  good: { color: '#0ca30c', icon: '✓' },
  warning: { color: '#fab219', icon: '△' },
  critical: { color: '#d03b3b', icon: '✕' },
  upcoming: { color: 'var(--status-upcoming)', icon: '–' },
}

export default function MuscleMap({
  volumes,
  weekLabel,
  gender,
  t,
}: {
  volumes: MuscleVolume[]
  weekLabel: string
  gender: Gender
  t: Messages
}) {
  const m = t.muscleMap
  const describe = (v: MuscleVolume) =>
    m.describe(t.muscles[v.muscle], formatSets(v.completed), formatSets(v.weekTarget), formatRate(v.weekRate), STATUS[v.status].icon, m.status[v.status])
  const planned = new Set(volumes.map((v) => v.muscle))
  // SVG 無法用 CSS 變數，所以只傳狀態，由 BodyFigures 依主題挑顏色；null 代表本週未安排
  const fills: MuscleFill[] = [
    ...volumes.map((v) => ({ muscle: v.muscle, status: v.status, description: describe(v) })),
    ...MUSCLES.filter((x) => !planned.has(x)).map((x) => ({ muscle: x, status: null, description: m.unplanned(t.muscles[x]) })),
  ]
  const summary = volumes.map((v) => `${t.muscles[v.muscle]} ${formatRate(v.weekRate)} ${m.status[v.status]}`).join(m.listSeparator)

  return (
    <section aria-labelledby="muscle-heading" className="mt-12">
      <h2 id="muscle-heading" className="text-xl font-bold">
        {m.heading}
      </h2>
      <p className="mt-1 text-xs text-muted">{m.intro(weekLabel)}</p>

      <p className="sr-only">{m.summary(summary)}</p>
      <BodyFigures gender={gender} fills={fills} />

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {(Object.keys(STATUS) as MuscleStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: STATUS[s].color }} />
            {STATUS[s].icon} {m.status[s]}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-foreground" />
          {m.dueMarker}
        </li>
      </ul>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">{m.tableCaption}</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">{m.colMuscle}</th>
            <th scope="col">{m.colProgress}</th>
            <th scope="col">{m.colSets}</th>
            <th scope="col">{m.colStatus}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {volumes.map((v) => {
            const s = STATUS[v.status]
            return (
              <tr key={v.muscle}>
                <th scope="row" className="w-24 py-2.5 pr-2 text-left font-semibold leading-tight">
                  {t.muscles[v.muscle]}
                </th>
                <td className="py-2.5 pr-3">
                  <div className="relative h-1.5 rounded-full bg-track">
                    <div className="h-full rounded-full" style={{ width: `${v.weekRate * 100}%`, background: s.color }} />
                    {v.due > 0 && v.due < v.weekTarget && (
                      <span
                        title={m.dueTitle(formatSets(v.due))}
                        className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-foreground"
                        style={{ left: `${(v.due / v.weekTarget) * 100}%` }}
                      />
                    )}
                  </div>
                </td>
                <td className="w-24 whitespace-nowrap py-2.5 text-right tabular-nums">
                  {formatSets(v.completed)} / {formatSets(v.weekTarget)}
                  <span className="ml-1 text-muted">{formatRate(v.weekRate)}</span>
                </td>
                <td className="w-20 whitespace-nowrap py-2.5 pl-3 text-xs">
                  <span aria-hidden className={`mr-1 ${v.status === 'warning' ? 'text-warning-text' : ''}`} style={v.status === 'warning' ? undefined : { color: s.color }}>
                    {s.icon}
                  </span>
                  {m.status[v.status]}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">{m.footnote}</p>
    </section>
  )
}
