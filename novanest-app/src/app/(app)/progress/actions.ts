'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isISODate, todayISO } from '@/lib/training/dates'
import { addPhoto, deletePhoto } from '@/lib/photos/photos'
import { jpegSize } from '@/lib/photos/jpeg'
import { MAX_EDGE, MAX_UPLOAD_BYTES, MIN_EDGE } from '@/lib/photos/limits'
import { isPose } from '@/lib/photos/poses'

export type UploadResult = { ok: true } | { ok: false; error: string }

export async function uploadPhotoAction(formData: FormData): Promise<UploadResult> {
  const session = await getSession()
  if (!session) redirect('/login')

  const takenOn = formData.get('takenOn')
  if (!isISODate(takenOn) || takenOn > todayISO()) return { ok: false, error: '請選擇今天或以前的日期' }

  const pose = formData.get('pose')
  if (!isPose(pose)) return { ok: false, error: '請選擇姿勢' }

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: '請選擇照片' }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: '照片太大，請重新選擇' }

  // 瀏覽器端一律縮圖並轉成 JPEG，所以這裡只接受符合尺寸的 JPEG；
  // 以檔頭判斷實際格式與尺寸，不信任瀏覽器提供的 MIME type
  const bytes = new Uint8Array(await file.arrayBuffer())
  const size = jpegSize(bytes)
  if (!size) return { ok: false, error: '照片格式不正確，請重新選擇' }
  const long = Math.max(size.width, size.height)
  const short = Math.min(size.width, size.height)
  if (long > MAX_EDGE || short < MIN_EDGE) return { ok: false, error: '照片尺寸不符，請重新選擇' }

  const weightRaw = formData.get('weightKg')
  const weight = typeof weightRaw === 'string' && weightRaw.trim() !== '' ? Number(weightRaw) : null
  if (weight !== null && (!Number.isFinite(weight) || weight < 20 || weight > 300)) return { ok: false, error: '體重需介於 20–300 kg' }

  const notesRaw = formData.get('notes')
  const notes = typeof notesRaw === 'string' && notesRaw.trim() ? notesRaw.trim().slice(0, 500) : null

  try {
    await addPhoto({
      userId: session.userId,
      takenOn,
      pose,
      weightKg: weight === null ? null : Math.round(weight * 10) / 10,
      notes,
      file: { bytes, contentType: 'image/jpeg', extension: 'jpg' },
    })
  } catch (e) {
    console.error('Photo upload failed', e)
    return { ok: false, error: '上傳失敗，請稍後再試' }
  }

  revalidatePath('/progress')
  return { ok: true }
}

export async function deletePhotoAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const id = formData.get('id')
  if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
    await deletePhoto(session.userId, id)
  }
  revalidatePath('/progress')
}
