import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bodyPhotos, users } from '@/lib/db/schema'
import { storage } from '@/lib/photos/storage'
import type { Plan } from '@/lib/user/plan'

export async function setUserDisabled(userId: string, disabled: boolean) {
  await db
    .update(users)
    .set({ disabledAt: disabled ? new Date() : null })
    .where(eq(users.id, userId))
}

// 設定方案；proUntil 為 null 表示 Pro 不到期（Free 時一律清除）
export async function setUserPlan(userId: string, plan: Plan, proUntil: Date | null) {
  await db
    .update(users)
    .set({ plan, proUntil: plan === 'pro' ? proUntil : null })
    .where(eq(users.id, userId))
}

export async function setUserRole(userId: string, role: 'user' | 'admin') {
  await db.update(users).set({ role }).where(eq(users.id, userId))
}

// 刪除帳號：資料表以 cascade 一併刪除；照片檔案存在 Storage，要另外移除。
// AI 用量紀錄保留（user_id 變成 null），讓費用統計不會因此減少。
export async function deleteUser(userId: string) {
  const photos = await db.select({ path: bodyPhotos.storagePath }).from(bodyPhotos).where(eq(bodyPhotos.userId, userId))
  await db.delete(users).where(eq(users.id, userId))

  const paths = photos.map((p) => p.path)
  for (let i = 0; i < paths.length; i += 500) {
    const { error } = await storage().remove(paths.slice(i, i + 500))
    // 資料已刪除，檔案沒刪掉只會留下無法存取的孤兒檔，記錄下來即可
    if (error) console.error('Failed to remove photo files of deleted user', userId, error)
  }
}
