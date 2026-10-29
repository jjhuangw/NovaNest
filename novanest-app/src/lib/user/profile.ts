import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bodyPhotos, bodyStats, users } from '@/lib/db/schema'
import { isoDateOf } from '@/lib/training/dates'

export const GENDERS = ['male', 'female'] as const
export type Gender = (typeof GENDERS)[number]

export function isGender(value: unknown): value is Gender {
  return typeof value === 'string' && (GENDERS as readonly string[]).includes(value)
}

// 回傳使用者設定的性別；未設定時為 null
export async function getGender(userId: string): Promise<Gender | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { gender: true } })
  return isGender(row?.gender) ? row.gender : null
}

export async function setGender(userId: string, gender: Gender | null) {
  await db.update(users).set({ gender }).where(eq(users.id, userId))
}

export const BODY_LIMITS = {
  heightCm: { min: 100, max: 250 },
  weightKg: { min: 20, max: 300 },
  birthYear: { min: 1900 },
} as const

export interface BodyData {
  heightCm: number | null
  weightKg: number | null
  // 體重的日期（YYYY-MM-DD）
  weighedOn: string | null
  birthYear: number | null
  gender: Gender | null
}

// 最新的身高與體重。體重取身體數據與體態照片中較新的一筆。
export async function getBodyData(userId: string): Promise<BodyData> {
  const [user, weightRow, heightRow, photoRow] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { gender: true, birthYear: true } }),
    db
      .select({ weightKg: bodyStats.weightKg, recordedAt: bodyStats.recordedAt })
      .from(bodyStats)
      .where(and(eq(bodyStats.userId, userId), isNotNull(bodyStats.weightKg)))
      .orderBy(desc(bodyStats.recordedAt))
      .limit(1),
    db
      .select({ heightCm: bodyStats.heightCm })
      .from(bodyStats)
      .where(and(eq(bodyStats.userId, userId), isNotNull(bodyStats.heightCm)))
      .orderBy(desc(bodyStats.recordedAt))
      .limit(1),
    db
      .select({ weightKg: bodyPhotos.weightKg, takenOn: bodyPhotos.takenOn })
      .from(bodyPhotos)
      .where(and(eq(bodyPhotos.userId, userId), isNotNull(bodyPhotos.weightKg)))
      .orderBy(desc(bodyPhotos.takenOn), desc(bodyPhotos.createdAt))
      .limit(1),
  ])

  const stat = weightRow[0] ? { weightKg: Number(weightRow[0].weightKg), on: isoDateOf(weightRow[0].recordedAt) } : null
  const photo = photoRow[0] ? { weightKg: Number(photoRow[0].weightKg), on: photoRow[0].takenOn } : null
  const latest = stat && photo ? (photo.on > stat.on ? photo : stat) : (stat ?? photo)

  return {
    heightCm: heightRow[0] ? Number(heightRow[0].heightCm) : null,
    weightKg: latest?.weightKg ?? null,
    weighedOn: latest?.on ?? null,
    birthYear: user?.birthYear ?? null,
    gender: isGender(user?.gender) ? user.gender : null,
  }
}

// 身高、體重有變動時才新增一筆身體數據，保留歷史紀錄
export async function saveBodyData(
  userId: string,
  input: { heightCm: number | null; weightKg: number | null; birthYear: number | null },
  current: BodyData,
) {
  await db.update(users).set({ birthYear: input.birthYear }).where(eq(users.id, userId))
  const heightChanged = input.heightCm !== null && input.heightCm !== current.heightCm
  const weightChanged = input.weightKg !== null && input.weightKg !== current.weightKg
  if (heightChanged || weightChanged) {
    await db.insert(bodyStats).values({
      userId,
      heightCm: input.heightCm === null ? null : String(input.heightCm),
      weightKg: weightChanged ? String(input.weightKg) : null,
    })
  }
}
