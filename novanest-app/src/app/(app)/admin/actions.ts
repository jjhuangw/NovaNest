'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/session'
import { deleteUser, setUserDisabled, setUserRole } from '@/lib/admin/users'

const UUID = /^[0-9a-f-]{36}$/i

// 取得要操作的使用者 id；不能對自己操作，避免管理員把自己鎖在外面
async function target(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) notFound()
  const id = formData.get('id')
  if (typeof id !== 'string' || !UUID.test(id) || id === admin.userId) notFound()
  return id
}

function done(id: string) {
  revalidatePath('/admin', 'layout')
  redirect(`/admin/users/${id}?saved=${Date.now()}`)
}

export async function setDisabledAction(formData: FormData) {
  const id = await target(formData)
  await setUserDisabled(id, formData.get('disabled') === '1')
  done(id)
}

export async function setRoleAction(formData: FormData) {
  const id = await target(formData)
  await setUserRole(id, formData.get('role') === 'admin' ? 'admin' : 'user')
  done(id)
}

export async function deleteUserAction(formData: FormData) {
  const id = await target(formData)
  await deleteUser(id)
  revalidatePath('/admin', 'layout')
  redirect(`/admin/users?deleted=${Date.now()}`)
}
