'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALES, PREFERENCE_MAX_AGE, THEME_COOKIE, THEMES, type Locale, type Theme } from '@/lib/i18n/config'
import { setLocaleAction } from '@/lib/i18n/actions'
import { useI18n } from '@/lib/i18n/client'

// 語言名稱一律用該語言本身顯示
const LOCALE_NAMES: Record<Locale, string> = { 'zh-TW': '繁體中文', en: 'English' }

// 分段按鈕：搭配前一個 peer sr-only 的 radio 使用
export const segmentClass =
  'block cursor-pointer border border-line px-2 py-2.5 text-center text-sm font-semibold peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-disabled:cursor-wait peer-disabled:opacity-60'
const legendClass = 'mb-2 block text-xs font-semibold uppercase tracking-wider'

// 立即套用並記在 cookie，讓下次載入時 layout 的內嵌 script 能在繪製前套用
function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${PREFERENCE_MAX_AGE}; SameSite=Lax`
}

export function ThemeSelect({ initial }: { initial: Theme }) {
  const { t } = useI18n()
  const [theme, setTheme] = useState(initial)

  function choose(next: Theme) {
    setTheme(next)
    applyTheme(next)
  }

  return (
    <fieldset>
      <legend className={legendClass}>{t.settings.theme}</legend>
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map((value) => (
          <label key={value}>
            <input type="radio" name="theme" checked={theme === value} onChange={() => choose(value)} className="peer sr-only" />
            <span className={segmentClass}>{t.settings.themes[value]}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{t.settings.themeHint}</p>
    </fieldset>
  )
}

export function LanguageSelect() {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <fieldset>
      <legend className={legendClass}>{t.settings.language}</legend>
      <div className="grid grid-cols-2 gap-2">
        {LOCALES.map((value) => (
          <label key={value} lang={value}>
            <input
              type="radio"
              name="locale"
              checked={locale === value}
              disabled={pending}
              onChange={() =>
                startTransition(async () => {
                  await setLocaleAction(value)
                  router.refresh()
                })
              }
              className="peer sr-only"
            />
            <span className={segmentClass}>{LOCALE_NAMES[value]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
