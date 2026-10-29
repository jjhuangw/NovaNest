'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SavedToast } from '@/components/form-feedback'
import { checkImage, compressImage as compress, imageProblemMessage } from '@/lib/photos/compress'
import { ACCEPT_ATTR } from '@/lib/photos/limits'
import { POSES } from '@/lib/photos/poses'
import { useI18n } from '@/lib/i18n/client'
import type { Messages } from '@/lib/i18n/messages'
import { uploadPhotoAction } from './actions'

async function validate(file: File, t: Messages['upload']): Promise<string | null> {
  const problem = await checkImage(file)
  return problem ? imageProblemMessage(problem, t) : null
}

// min-w-0 與 appearance-none：iOS Safari 的日期欄位有固定最小寬度，不加會撐出欄位而與旁邊重疊
const inputClass =
  'block min-h-11 w-full min-w-0 appearance-none border border-line bg-surface px-3 py-2.5 text-left text-sm focus:border-foreground focus:outline-none [&::-webkit-date-and-time-value]:text-left'
const labelClass = 'mb-2 block text-xs font-semibold uppercase tracking-wider'

export default function UploadForm({ today }: { today: string }) {
  const router = useRouter()
  const { t: messages } = useI18n()
  const t = messages.upload
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
    const problem = await validate(file, t)
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
      setError(t.errors.required)
      return
    }

    startTransition(async () => {
      try {
        data.set('photo', await compress(file), 'photo.jpg')
      } catch {
        setError(t.errors.unreadable)
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
      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={t.uploaded} />}

      <label className="relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden border border-dashed border-foreground/40 bg-stone text-center text-sm text-muted hover:border-foreground">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 本機 blob 預覽，不需要最佳化
          <img src={preview} alt={t.preview} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span className="text-2xl">＋</span>
            <span className="mt-2">{t.choose}</span>
          </>
        )}
        <input name="photo" type="file" accept={ACCEPT_ATTR} required onChange={onFileChange} className="sr-only" />
        {!preview && <span className="absolute inset-x-3 bottom-3 text-[11px] leading-snug">{t.limits}</span>}
      </label>

      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className={labelClass}>{t.takenOn}</span>
            <input name="takenOn" type="date" defaultValue={today} max={today} required className={inputClass} />
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>{t.weight}</span>
            <input name="weightKg" type="number" inputMode="decimal" step={0.1} min={20} max={300} className={inputClass} />
          </label>
        </div>

        <fieldset>
          <legend className={labelClass}>{messages.progress.pose}</legend>
          <div className="flex gap-2">
            {POSES.map((p, i) => (
              <label key={p} className="flex-1">
                <input type="radio" name="pose" value={p} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block cursor-pointer border border-line py-2.5 text-center text-sm font-semibold peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2">
                  {messages.progress.poses[p]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className={labelClass}>{t.notes}</span>
          <input name="notes" maxLength={500} placeholder={t.notesPlaceholder} className={inputClass} />
        </label>

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-background transition-opacity hover:opacity-85 disabled:opacity-50 sm:w-auto sm:px-12"
        >
          {pending ? t.submitting : t.submit}
        </button>
        <p className="text-xs text-muted">{t.privacy}</p>
      </div>
    </form>
  )
}
