// 日期一律以 'YYYY-MM-DD' 字串表示，並以台灣時間判斷「今天」。
import { DAY_KEYS, type DayKey } from './plan'

export const TIME_ZONE = 'Asia/Taipei'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export function todayISO(timeZone = TIME_ZONE): string {
  // en-CA 的日期格式即為 YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

function toUTC(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

export function addDays(iso: string, days: number): string {
  const d = toUTC(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dayKeyOf(iso: string): DayKey {
  // getUTCDay: 0 = 週日；DAY_KEYS 從週一開始
  return DAY_KEYS[(toUTC(iso).getUTCDay() + 6) % 7]
}

export function todayKey(): DayKey {
  return dayKeyOf(todayISO())
}

export function weekStart(iso: string): string {
  return addDays(iso, -DAY_KEYS.indexOf(dayKeyOf(iso)))
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function monthEnd(iso: string): string {
  const d = toUTC(monthStart(iso))
  d.setUTCMonth(d.getUTCMonth() + 1, 0)
  return d.toISOString().slice(0, 10)
}

export function addMonths(iso: string, months: number): string {
  const d = toUTC(monthStart(iso))
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export function formatDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)}`
}
