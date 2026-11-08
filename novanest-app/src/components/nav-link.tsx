'use client'

import Link, { useLinkStatus } from 'next/link'
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
    <Link href={href} aria-current={active ? 'page' : undefined} aria-label={label} className={`group font-semibold ${base}`}>
      {children}
      <PendingIndicator />
    </Link>
  )
}

// 點擊後到新頁面出現前：畫面頂端顯示細的進度條，讓使用者知道已經在換頁。
// 不用 loading.tsx 的骨架畫面：React 會讓骨架至少停留約 300ms，資料很快時反而變慢。
function PendingIndicator() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <>
      <span aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-accent motion-safe:animate-pulse" />
      <span className="sr-only" role="status">
        Loading…
      </span>
    </>
  )
}
