import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SavedToast } from '@/components/form-feedback'
import { getUserDetail } from '@/lib/admin/queries'
import { AI_FEATURES } from '@/lib/ai/usage'
import { loadForAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { deleteUserAction, setDisabledAction, setPlanAction, setRoleAction } from '../../actions'
import { PlanBadge } from '../../plan-badge'
import { effectivePlan, PLANS } from '@/lib/user/plan'
import { isoDateOf } from '@/lib/training/dates'
import { formatDay, formatInt, formatUsd, tableClass, tdClass, thClass } from '../../format'
import ConfirmForm from './confirm-form'

export const instant = false

export default async function AdminUserPage(props: PageProps<'/admin/users/[id]'>) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const params = await props.searchParams
  const savedAt = typeof params.saved === 'string' ? params.saved : null
  const planError = params.planError === '1'

  const result = await loadForAdmin(() => Promise.all([getUserDetail(id), getI18n()]))
  if (!result) notFound()
  const admin = result.session
  const [detail, { t }] = result.data
  if (!detail) notFound()
  const { user, ai } = detail
  const ta = t.admin
  const tu = ta.user
  const tg = ta.usage
  const isSelf = user.id === admin.userId
  const gender = user.gender === 'male' ? t.settings.male : user.gender === 'female' ? t.settings.female : ta.never

  return (
    <div>
      {savedAt && <SavedToast key={savedAt} savedAt={savedAt} message={tu.saved} />}

      <Link href="/admin/users" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
        {tu.back}
      </Link>
      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <h2 className="text-2xl font-bold">{user.username}</h2>
        <span className="border border-line px-2 py-0.5 text-xs font-semibold">{ta.roles[user.role] ?? user.role}</span>
        {user.disabledAt && <span className="border border-accent px-2 py-0.5 text-xs font-semibold text-accent">{ta.status.disabled}</span>}
      </div>

      <Section title={tu.profile} hint={tu.profileHint}>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <Field label={tu.email} value={user.email} />
          <Field label={tu.gender} value={gender} />
          <Field label={tu.birthYear} value={user.birthYear ? String(user.birthYear) : ta.never} />
          <Field label={tu.joined} value={formatDay(user.createdAt, ta.never)} />
          <Field label={tu.lastSeen} value={formatDay(user.lastSeenAt, ta.never)} />
          <Field label={tu.lastActive} value={formatDay(user.lastActiveAt, ta.never)} />
        </dl>
        <h3 className="mt-8 text-xs font-semibold tracking-wider text-muted">{tu.records}</h3>
        <dl className="mt-3 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            [ta.overview.workouts, user.workouts],
            [ta.overview.foods, user.foods],
            [ta.overview.photos, user.photos],
            [ta.overview.plans, user.plans],
          ].map(([label, n]) => (
            <div key={label} className="bg-background p-4">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{formatInt(Number(n))}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={tu.ai} hint={tu.aiHint}>
        <div className="overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>{tg.feature}</th>
                <th className={`${thClass} text-right`}>{tg.calls}</th>
                <th className={`${thClass} text-right`}>{tg.cost}</th>
              </tr>
            </thead>
            <tbody>
              {AI_FEATURES.map((f) => {
                const row = ai.byFeature.get(f)
                return (
                  <tr key={f}>
                    <td className={tdClass}>{tg.features[f]}</td>
                    <td className={`${tdClass} text-right`}>{formatInt(row?.calls ?? 0)}</td>
                    <td className={`${tdClass} text-right`}>{formatUsd(row?.costUsd ?? 0)}</td>
                  </tr>
                )
              })}
              <tr className="font-bold">
                <td className={tdClass}>{tg.total}</td>
                <td className={`${tdClass} text-right`}>{formatInt(ai.total.calls)}</td>
                <td className={`${tdClass} text-right`}>{formatUsd(ai.total.costUsd)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={tu.plan} hint={tu.planHint}>
        {(() => {
          const current = effectivePlan(user.plan, user.proUntil)
          const until = user.plan === 'pro' && user.proUntil ? isoDateOf(user.proUntil) : ''
          return (
            <>
              <p className="text-sm">
                <PlanBadge plan={current} proUntil={user.proUntil} expired={user.plan === 'pro' && current === 'free'} t={t} />
              </p>
              <form action={setPlanAction} className="mt-5 space-y-4">
                <input type="hidden" name="id" value={user.id} />
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="sr-only">{tu.plan}</legend>
                  {PLANS.map((p) => (
                    <label key={p}>
                      <input type="radio" name="plan" value={p} defaultChecked={(user.plan === 'pro' && current === 'pro' ? 'pro' : 'free') === p} className="peer sr-only" />
                      <span className="block cursor-pointer border border-line px-4 py-2 text-sm font-semibold peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2">
                        {t.plans.names[p]}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label className="block max-w-xs">
                  <span className="mb-1 block text-xs text-muted">{tu.proUntil}</span>
                  <input
                    type="date"
                    name="proUntil"
                    defaultValue={until}
                    className="block min-h-11 w-full border border-line bg-surface px-3 py-2 text-sm focus:border-foreground focus:outline-none"
                  />
                  <span className="mt-1 block text-xs text-muted">{tu.proUntilHint}</span>
                </label>
                {planError && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-sm text-accent">{tu.planInvalid}</p>}
                <button type="submit" className="min-h-11 border border-foreground px-5 text-sm font-semibold hover:bg-foreground hover:text-background">
                  {tu.savePlan}
                </button>
              </form>
            </>
          )
        })()}
      </Section>

      <Section title={tu.actions} hint={tu.actionsHint}>
        {isSelf ? (
          <p className="text-sm text-muted">{tu.self}</p>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <ConfirmForm
                action={setDisabledAction}
                fields={{ id: user.id, disabled: user.disabledAt ? '0' : '1' }}
                confirm={user.disabledAt ? tu.confirmEnable(user.username) : tu.confirmDisable(user.username)}
                label={user.disabledAt ? tu.enable : tu.disable}
              />
              <ConfirmForm
                action={setRoleAction}
                fields={{ id: user.id, role: user.role === 'admin' ? 'user' : 'admin' }}
                confirm={tu.confirmRole(user.username)}
                label={user.role === 'admin' ? tu.removeAdmin : tu.makeAdmin}
              />
            </div>
            <div className="border-t border-line pt-8">
              <p className="mb-3 text-sm text-muted">{tu.deleteHint}</p>
              <ConfirmForm
                action={deleteUserAction}
                fields={{ id: user.id }}
                confirm={tu.confirmDelete(user.username)}
                label={tu.delete}
                danger
              />
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-10 last:border-b-0 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
