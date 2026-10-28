import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { COOKIE_NAME } from '@/lib/auth/session'
import { isLocale, LOCALE_COOKIE, PREFERENCE_MAX_AGE, preferredLocale } from '@/lib/i18n/config'

const PUBLIC_PATHS = ['/login', '/register']

// 第一次造訪時依瀏覽器語言記下語系，之後頁面與 <html lang> 都以 cookie 為準
function withLocale(req: NextRequest, res: NextResponse) {
  if (!isLocale(req.cookies.get(LOCALE_COOKIE)?.value)) {
    const locale = preferredLocale(req.headers.get('accept-language'))
    res.cookies.set(LOCALE_COOKIE, locale, { path: '/', maxAge: PREFERENCE_MAX_AGE, sameSite: 'lax' })
  }
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/auth')
  ) {
    return withLocale(req, NextResponse.next())
  }

  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return withLocale(req, NextResponse.redirect(new URL('/login', req.url)))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    const res = NextResponse.redirect(new URL('/login', req.url))
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
    return withLocale(req, res)
  }

  return withLocale(req, NextResponse.next())
}

export const config = {
  // 只處理真正的頁面路徑，完整排除 _next 所有內部請求
  matcher: ['/((?!_next|favicon.ico|.*\\..*).*)'],
}
