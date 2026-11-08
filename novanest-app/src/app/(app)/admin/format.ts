import { isoDateOf } from '@/lib/training/dates'

export const formatInt = (n: number) => n.toLocaleString('en-US')

// 小額時多顯示兩位，避免全部變成 $0.00
export const formatUsd = (n: number) => `$${n.toFixed(n > 0 && n < 1 ? 4 : 2)}`

export const formatDay = (d: Date | null, fallback: string) => (d ? isoDateOf(d).replaceAll('-', '/') : fallback)

export const tableClass = 'w-full min-w-max border-collapse text-left text-sm tabular-nums'
export const thClass = 'border-b border-line px-3 py-2 text-xs font-semibold tracking-wider text-muted'
export const tdClass = 'border-b border-line px-3 py-2.5'
