'use client'

import { useEffect, useRef, useState } from 'react'

// 趨勢圖：手寫 SVG。顏色用 globals.css 的 --chart-1／--chart-2（已用 dataviz 驗證器檢查過淺色與深色）。
// 規格：長條 ≤ 24px、頂端 4px 圓角；折線 2px；資料點 ≥ 8px 並帶 2px 背景色外框；格線 1px 實線。

const HEIGHT = 220
const PAD = { top: 16, right: 56, bottom: 28, left: 48 }

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return { ref, width }
}

// 取整齊的刻度：0、1,000、2,000…
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const top = Math.ceil(max / step) * step
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
}

const formatTick = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n.toLocaleString('en-US'))

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: React.ReactNode }) {
  // 靠近右側時改放在左邊，避免超出畫面
  const left = x > width - 170 ? x - 12 : x + 12
  return (
    <div
      role="status"
      className={`pointer-events-none absolute z-10 min-w-32 border border-line bg-background px-3 py-2 text-xs shadow-lg ${x > width - 170 ? '-translate-x-full' : ''}`}
      style={{ left, top: y }}
    >
      {children}
    </div>
  )
}

function DataTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-semibold text-muted">{caption}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-left tabular-nums">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} className="border-b border-line px-2 py-1.5 font-semibold text-muted">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className="border-b border-line px-2 py-1.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// ---------- 長條圖（每週總訓練量） ----------

export interface BarPoint {
  key: string
  label: string
  value: number
  // 提示框第二行，例如「本週（進行中）」
  note?: string
}

export function ColumnChart({
  title,
  points,
  unit,
  tableCaption,
  columns,
}: {
  title: string
  points: BarPoint[]
  unit: string
  tableCaption: string
  columns: [string, string]
}) {
  const { ref, width } = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0))
  const max = ticks.at(-1)!
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const band = points.length ? plotW / points.length : 0
  const barW = Math.max(4, Math.min(24, band - 2))
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  // 標籤太擠時只顯示部分週次
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(plotW / 44))))
  const last = points.at(-1)

  return (
    <figure>
      <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={title} className="block text-muted">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="currentColor" className="tabular-nums">
                  {formatTick(t)}
                </text>
              </g>
            ))}
            {points.map((p, i) => {
              const cx = PAD.left + band * i + band / 2
              const top = y(p.value)
              const h = PAD.top + plotH - top
              const r = Math.min(4, h, barW / 2)
              const x0 = cx - barW / 2
              // 頂端圓角、底部方角
              const d =
                h <= 0
                  ? ''
                  : `M${x0},${PAD.top + plotH} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${PAD.top + plotH} Z`
              return (
                <g key={p.key}>
                  {d && <path d={d} fill="var(--chart-1)" opacity={active === null || active === i ? 1 : 0.55} />}
                  {i % labelEvery === 0 && (
                    <text x={cx} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="currentColor">
                      {p.label}
                    </text>
                  )}
                  {/* 點擊範圍比長條大：整個欄位 */}
                  <rect
                    x={PAD.left + band * i}
                    y={PAD.top}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    aria-label={`${p.label}：${p.value.toLocaleString('en-US')} ${unit}${p.note ? `（${p.note}）` : ''}`}
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    className="cursor-default outline-none"
                  />
                </g>
              )
            })}
            {/* 只標最後一週的數值 */}
            {last && last.value > 0 && (
              <text x={PAD.left + band * (points.length - 1) + band / 2} y={y(last.value) - 6} textAnchor="middle" fontSize={11} fill="var(--foreground)" className="tabular-nums">
                {formatTick(last.value)}
              </text>
            )}
          </svg>
        )}
        {active !== null && points[active] && (
          <Tooltip x={PAD.left + band * active + band / 2} y={Math.max(0, y(points[active].value) - 48)} width={width}>
            <p className="text-sm font-bold tabular-nums">
              {points[active].value.toLocaleString('en-US')} {unit}
            </p>
            <p className="text-muted">{points[active].label}</p>
            {points[active].note && <p className="text-muted">{points[active].note}</p>}
          </Tooltip>
        )}
      </div>
      <DataTable caption={tableCaption} columns={columns} rows={points.map((p) => [p.label, `${p.value.toLocaleString('en-US')} ${unit}`])} />
    </figure>
  )
}

// ---------- 折線圖（達成率、單一動作進步） ----------

export interface LineSeries {
  key: string
  label: string
  // CSS 顏色，例如 var(--chart-1)
  color: string
  // 與 xLabels 一一對應；null 代表這個時間點沒有資料
  values: (number | null)[]
}

export function LineChart({
  title,
  xLabels,
  series,
  unit,
  yMax,
  tableCaption,
  xColumn,
}: {
  title: string
  xLabels: string[]
  series: LineSeries[]
  // 數值單位：'%' 直接接在數字後，其他（例如 kg）以空格分開
  unit: string
  // 固定的上限（例如百分比 100）；沒有時依資料決定
  yMax?: number
  tableCaption: string
  xColumn: string
}) {
  const { ref, width } = useWidth()
  const [active, setActive] = useState<number | null>(null)
  const format = (v: number) => (unit === '%' ? `${Math.round(v)}%` : `${Math.round(v * 10) / 10} ${unit}`)
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null))
  const ticks = niceTicks(yMax ?? Math.max(...all, 0))
  const max = ticks.at(-1)!
  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = HEIGHT - PAD.top - PAD.bottom
  const n = xLabels.length
  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (plotW * i) / (n - 1))
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 44))))

  // 有資料的點才連線；中間缺資料就斷開
  const pathOf = (values: (number | null)[]) => {
    let d = ''
    let pen = false
    values.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `
      pen = true
    })
    return d.trim()
  }

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = n <= 1 ? 0 : Math.round((px / rect.width) * (n - 1))
    setActive(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <figure>
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.key} className="inline-flex items-center gap-2">
              <span aria-hidden className="inline-block h-0.5 w-4" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}
      <div ref={ref} className="relative" onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={title} className="block text-muted">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="currentColor" className="tabular-nums">
                  {format(t)}
                </text>
              </g>
            ))}
            {xLabels.map((l, i) =>
              i % labelEvery === 0 ? (
                <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="currentColor">
                  {l}
                </text>
              ) : null,
            )}
            {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--muted)" strokeWidth={1} />}
            {series.map((s) => (
              <g key={s.key}>
                <path d={pathOf(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* 資料點不多時才畫點，避免太擠 */}
                {(n <= 16 || active !== null) &&
                  s.values.map((v, i) =>
                    v === null || (n > 16 && i !== active) ? null : (
                      <circle key={i} cx={x(i)} cy={y(v)} r={4} fill={s.color} stroke="var(--background)" strokeWidth={2} />
                    ),
                  )}
              </g>
            ))}
            {/* 末端標籤：每條線最後一個值 */}
            {series.map((s) => {
              const lastIndex = s.values.findLastIndex((v) => v !== null)
              if (lastIndex < 0) return null
              return (
                <text key={s.key} x={x(lastIndex) + 8} y={y(s.values[lastIndex]!)} dy="0.32em" fontSize={11} fill="var(--foreground)" className="tabular-nums">
                  {format(s.values[lastIndex]!)}
                </text>
              )
            })}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={plotW}
              height={plotH}
              fill="transparent"
              tabIndex={0}
              aria-label={title}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onFocus={() => setActive(n - 1)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? n - 1) - 1))
                if (e.key === 'ArrowRight') setActive((a) => Math.min(n - 1, (a ?? 0) + 1))
              }}
              className="outline-none"
            />
          </svg>
        )}
        {active !== null && (
          <Tooltip x={x(active)} y={PAD.top} width={width}>
            <p className="mb-1 text-muted">{xLabels[active]}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-2">
                <span aria-hidden className="inline-block h-0.5 w-3" style={{ background: s.color }} />
                <span className="font-bold tabular-nums">{s.values[active] === null ? '—' : format(s.values[active]!)}</span>
                <span className="text-muted">{s.label}</span>
              </p>
            ))}
          </Tooltip>
        )}
      </div>
      <DataTable
        caption={tableCaption}
        columns={[xColumn, ...series.map((s) => s.label)]}
        rows={xLabels.map((l, i) => [l, ...series.map((s) => (s.values[i] === null ? '—' : format(s.values[i]!)))])}
      />
    </figure>
  )
}
