import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { SavedToast, SubmitButton } from '@/components/form-feedback'
import { isTheme, THEME_COOKIE } from '@/lib/i18n/config'
import { getI18n } from '@/lib/i18n/server'
import { todayISO } from '@/lib/training/dates'
import { BODY_LIMITS, getBodyData } from '@/lib/user/profile'
import { updateProfileAction } from './actions'
import { LanguageSelect, ThemeSelect, segmentClass } from './preferences'

export const instant = false

const inputClass =
  'block min-h-11 w-full min-w-0 border border-line bg-surface px-3 py-2.5 text-sm tabular-nums focus:border-foreground focus:outline-none'
// 不轉大寫，避免單位 cm、kg 變成 CM、KG
const fieldLabel = 'mb-2 block text-xs font-semibold tracking-wider'

export default async function SettingsPage(props: PageProps<'/settings'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await props.searchParams
  const savedAt = typeof params.saved === 'string' ? params.saved : null
  const invalid = params.error === 'body'
  const [body, { t }, cookieStore] = await Promise.all([getBodyData(session.userId), getI18n(), cookies()])
  const thisYear = Number(todayISO().slice(0, 4))
  const savedTheme = cookieStore.get(THEME_COOKIE)?.value
  const theme = isTheme(savedTheme) ? savedTheme : 'system'
  const ts = t.settings

  const genders = [
    { value: 'male', label: ts.male },
    { value: 'female', label: ts.female },
    { value: '', label: ts.unspecified },
  ]

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Settings</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{ts.title}</h1>
          <p className="mt-4 text-base">{session.username}</p>
        </div>
      </section>

      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={ts.saved} />}

      <div className="mx-auto max-w-6xl px-6">
        <Section title={ts.profile} hint={ts.profileHint}>
          <form action={updateProfileAction}>
            <fieldset>
              <legend className={fieldLabel}>{ts.gender}</legend>
              <div className="grid grid-cols-3 gap-2">
                {genders.map((o) => (
                  <label key={o.value}>
                    <input type="radio" name="gender" value={o.value} defaultChecked={(body.gender ?? '') === o.value} className="peer sr-only" />
                    <span className={segmentClass}>{o.label}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{ts.genderHint}</p>
            </fieldset>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className="block min-w-0">
                <span className={fieldLabel}>{ts.height}</span>
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
              <label className="block min-w-0">
                <span className={fieldLabel}>{ts.weight}</span>
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
              </label>
              <label className="block min-w-0">
                <span className={fieldLabel}>{ts.birthYear}</span>
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
            <p className="mt-2 text-xs text-muted">
              {ts.bodyHint}
              {body.weighedOn && <span className="block">{ts.weighedOn(body.weighedOn.replaceAll('-', '/'))}</span>}
            </p>

            {invalid && <p className="mt-6 border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{ts.bodyInvalid}</p>}
            <div className="mt-2">
              <SubmitButton label={ts.save} />
            </div>
          </form>
        </Section>

        <Section title={ts.preferences} hint={ts.preferencesHint}>
          <div className="space-y-8">
            <LanguageSelect />
            <ThemeSelect initial={theme} />
          </div>
        </Section>
      </div>
    </div>
  )
}

// 左邊為區塊標題與說明，右邊為內容；手機上改為上下排列
function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-12 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
