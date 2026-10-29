import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import { isTheme, THEME_COOKIE } from '@/lib/i18n/config'
import { getI18n } from '@/lib/i18n/server'
import { todayISO } from '@/lib/training/dates'
import { BODY_LIMITS, getBodyData, getGender } from '@/lib/user/profile'
import { updateBodyDataAction, updateGenderAction } from './actions'

const inputClass =
  'block min-h-11 w-full min-w-0 border border-line bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-foreground focus:outline-none'
import { LanguageSelect, ThemeSelect } from './preferences'

export const instant = false

export default async function SettingsPage(props: PageProps<'/settings'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const savedAt = typeof params.saved === 'string' ? params.saved : null
  const bodyError = params.error === 'body'
  const [gender, body, { t }, cookieStore] = await Promise.all([
    getGender(session.userId),
    getBodyData(session.userId),
    getI18n(),
    cookies(),
  ])
  const thisYear = Number(todayISO().slice(0, 4))
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
        <form action={updateBodyDataAction}>
          <fieldset>
            <legend className="text-xs font-semibold uppercase tracking-wider">{t.settings.body}</legend>
            <p className="mt-1 text-sm text-muted">{t.settings.bodyHint}</p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t.settings.height}</span>
                <input
                  name="heightCm"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={BODY_LIMITS.heightCm.min}
                  max={BODY_LIMITS.heightCm.max}
                  defaultValue={body.heightCm ?? ''}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t.settings.weight}</span>
                <input
                  name="weightKg"
                  type="number"
                  inputMode="decimal"
                  step={0.1}
                  min={BODY_LIMITS.weightKg.min}
                  max={BODY_LIMITS.weightKg.max}
                  defaultValue={body.weightKg ?? ''}
                  className={inputClass}
                />
                {body.weighedOn && (
                  <span className="mt-1 block text-xs text-muted">{t.settings.weighedOn(body.weighedOn.replaceAll('-', '/'))}</span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">{t.settings.birthYear}</span>
                <input
                  name="birthYear"
                  type="number"
                  inputMode="numeric"
                  step={1}
                  min={BODY_LIMITS.birthYear.min}
                  max={thisYear - 10}
                  defaultValue={body.birthYear ?? ''}
                  className={inputClass}
                />
              </label>
            </div>
          </fieldset>
          {bodyError && <p className="mt-4 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{t.settings.bodyInvalid}</p>}
          <SubmitButton label={t.settings.saveBody} />
        </form>
      </section>
    </div>
  )
}
