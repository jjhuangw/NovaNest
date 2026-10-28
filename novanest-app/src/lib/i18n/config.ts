// 語系與主題設定，瀏覽器與伺服器共用。偏好存在 cookie，不放進網址。

export const LOCALES = ['zh-TW', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'zh-TW'
export const LOCALE_COOKIE = 'locale'

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

// 依 Accept-Language 的優先順序挑第一個支援的語言；都不支援時用預設語系
export function preferredLocale(acceptLanguage: string | null): Locale {
  const tags = (acceptLanguage ?? '')
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(';')
      const q = params.find((p) => p.trim().startsWith('q='))
      return { tag, q: q ? Number(q.trim().slice(2)) || 0 : 1 }
    })
    .filter((t) => t.tag && t.q > 0)
    .sort((a, b) => b.q - a.q)
  for (const { tag } of tags) {
    if (tag.startsWith('zh')) return 'zh-TW'
    if (tag.startsWith('en')) return 'en'
  }
  return DEFAULT_LOCALE
}

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export const THEME_COOKIE = 'theme'

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 365
