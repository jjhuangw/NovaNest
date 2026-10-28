import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { bodyPhotos } from '@/lib/db/schema'
import { isPose, type Pose } from './poses'
import { SIGNED_URL_TTL_SECONDS, storage } from './storage'

export interface PhotoView {
  id: string
  takenOn: string
  pose: Pose
  weightKg: number | null
  notes: string | null
  url: string | null
}

// 依拍攝日期新到舊列出，並附上短效簽章網址
export async function listPhotos(userId: string): Promise<PhotoView[]> {
  const rows = await db
    .select()
    .from(bodyPhotos)
    .where(eq(bodyPhotos.userId, userId))
    .orderBy(desc(bodyPhotos.takenOn), desc(bodyPhotos.createdAt))
  if (rows.length === 0) return []

  const { data, error } = await storage().createSignedUrls(
    rows.map((r) => r.storagePath),
    SIGNED_URL_TTL_SECONDS,
  )
  if (error) throw error
  const urls = new Map(data.map((d) => [d.path, d.signedUrl]))

  return rows.map((r) => ({
    id: r.id,
    takenOn: r.takenOn,
    pose: isPose(r.pose) ? r.pose : 'front',
    weightKg: r.weightKg === null ? null : Number(r.weightKg),
    notes: r.notes,
    url: urls.get(r.storagePath) ?? null,
  }))
}

export async function countPhotos(userId: string) {
  const rows = await db.select({ takenOn: bodyPhotos.takenOn }).from(bodyPhotos).where(eq(bodyPhotos.userId, userId)).orderBy(desc(bodyPhotos.takenOn))
  return { count: rows.length, latest: rows[0]?.takenOn ?? null }
}

export async function addPhoto(input: {
  userId: string
  takenOn: string
  pose: Pose
  weightKg: number | null
  notes: string | null
  file: { bytes: Uint8Array; contentType: string; extension: string }
}) {
  const path = `${input.userId}/${crypto.randomUUID()}.${input.file.extension}`
  const { error } = await storage().upload(path, input.file.bytes, { contentType: input.file.contentType, upsert: false })
  if (error) throw error

  try {
    await db.insert(bodyPhotos).values({
      userId: input.userId,
      takenOn: input.takenOn,
      pose: input.pose,
      storagePath: path,
      weightKg: input.weightKg === null ? null : String(input.weightKg),
      notes: input.notes,
    })
  } catch (e) {
    // 資料寫入失敗時移除已上傳的檔案，避免留下孤兒檔
    await storage().remove([path])
    throw e
  }
}

// 只刪除屬於該使用者的照片
export async function deletePhoto(userId: string, photoId: string) {
  const [row] = await db
    .delete(bodyPhotos)
    .where(and(eq(bodyPhotos.id, photoId), eq(bodyPhotos.userId, userId)))
    .returning({ storagePath: bodyPhotos.storagePath })
  if (!row) return false
  const { error } = await storage().remove([row.storagePath])
  if (error) console.error('Failed to remove photo file', row.storagePath, error)
  return true
}
