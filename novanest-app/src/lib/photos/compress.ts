// 瀏覽器端的照片檢查與壓縮，體態照片與飲食照片共用。
import type { Messages } from '@/lib/i18n/messages'
import { ACCEPTED_TYPES, formatMB, MAX_EDGE, MAX_ORIGINAL_BYTES, MAX_ORIGINAL_PIXELS, MAX_UPLOAD_BYTES, MIN_EDGE } from './limits'

export type ImageProblem =
  | { kind: 'type' }
  | { kind: 'tooBig'; size: number }
  | { kind: 'unreadable' }
  | { kind: 'tooManyPixels' }
  | { kind: 'tooSmall' }

// 選取檔案時就檢查格式、大小與尺寸；通過時回傳 null
export async function checkImage(file: File): Promise<ImageProblem | null> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return { kind: 'type' }
  if (file.size > MAX_ORIGINAL_BYTES) return { kind: 'tooBig', size: file.size }
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { kind: 'unreadable' }
  }
  const { width, height } = bitmap
  bitmap.close()
  if (width * height > MAX_ORIGINAL_PIXELS) return { kind: 'tooManyPixels' }
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  if (Math.min(width, height) * scale < MIN_EDGE) return { kind: 'tooSmall' }
  return null
}

export function imageProblemMessage(problem: ImageProblem, t: Messages['upload']): string {
  switch (problem.kind) {
    case 'type':
      return t.errors.type(t.limits)
    case 'tooBig':
      return t.errors.tooBig(formatMB(problem.size), formatMB(MAX_ORIGINAL_BYTES))
    case 'unreadable':
      return t.errors.unreadable
    case 'tooManyPixels':
      return t.errors.tooManyPixels
    case 'tooSmall':
      return t.errors.tooSmall(MIN_EDGE)
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality),
  )
}

// 在瀏覽器縮圖並重新編碼成 JPEG：檔案變小，也會去除 EXIF（含 GPS 位置）
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await encode(canvas, 0.85)
  return blob.size <= MAX_UPLOAD_BYTES ? blob : encode(canvas, 0.6)
}
