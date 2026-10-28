'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// 以底線標示目前所在頁面；手機沒有 hover，所以一定要有這個狀態
export default function NavLink({
  href,
  variant,
  label,
  children,
}: {
  href: string
  variant: 'inline' | 'tab'
  label?: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const active = pathname === href
  const base =
    variant === 'tab'
      ? `-mb-px block border-b-2 py-2.5 text-center ${active ? 'border-foreground' : 'border-transparent text-muted'}`
      : `inline-flex border-b-2 py-0.5 hover:border-foreground ${active ? 'border-foreground' : 'border-transparent'}`
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} aria-label={label} className={`font-semibold ${base}`}>
      {children}
    </Link>
  )
}
