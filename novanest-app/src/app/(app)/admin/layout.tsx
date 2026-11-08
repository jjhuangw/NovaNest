import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/session'
import { getI18n } from '@/lib/i18n/server'
import AdminTabs from './admin-tabs'

export const instant = false

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return { title: `${t.admin.title} · NovaNest`, robots: { index: false } }
}

// 非管理員一律回 404，不透露後台的存在。各頁面與 action 也會再檢查一次。
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await requireAdmin())) notFound()
  const { t } = await getI18n()
  const ta = t.admin

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 pt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Admin</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{ta.title}</h1>
          <div className="mt-8">
            <AdminTabs
              label={ta.tabsLabel}
              tabs={[
                { href: '/admin', label: ta.tabs.overview },
                { href: '/admin/users', label: ta.tabs.users },
                { href: '/admin/ai-usage', label: ta.tabs.aiUsage },
              ]}
            />
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-6 py-10">{children}</div>
    </div>
  )
}
