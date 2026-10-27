import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'

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
