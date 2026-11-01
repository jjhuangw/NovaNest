// 性別與身體資料的範圍。不連資料庫，瀏覽器端元件也能使用。
export const GENDERS = ['male', 'female'] as const
export type Gender = (typeof GENDERS)[number]

export function isGender(value: unknown): value is Gender {
  return typeof value === 'string' && (GENDERS as readonly string[]).includes(value)
}

export const BODY_LIMITS = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 20, max: 300 },
  birthYear: { min: 1900 },
} as const
