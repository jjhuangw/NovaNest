'use server'

import { cookies } from 'next/headers'
import { isLocale, LOCALE_COOKIE, PREFERENCE_MAX_AGE } from './config'

// 設定 cookie 後 Next.js 會自動重新整理目前頁面
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return
  ;(await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: PREFERENCE_MAX_AGE, sameSite: 'lax' })
}
