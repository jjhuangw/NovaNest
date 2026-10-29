'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { analyzeFoodImage, estimateFoodByName } from '@/lib/nutrition/analyze'
import { addEntries, deleteEntry } from '@/lib/nutrition/entries'
import { foodItemSchema, MAX_ITEMS_PER_SAVE, MEALS, SOURCES, type FoodItem } from '@/lib/nutrition/nutrients'
import { jpegSize } from '@/lib/photos/jpeg'
import { MAX_EDGE, MAX_UPLOAD_BYTES, MIN_EDGE } from '@/lib/photos/limits'
import { isISODate, todayISO } from '@/lib/training/dates'

export type AnalyzeActionResult =
  | { ok: true; items: FoodItem[]; servingsPerPackage: number | null; note: string | null }
  | { ok: false; error: string }

export async function analyzeFoodAction(formData: FormData): Promise<AnalyzeActionResult> {
  const session = await getSession()
  if (!session) redirect('/login')
  const { locale, t } = await getI18n()
  const errors = t.nutrition.errors

  const mode = formData.get('mode')
  if (mode !== 'photo' && mode !== 'label') return { ok: false, error: errors.failed }

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: t.upload.errors.required }
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: t.upload.errors.serverTooBig }

  // 瀏覽器端已縮圖並轉成 JPEG；以檔頭確認格式與尺寸，不信任瀏覽器提供的 MIME type
  const bytes = new Uint8Array(await file.arrayBuffer())
  const size = jpegSize(bytes)
  if (!size) return { ok: false, error: t.upload.errors.format }
  if (Math.max(size.width, size.height) > MAX_EDGE || Math.min(size.width, size.height) < MIN_EDGE) {
    return { ok: false, error: t.upload.errors.dimensions }
  }

  const hintRaw = formData.get('hint')
  const hint = typeof hintRaw === 'string' && hintRaw.trim() ? hintRaw.trim().slice(0, 300) : null

  const result = await analyzeFoodImage({ mode, jpeg: bytes, hint, locale })
  if (!result.ok) {
    const key = result.reason === 'unrecognized' ? (`unrecognized_${mode}` as const) : result.reason
    return { ok: false, error: errors[key] }
  }
  return result
}

export type EstimateActionResult = { ok: true; item: FoodItem } | { ok: false; error: string }

export async function estimateFoodAction(input: { name: string; amount: string }): Promise<EstimateActionResult> {
  const session = await getSession()
  if (!session) redirect('/login')
  const { locale, t } = await getI18n()
  const errors = t.nutrition.errors

  const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 100) : ''
  if (!name) return { ok: false, error: errors.nameRequired }
  const amount = typeof input.amount === 'string' && input.amount.trim() ? input.amount.trim().slice(0, 100) : null

  const result = await estimateFoodByName({ name, amount, locale })
  if (!result.ok) return { ok: false, error: errors[result.reason === 'unrecognized' ? 'unrecognized_name' : result.reason] }
  return { ok: true, item: result.items[0] }
}

const saveSchema = z.object({
  date: z.string().refine(isISODate),
  meal: z.enum(MEALS),
  source: z.enum(SOURCES),
  items: z.array(foodItemSchema).min(1).max(MAX_ITEMS_PER_SAVE),
})

export type SaveActionResult = { ok: true } | { ok: false; error: string }

export async function saveFoodAction(input: z.input<typeof saveSchema>): Promise<SaveActionResult> {
  const session = await getSession()
  if (!session) redirect('/login')
  const { t } = await getI18n()

  const parsed = saveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: t.nutrition.errors.invalid }
  if (parsed.data.date > todayISO()) return { ok: false, error: t.nutrition.errors.future }

  try {
    await addEntries({ userId: session.userId, ...parsed.data })
  } catch (e) {
    console.error('Saving food entries failed', e)
    return { ok: false, error: t.nutrition.errors.saveFailed }
  }
  revalidatePath('/nutrition')
  return { ok: true }
}

export async function deleteFoodAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const id = formData.get('id')
  if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) {
    await deleteEntry(session.userId, id)
  }
  revalidatePath('/nutrition')
}
