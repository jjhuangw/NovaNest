import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import { isTheme, THEME_COOKIE } from '@/lib/i18n/config'
import { getI18n } from '@/lib/i18n/server'
import { getGender } from '@/lib/user/profile'
import { updateGenderAction } from './actions'
import { LanguageSelect, ThemeSelect } from './preferences'

export const instant = false

export default async function SettingsPage(props: PageProps<'/settings'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const savedAt = typeof params.saved === 'string' ? params.saved : null
  const [gender, { t }, cookieStore] = await Promise.all([getGender(session.userId), getI18n(), cookies()])
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value
  const theme = isTheme(savedTheme) ? savedTheme : 'system'

  const options = [
    { value: 'male', label: t.settings.male },
    { value: 'female', label: t.settings.female },
    { value: '', label: t.settings.unspecified, hint: t.settings.unspecifiedHint },
  ]

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Settings</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{t.settings.title}</h1>
          <p className="mt-4 text-base">{session.username}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-12 md:grid-cols-2 lg:grid-cols-3">
        {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={t.settings.saved} />}
        <LanguageSelect />
        <ThemeSelect initial={theme} />
        <form action={updateGenderAction}>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider">{t.settings.gender}</legend>
            <p className="mt-1 text-sm text-muted">{t.settings.genderHint}</p>
            <div className="mt-4 divide-y divide-line border-y border-line">
              {options.map((o) => (
                <label key={o.value} className="flex cursor-pointer items-center gap-3 py-3.5">
                  <input
                    type="radio"
                    name="gender"
                    value={o.value}
                    defaultChecked={(gender ?? '') === o.value}
                    className="h-4 w-4 accent-foreground"
                  />
                  <span>
                    <span className="font-semibold">{o.label}</span>
                    {o.hint && <span className="block text-xs text-muted">{o.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <SubmitButton label={t.settings.save} />
        </form>
      </section>
    </div>
  )
}
