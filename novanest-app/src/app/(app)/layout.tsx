import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'

export const instant = false

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-foreground py-2 text-center text-xs tracking-wider text-white">
        訓練・飲食・體態，一站式管理你的健身旅程
      </div>
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-accent" />
          <span className="text-lg font-black uppercase tracking-[0.2em]">NovaNest</span>
        </Link>
        <div className="flex items-center gap-4 text-sm sm:gap-6">
          <Link href="/training" className="font-semibold underline-offset-4 hover:underline">
            課表
          </Link>
          <Link href="/training/log" className="font-semibold underline-offset-4 hover:underline">
            紀錄
          </Link>
          <span className="hidden font-semibold sm:inline">{session.username}</span>
          <LogoutButton />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
