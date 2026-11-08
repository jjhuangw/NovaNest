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
