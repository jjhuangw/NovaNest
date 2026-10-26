import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export const instant = false

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-950">
      <nav className="bg-zinc-900 border-b border-zinc-800 px-6 py-3.5 flex items-center justify-between">
        <span className="font-black text-orange-500 text-xl tracking-tight">NovaNest</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">{session.username}</span>
          <LogoutButton />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
