'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminTabs({ label, tabs }: { label: string; tabs: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="flex gap-6 overflow-x-auto text-sm">
      {tabs.map((tab) => {
        // 總覽只在 /admin 本身標示；其他分頁包含子頁面（例如 /admin/users/:id）
        const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 py-3 font-semibold ${active ? 'border-foreground' : 'border-transparent text-muted hover:text-foreground'}`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
