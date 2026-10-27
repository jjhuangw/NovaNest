'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { isGender, setGender } from '@/lib/user/profile'

export async function updateGenderAction(formData: FormData) {
  const session = await getSession()
  if (!session) redirect('/login')

  const value = formData.get('gender')
  await setGender(session.userId, isGender(value) ? value : null)

  redirect(`/settings?saved=${Date.now()}`)
}
