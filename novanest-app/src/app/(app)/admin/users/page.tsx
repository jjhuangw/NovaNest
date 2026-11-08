import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SavedToast } from '@/components/form-feedback'
import { listUsers, USERS_PAGE_SIZE, type UserFilter } from '@/lib/admin/queries'
import { requireAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import { formatDay, formatInt, tableClass, tdClass, thClass } from '../format'

export const instant = false

const FILTERS: UserFilter[] = ['all', 'admin', 'disabled']

export default async function AdminUsersPage(props: PageProps<'/admin/users'>) {
  if (!(await requireAdmin())) notFound()
  const params = await props.searchParams
  const q = typeof params.q === 'string' ? params.q.trim().slice(0, 100) : ''
  const filter = FILTERS.find((f) => f === params.filter) ?? 'all'
  const page = Math.max(1, Math.floor(Number(params.page)) || 1)
  const deletedAt = typeof params.deleted === 'string' ? params.deleted : null

  const [{ rows, total }, { t }] = await Promise.all([listUsers({ q, filter, page }), getI18n()])
  const ta = t.admin
  const tu = ta.users
  const pages = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE))

  const href = (next: { filter?: UserFilter; page?: number }) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    const f = next.filter ?? filter
    if (f !== 'all') sp.set('filter', f)
    const p = next.page ?? 1
    if (p > 1) sp.set('page', String(p))
    const s = sp.toString()
    return s ? `/admin/users?${s}` : '/admin/users'
  }

  return (
    <div>
      {deletedAt && <SavedToast key={deletedAt} savedAt={deletedAt} message={tu.deleted} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <form role="search" className="flex w-full max-w-md gap-2">
          {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
          <label className="min-w-0 flex-1">
            <span className="sr-only">{tu.searchLabel}</span>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder={tu.searchPlaceholder}
              className="block min-h-11 w-full border border-line bg-surface px-3 py-2.5 text-sm focus:border-foreground focus:outline-none"
            />
          </label>
          <button type="submit" className="shrink-0 bg-foreground px-5 text-sm font-semibold text-background hover:opacity-85">
            {tu.search}
          </button>
        </form>
        <div className="flex gap-2 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ filter: f })}
              aria-current={f === filter ? 'page' : undefined}
              className={`border px-3 py-1.5 ${f === filter ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`}
            >
              {tu.filters[f]}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted">{tu.count(total)}</p>

      {rows.length === 0 ? (
        <p className="mt-6 border border-line p-8 text-center text-sm text-muted">{tu.empty}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>{tu.username}</th>
                <th className={thClass}>{tu.role}</th>
                <th className={thClass}>{tu.statusLabel}</th>
                <th className={thClass}>{tu.joined}</th>
                <th className={thClass}>{tu.lastActive}</th>
                <th className={`${thClass} text-right`}>{tu.workouts}</th>
                <th className={`${thClass} text-right`}>{tu.foods}</th>
                <th className={`${thClass} text-right`}>{tu.aiCalls}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="hover:bg-stone">
                  <td className={tdClass}>
                    <Link href={`/admin/users/${u.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {u.username}
                    </Link>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className={tdClass}>{ta.roles[u.role] ?? u.role}</td>
                  <td className={tdClass}>
                    {u.disabledAt ? <span className="text-accent">{ta.status.disabled}</span> : ta.status.active}
                  </td>
                  <td className={tdClass}>{formatDay(u.createdAt, ta.never)}</td>
                  <td className={tdClass}>{formatDay(u.lastActiveAt, ta.never)}</td>
                  <td className={`${tdClass} text-right`}>{formatInt(u.workouts)}</td>
                  <td className={`${tdClass} text-right`}>{formatInt(u.foods)}</td>
                  <td className={`${tdClass} text-right`}>{formatInt(u.aiCalls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={href({ page: page - 1 })} className="font-semibold underline-offset-4 hover:underline">
              ← {tu.prev}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">{tu.page(page, pages)}</span>
          {page < pages ? (
            <Link href={href({ page: page + 1 })} className="font-semibold underline-offset-4 hover:underline">
              {tu.next} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
