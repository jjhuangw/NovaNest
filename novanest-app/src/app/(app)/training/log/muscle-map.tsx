import { formatRate } from '@/lib/training/completion'
import { formatSets, type MuscleStatus, type MuscleVolume } from '@/lib/training/muscles'
import { MUSCLE_LABELS, MUSCLES } from '@/lib/training/plan'
import type { Gender } from '@/lib/user/profile'
import BodyFigures, { type MuscleFill } from './body-figures'

// 狀態色（固定，不跟主題變動）；一定搭配圖示與文字，不單靠顏色
const STATUS: Record<MuscleStatus, { color: string; icon: string; label: string }> = {
  good: { color: '#0ca30c', icon: '✓', label: '足夠' },
  warning: { color: '#fab219', icon: '△', label: '接近' },
  critical: { color: '#d03b3b', icon: '✕', label: '不足' },
  upcoming: { color: '#c3c2b7', icon: '–', label: '尚未排到' },
}
const UNPLANNED = '#dddcd6'

function describe(v: MuscleVolume) {
  const s = STATUS[v.status]
  return `${MUSCLE_LABELS[v.muscle]}：${formatSets(v.completed)} / ${formatSets(v.weekTarget)} 組（${formatRate(v.weekRate)}）・${s.icon} ${s.label}`
}

export default function MuscleMap({ volumes, weekLabel, gender }: { volumes: MuscleVolume[]; weekLabel: string; gender: Gender }) {
  const planned = new Set(volumes.map((v) => v.muscle))
  const fills: MuscleFill[] = [
    ...volumes.map((v) => ({ muscle: v.muscle, color: STATUS[v.status].color, description: describe(v) })),
    ...MUSCLES.filter((m) => !planned.has(m)).map((m) => ({ muscle: m, color: UNPLANNED, description: `${MUSCLE_LABELS[m]}：本週課表未安排` })),
  ]
  const summary = volumes.map((v) => `${MUSCLE_LABELS[v.muscle]} ${formatRate(v.weekRate)} ${STATUS[v.status].label}`).join('、')

  return (
    <section aria-labelledby="muscle-heading" className="mt-12">
      <h2 id="muscle-heading" className="text-xl font-bold">
        肌群訓練量
      </h2>
      <p className="mt-1 text-xs text-muted">
        {weekLabel}・完成組數 ÷ 本週課表組數；顏色表示是否跟上到今天為止應完成的進度
      </p>

      <p className="sr-only">肌群訓練量：{summary}</p>
      <BodyFigures gender={gender} fills={fills} />

      <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {(Object.keys(STATUS) as MuscleStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: STATUS[s].color }} />
            {STATUS[s].icon} {STATUS[s].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="h-3 w-0.5 bg-foreground" />
          到今天應完成的位置
        </li>
      </ul>

      <table className="mt-6 w-full text-sm">
        <caption className="sr-only">各肌群本週完成組數</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">肌群</th>
            <th scope="col">本週累積</th>
            <th scope="col">完成組數</th>
            <th scope="col">狀態</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {volumes.map((v) => {
            const s = STATUS[v.status]
            return (
              <tr key={v.muscle}>
                <th scope="row" className="w-20 py-2.5 text-left font-semibold">
                  {MUSCLE_LABELS[v.muscle]}
                </th>
                <td className="py-2.5 pr-3">
                  <div className="relative h-1.5 rounded-full bg-[#ecebe7]">
                    <div className="h-full rounded-full" style={{ width: `${v.weekRate * 100}%`, background: s.color }} />
                    {v.due > 0 && v.due < v.weekTarget && (
                      <span
                        title={`到今天應完成 ${formatSets(v.due)} 組`}
                        className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 bg-foreground"
                        style={{ left: `${(v.due / v.weekTarget) * 100}%` }}
                      />
                    )}
                  </div>
                </td>
                <td className="w-24 py-2.5 text-right tabular-nums">
                  {formatSets(v.completed)} / {formatSets(v.weekTarget)}
                  <span className="ml-1 text-muted">{formatRate(v.weekRate)}</span>
                </td>
                <td className="w-20 whitespace-nowrap py-2.5 pl-3 text-xs">
                  <span aria-hidden className="mr-1" style={{ color: v.status === 'warning' ? '#b07a00' : s.color }}>
                    {s.icon}
                  </span>
                  {s.label}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted">主要肌群每組計 1、次要肌群計 0.5（例如上斜臥推：胸 1、肩 0.5、三頭 0.5）。</p>
    </section>
  )
}
