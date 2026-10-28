'use client'

import { useI18n } from '@/lib/i18n/client'
import { deletePhotoAction } from './actions'

export default function DeleteButton({ id, label }: { id: string; label: string }) {
  const { t } = useI18n()
  return (
    <form
      action={deletePhotoAction}
      onSubmit={(e) => {
        if (!window.confirm(t.progress.confirmDelete(label))) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-muted underline-offset-4 hover:text-accent hover:underline">
        {t.progress.delete}
      </button>
    </form>
  )
}
