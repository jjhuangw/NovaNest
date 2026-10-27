import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import { getGender } from '@/lib/user/profile'
import { updateGenderAction } from './actions'

export const instant = false

const OPTIONS = [
  { value: 'male', label: '男性' },
  { value: 'female', label: '女性' },
  { value: '', label: '不指定', hint: '肌群示意圖預設顯示男性' },
]

export default async function SettingsPage(props: PageProps<'/settings'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const savedAt = typeof params.saved === 'string' ? params.saved : null
  const gender = await getGender(session.userId)

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Settings</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">個人設定</h1>
          <p className="mt-4 text-base">{session.username}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message="已儲存個人設定" />}
        <form action={updateGenderAction} className="max-w-md">
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider">性別</legend>
            <p className="mt-1 text-sm text-muted">用來顯示對應性別的肌群示意圖。</p>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {OPTIONS.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-3 py-3.5">
                  <input
                    type="radio"
                    name="gender"
                    value={o.value}
                    defaultChecked={(gender ?? '') === o.value}
                    className="h-4 w-4 accent-foreground"
                  />
                  <span className="font-semibold">{o.label}</span>
                  {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton label="儲存設定" />
        </form>
      </section>
    </div>
  )
}
