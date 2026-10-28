'use client'

import { createContext, useContext } from 'react'
import { DEFAULT_LOCALE, type Locale } from './config'
import { getMessages } from './messages'

// 只傳語系代碼給瀏覽器，字典在瀏覽器端直接載入（內含格式化函式，無法序列化）
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

export function useI18n() {
  const locale = useContext(LocaleContext)
  return { locale, t: getMessages(locale) }
}
