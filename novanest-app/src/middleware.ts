import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { COOKIE_NAME } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/register']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
    return res
  }

  return NextResponse.next()
}

export const config = {
  // 只處理真正的頁面路徑，完整排除 _next 所有內部請求
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
}
