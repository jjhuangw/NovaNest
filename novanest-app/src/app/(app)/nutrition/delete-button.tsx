'use client'

import { useI18n } from '@/lib/i18n/client'
import { deleteFoodAction } from './actions'

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  const { t } = useI18n()
  return (
    <form
      action={deleteFoodAction}
      onSubmit={(e) => {
        if (!window.confirm(t.nutrition.confirmDelete(name))) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={t.nutrition.deleteLabel(name)} className="text-xs text-muted underline-offset-4 hover:text-accent hover:underline">
        {t.progress.delete}
      </button>
    </form>
  )
}
