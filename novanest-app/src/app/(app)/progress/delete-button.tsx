'use client'

import { deletePhotoAction } from './actions'

export default function DeleteButton({ id, label }: { id: string; label: string }) {
  return (
    <form
      action={deletePhotoAction}
      onSubmit={(e) => {
        if (!window.confirm(`確定要刪除 ${label} 嗎？刪除後無法復原。`)) e.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="text-xs text-muted underline-offset-4 hover:text-accent hover:underline">
        刪除
      </button>
    </form>
  )
}
