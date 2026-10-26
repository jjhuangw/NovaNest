import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export const instant = false

export default async function Home() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  redirect('/login')
}
