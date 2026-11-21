// 份量調整：以「一份」的營養素為基準，乘上倍數得到實際吃下的量。

// 從份量文字找出重量或容量，例如「1 碗，約 200 g」「100 ml」「一份 30 公克」
const WEIGHT = /(\d+(?:\.\d+)?)\s*(g|公克|克|ml|mL|毫升)(?![a-z])/i

export function parseWeight(amount: string): { value: number; unit: string } | null {
  const m = amount.match(WEIGHT)
  if (!m) return null
  const value = Number(m[1])
  return value > 0 ? { value, unit: m[2] } : null
}

export function formatFactor(n: number): string {
  return String(Math.round(n * 100) / 100)
}

// 份量文字跟著倍數調整：有重量就換成新的重量，否則在後面加上「× 倍數」
export function scaleAmount(amount: string, factor: number): string {
  const text = amount.trim()
  if (factor === 1) return text
  const weight = parseWeight(text)
  if (weight) {
    const scaled = Math.round(weight.value * factor * 10) / 10
    return text.replace(WEIGHT, `${scaled} ${weight.unit}`)
  }
  return `${text} × ${formatFactor(factor)}`.trim()
}

// 三大營養素占熱量的比例（蛋白質、碳水 4 kcal/g，脂肪 9 kcal/g），三者合計 100%
export function macroRatio(proteinG: number, carbsG: number, fatG: number): { proteinG: number; carbsG: number; fatG: number } | null {
  const p = proteinG * 4
  const c = carbsG * 4
  const f = fatG * 9
  const sum = p + c + f
  if (sum <= 0) return null
  const pp = Math.round((p / sum) * 100)
  const cp = Math.round((c / sum) * 100)
  return { proteinG: pp, carbsG: cp, fatG: Math.max(0, 100 - pp - cp) }
}

// 「2 個」「半碗」「1/2 cup」這類以數量描述的份量。長的單位放前面（湯匙要先於匙）
const COUNT_UNITS = [
  '湯匙', '茶匙', '個', '份', '碗', '杯', '片', '顆', '粒', '條', '根', '塊', '盤', '包', '罐', '瓶', '盒', '串', '支', '隻', '張', '匙', '碟', '捲', '球',
  'servings', 'serving', 'pieces', 'piece', 'bowls', 'bowl', 'cups', 'cup', 'slices', 'slice', 'cans', 'can', 'bottles', 'bottle',
  'packs', 'pack', 'tbsp', 'tsp', 'eggs', 'egg',
]
const ZH_NUMBERS: Record<string, number> = { 半: 0.5, 一: 1, 兩: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
const COUNT = new RegExp(
  `(\\d+(?:\\.\\d+)?(?:\\s*/\\s*\\d+)?|[${Object.keys(ZH_NUMBERS).join('')}])\\s*(${COUNT_UNITS.join('|')})(?![a-z])`,
  'i',
)

function parseCount(amount: string): { value: number; unit: string } | null {
  const m = amount.match(COUNT)
  if (!m) return null
  const raw = m[1].replace(/\s+/g, '')
  let value: number
  if (raw in ZH_NUMBERS) value = ZH_NUMBERS[raw]
  else if (raw.includes('/')) {
    const [a, b] = raw.split('/').map(Number)
    value = b > 0 ? a / b : 0
  } else value = Number(raw)
  // 單數與複數視為同一個單位（cup / cups）
  const unit = m[2].toLowerCase().replace(/s$/, '')
  return value > 0 ? { value, unit } : null
}

const weightFamily = (unit: string) => (/^(ml|毫升)$/i.test(unit) ? 'ml' : 'g')

// 已知一份的份量文字（例如「1 個，約 200 g」），換算成另一個份量（「2 個」「300 g」）要乘上的倍數。
// 先比重量或容量，再比相同的數量單位；對不上時回傳 null。
export function portionFactor(baseAmount: string | null, requested: string): number | null {
  if (!baseAmount) return null
  const factor = rawFactor(baseAmount, requested)
  if (factor === null) return null
  // scaleAmount 對沒有重量的份量會在後面加上「× 倍數」（例如「1 個 × 1.5」），換算時要算進去
  const scaled = factor * (trailingTimes(requested) / trailingTimes(baseAmount))
  // 與份量欄位的倍數同樣的範圍，超出多半是對錯了
  return scaled >= 0.05 && scaled <= 50 ? scaled : null
}

function trailingTimes(amount: string): number {
  const m = amount.match(/[×x*]\s*(\d+(?:\.\d+)?)\s*$/i)
  const n = m ? Number(m[1]) : 1
  return n > 0 ? n : 1
}

function rawFactor(baseAmount: string, requested: string): number | null {
  let factor: number | null = null
  const bw = parseWeight(baseAmount)
  const rw = parseWeight(requested)
  if (bw && rw && weightFamily(bw.unit) === weightFamily(rw.unit)) factor = rw.value / bw.value
  if (factor === null) {
    const bc = parseCount(baseAmount)
    const rc = parseCount(requested)
    if (bc && rc && bc.unit === rc.unit) factor = rc.value / bc.value
  }
  return factor
}
