import { formatRate } from '@/lib/training/completion'
import { formatSets, type MuscleStatus, type MuscleVolume } from '@/lib/training/muscles'
import { MUSCLE_LABELS, type Muscle } from '@/lib/training/plan'

// 狀態色（固定，不跟主題變動）；一定搭配圖示與文字，不單靠顏色
const STATUS: Record<MuscleStatus, { color: string; icon: string; label: string }> = {
  good: { color: '#0ca30c', icon: '✓', label: '足夠' },
  warning: { color: '#fab219', icon: '△', label: '接近' },
  critical: { color: '#d03b3b', icon: '✕', label: '不足' },
  upcoming: { color: '#c3c2b7', icon: '–', label: '尚未排到' },
}
const SILHOUETTE = '#ecebe7'
const UNPLANNED = '#dddcd6'

type Shape = { d: string } | { rect: [number, number, number, number, number] } | { ellipse: [number, number, number, number] }

// 正面與背面的簡化人形（viewBox 單位，寬 100、高 210）
const FRONT: [Muscle, Shape[]][] = [
  ['shoulders', [{ ellipse: [33, 38, 8, 7] }, { ellipse: [67, 38, 8, 7] }]],
  ['chest', [{ d: 'M37,33 H49.2 V50 Q43,53 37,49 Z' }, { d: 'M50.8,33 H63 V49 Q57,53 50.8,50 Z' }]],
  ['biceps', [{ rect: [22, 46, 8, 23, 4] }, { rect: [70, 46, 8, 23, 4] }]],
  ['core', [{ rect: [40, 54, 20, 32, 4] }]],
  ['quads', [{ rect: [36, 102, 13, 50, 6] }, { rect: [51, 102, 13, 50, 6] }]],
]
const BACK: [Muscle, Shape[]][] = [
  ['shoulders', [{ ellipse: [33, 38, 8, 7] }, { ellipse: [67, 38, 8, 7] }]],
  ['back', [{ d: 'M37,32 H63 L60,72 Q50,80 40,72 Z' }]],
  ['triceps', [{ rect: [22, 46, 8, 23, 4] }, { rect: [70, 46, 8, 23, 4] }]],
  [
    'posterior',
    [{ rect: [37, 88, 12.5, 15, 5] }, { rect: [50.5, 88, 12.5, 15, 5] }, { rect: [36, 105, 13, 47, 6] }, { rect: [51, 105, 13, 47, 6] }],
  ],
  ['calves', [{ rect: [37.5, 157, 10, 28, 5] }, { rect: [52.5, 157, 10, 28, 5] }]],
]

function ShapeEl({ shape, fill }: { shape: Shape; fill: string }) {
  const common = { fill, stroke: '#ffffff', strokeWidth: 1.5 }
  if ('d' in shape) return <path d={shape.d} {...common} />
  if ('rect' in shape) {
    const [x, y, width, height, rx] = shape.rect
    return <rect x={x} y={y} width={width} height={height} rx={rx} {...common} />
  }
  const [cx, cy, rx, ry] = shape.ellipse
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...common} />
}

function Silhouette() {
  return (
    <g fill={SILHOUETTE}>
      <ellipse cx={50} cy={14} rx={9} ry={11} />
      <rect x={45} y={23} width={10} height={9} rx={2} />
      <path d="M28,33 Q50,27 72,33 L66,88 H34 Z" />
      <rect x={21} y={42} width={10} height={30} rx={5} />
      <rect x={69} y={42} width={10} height={30} rx={5} />
      <rect x={19} y={71} width={9} height={27} rx={4.5} />
      <rect x={72} y={71} width={9} height={27} rx={4.5} />
      <circle cx={23.5} cy={101} r={4} />
      <circle cx={76.5} cy={101} r={4} />
      <path d="M34,86 H66 L64,104 H36 Z" />
      <rect x={35} y={100} width={15} height={56} rx={7} />
      <rect x={50} y={100} width={15} height={56} rx={7} />
      <rect x={37} y={154} width={11} height={42} rx={5.5} />
      <rect x={52} y={154} width={11} height={42} rx={5.5} />
      <ellipse cx={42} cy={200} rx={6} ry={3} />
      <ellipse cx={58} cy={200} rx={6} ry={3} />
    </g>
  )
}

function regionTitle(v: MuscleVolume | undefined, muscle: Muscle) {
  if (!v) return `${MUSCLE_LABELS[muscle]}：本週課表未安排`
  const s = STATUS[v.status]
  return `${MUSCLE_LABELS[muscle]}：${formatSets(v.completed)} / ${formatSets(v.weekTarget)} 組（${formatRate(v.weekRate)}）・${s.label}`
}

function Figure({ regions, volumes, x, caption }: { regions: [Muscle, Shape[]][]; volumes: Map<Muscle, MuscleVolume>; x: number; caption: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <Silhouette />
      {regions.map(([muscle, shapes]) => {
        const v = volumes.get(muscle)
        const fill = v ? STATUS[v.status].color : UNPLANNED
        return (
          <g key={muscle} className="transition-opacity hover:opacity-75">
            <title>{regionTitle(v, muscle)}</title>
            {shapes.map((shape, i) => (
              <ShapeEl key={i} shape={shape} fill={fill} />
            ))}
          </g>
        )
      })}
      <text x={50} y={214} textAnchor="middle" fontSize={7} fill="#5f5f5f">
        {caption}
      </text>
    </g>
  )
}

export default function MuscleMap({ volumes, weekLabel }: { volumes: MuscleVolume[]; weekLabel: string }) {
  const byMuscle = new Map(volumes.map((v) => [v.muscle, v]))
  const summary = volumes.map((v) => `${MUSCLE_LABELS[v.muscle]} ${formatRate(v.weekRate)} ${STATUS[v.status].label}`).join('、')

  return (
    <section aria-labelledby="muscle-heading" className="mt-12">
      <h2 id="muscle-heading" className="text-xl font-bold">
        肌群訓練量
      </h2>
      <p className="mt-1 text-xs text-muted">
        {weekLabel}・完成組數 ÷ 本週課表組數；顏色表示是否跟上到今天為止應完成的進度
      </p>

      <svg viewBox="0 0 210 218" role="img" aria-label={`肌群訓練量：${summary}`} className="mx-auto mt-6 w-full max-w-sm">
        <Figure regions={FRONT} volumes={byMuscle} x={0} caption="正面" />
        <Figure regions={BACK} volumes={byMuscle} x={110} caption="背面" />
      </svg>

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
