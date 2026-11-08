import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
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

// 只驗證 JWT，不查資料庫
const getTokenUserId = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return null
  return (await verifyToken(token))?.userId ?? null
})

// 除了驗證 JWT，也確認帳號仍存在且未被停用，讓後台停用／刪除能立即生效。
// 同一個請求內只查一次資料庫。
export const getSession = cache(async (): Promise<Session | null> => {
  const userId = await getTokenUserId()
  if (!userId) return null

  const [user] = await db
    .select({ id: users.id, username: users.username, role: users.role, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(users.id, userId))
  if (!user || user.disabledAt) return null
  return { userId: user.id, username: user.username, role: user.role === 'admin' ? 'admin' : 'user' }
})

// 管理員專用的頁面與 action 都要呼叫；非管理員一律視為找不到
export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession()
  return session?.role === 'admin' ? session : null
}

// 頁面用：確認帳號仍有效的同時就開始讀取資料，省下一次資料庫往返。
// 帳號無效時資料不會被使用，直接導向登入頁。寫入資料的 server action 仍要先用 getSession() 確認。
export async function loadForUser<T>(load: (userId: string) => Promise<T>): Promise<{ session: Session; data: T }> {
  const userId = await getTokenUserId()
  if (!userId) redirect('/login')
  const [session, data] = await Promise.allSettled([getSession(), load(userId)])
  if (session.status === 'rejected') throw session.reason
  if (!session.value) redirect('/login')
  if (data.status === 'rejected') throw data.reason
  return { session: session.value, data: data.value }
}

// 後台頁面用：同上，非管理員一律視為找不到
export async function loadForAdmin<T>(load: () => Promise<T>): Promise<{ session: Session; data: T } | null> {
  if (!(await getTokenUserId())) return null
  const [session, data] = await Promise.allSettled([getSession(), load()])
  if (session.status === 'rejected') throw session.reason
  if (session.value?.role !== 'admin') return null
  if (data.status === 'rejected') throw data.reason
  return { session: session.value, data: data.value }
}
