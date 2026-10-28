import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db/client'
import { users } from '@/lib/db/schema'
import { signToken } from '@/lib/auth/jwt'
import { COOKIE_NAME } from '@/lib/auth/session'
import { eq } from 'drizzle-orm'

// 錯誤訊息為代碼，由前端依語系顯示
const schema = z.object({
  username: z.string().min(3, 'invalid_username').max(30, 'invalid_username').regex(/^[a-zA-Z0-9_]+$/, 'invalid_username'),
  email: z.string().email('invalid_email'),
  password: z.string().min(8, 'weak_password'),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { username, email, password } = parsed.data

  const existing = await db.query.users.findFirst({
    where: (u) => eq(u.email, email),
  })
  if (existing) {
    return NextResponse.json({ error: 'email_taken' }, { status: 409 })
  }

  const existingUsername = await db.query.users.findFirst({
    where: (u) => eq(u.username, username),
  })
  if (existingUsername) {
    return NextResponse.json({ error: 'username_taken' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const [user] = await db.insert(users).values({ username, email, passwordHash }).returning()

  const token = await signToken({ userId: user.id, username: user.username })

  const res = NextResponse.json({ user: { id: user.id, username: user.username, email: user.email } }, { status: 201 })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
  return res
}
