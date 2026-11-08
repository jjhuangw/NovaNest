import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { COOKIE_NAME, verifyToken } from './jwt'

export { COOKIE_NAME }

export type Role = 'user' | 'admin'

export interface Session {
  userId: string
  username: string
  role: Role
}

// 除了驗證 JWT，也確認帳號仍存在且未被停用，讓後台停用／刪除能立即生效。
// 同一個請求內只查一次資料庫。
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  const payload = await verifyToken(token)
  if (!payload) return null

  const [user] = await db
    .select({ id: users.id, username: users.username, role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, payload.userId))
  if (!user || user.disabledAt) return null
  return { userId: user.id, username: user.username, role: user.role === 'admin' ? 'admin' : 'user' }
})

// 管理員專用的頁面與 action 都要呼叫；非管理員一律視為找不到
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  return session?.role === 'admin' ? session : null
}
