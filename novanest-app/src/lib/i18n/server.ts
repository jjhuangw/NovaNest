import 'server-only'
import { cookies, headers } from 'next/headers'
import { isLocale, LOCALE_COOKIE, preferredLocale, type Locale } from './config'
import { getMessages } from './messages'

// 優先使用 cookie 中的選擇，沒有時依瀏覽器語言
export async function getLocale(): Promise<Locale> {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(saved)) return saved
  return preferredLocale((await headers()).get('accept-language'))
}

export async function getI18n() {
  const locale = await getLocale()
  return { locale, t: getMessages(locale) }
}
