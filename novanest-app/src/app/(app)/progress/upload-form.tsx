'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SavedToast } from '@/components/form-feedback'
import {
  ACCEPT_ATTR,
  ACCEPTED_TYPES,
  formatMB,
  LIMITS_HINT,
  MAX_EDGE,
  MAX_ORIGINAL_BYTES,
  MAX_ORIGINAL_PIXELS,
  MAX_UPLOAD_BYTES,
  MIN_EDGE,
} from '@/lib/photos/limits'
import { POSE_LABELS, POSES } from '@/lib/photos/poses'
import { uploadPhotoAction } from './actions'

// 選取檔案時就檢查格式、大小與尺寸，回傳錯誤訊息；通過時回傳 null
async function validate(file: File): Promise<string | null> {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return `不支援這種檔案格式。請選擇 ${LIMITS_HINT}`
  if (file.size > MAX_ORIGINAL_BYTES) return `照片太大（${formatMB(file.size)}），上限 ${formatMB(MAX_ORIGINAL_BYTES)}`
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return '無法讀取這張照片，請改用 JPEG 或 PNG'
  }
  const { width, height } = bitmap
  bitmap.close()
  if (width * height > MAX_ORIGINAL_PIXELS) return '照片解析度太高，請先縮小再上傳'
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height))
  if (Math.min(width, height) * scale < MIN_EDGE) return `照片太小或比例太窄，至少需要 ${MIN_EDGE} × ${MIN_EDGE} 像素`
  return null
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', quality),
  )
}

// 在瀏覽器縮圖並重新編碼成 JPEG：檔案變小，也會去除 EXIF（含 GPS 位置）
async function compress(file: File): Promise<Blob> {
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

const inputClass = 'w-full border border-line bg-white px-3 py-2.5 text-sm focus:border-foreground focus:outline-none'
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wider'

export default function UploadForm({ today }: { today: string }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target
    const file = input.files?.[0]
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setError(null)
    if (!file) return
    const problem = await validate(file)
    if (problem) {
      setError(problem)
      input.value = ''
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const data = new FormData(form)
    const file = data.get('photo')
    if (!(file instanceof File) || file.size === 0) {
      setError('請選擇照片')
      return
    }

    startTransition(async () => {
      try {
        data.set('photo', await compress(file), 'photo.jpg')
      } catch {
        setError('無法讀取這張照片，請改用 JPEG 或 PNG')
        return
      }
      const result = await uploadPhotoAction(data)
      if (!result.ok) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
      if (preview) URL.revokeObjectURL(preview)
      setPreview(null)
      setSavedAt(String(Date.now()))
      router.refresh()
    })
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-[200px_1fr]">
      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message="已上傳體態照片" />}

      <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-foreground/40 bg-stone text-center text-sm text-muted hover:border-foreground">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽，不需要最佳化
          <img src={preview} alt="照片預覽" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-2xl">＋</span>
            <span className="mt-2">選擇或拍攝照片</span>
          </>
        )}
        <input name="photo" type="file" accept={ACCEPT_ATTR} required onChange={onFileChange} className="sr-only" />
        {!preview && <span className="absolute inset-x-3 bottom-3 text-[11px] leading-snug">{LIMITS_HINT}</span>}
      </label>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className={labelClass}>拍攝日期</span>
            <input name="takenOn" type="date" defaultValue={today} max={today} required className={inputClass} />
          </label>
          <label>
            <span className={labelClass}>體重（kg，選填）</span>
            <input name="weightKg" type="number" inputMode="decimal" step={0.1} min={20} max={300} className={inputClass} />
          </label>
        </div>

        <fieldset>
          <legend className={labelClass}>姿勢</legend>
          <div className="flex gap-2">
            {POSES.map((p, i) => (
              <label key={p} className="flex-1">
                <input type="radio" name="pose" value={p} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block cursor-pointer border border-line py-2.5 text-center text-sm font-semibold peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                  {POSE_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className={labelClass}>備註（選填）</span>
          <input name="notes" maxLength={500} placeholder="例如：早上空腹、增肌第 4 週" className={inputClass} />
        </label>

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto sm:px-12"
        >
          {pending ? '上傳中…' : '上傳照片'}
        </button>
        <p className="text-xs text-muted">照片只有你本人看得到。上傳前會在你的裝置上縮小並移除拍攝位置等資訊。</p>
      </div>
    </form>
  )
}
