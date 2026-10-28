'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LOCALES, PREFERENCE_MAX_AGE, THEME_COOKIE, THEMES, type Locale, type Theme } from '@/lib/i18n/config'
import { setLocaleAction } from '@/lib/i18n/actions'
import { useI18n } from '@/lib/i18n/client'

// 語言名稱一律用該語言本身顯示
const LOCALE_NAMES: Record<Locale, string> = { 'zh-TW': '繁體中文', en: 'English' }

const optionClass = 'flex cursor-pointer items-center gap-3 py-3.5'
const radioClass = 'h-4 w-4 accent-foreground'

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
    <Group legend={t.settings.theme} hint={t.settings.themeHint}>
      {THEMES.map((value) => (
        <label key={value} className={optionClass}>
          <input type="radio" name="theme" checked={theme === value} onChange={() => choose(value)} className={radioClass} />
          <span className="font-semibold">{t.settings.themes[value]}</span>
        </label>
      ))}
    </Group>
  )
}

export function LanguageSelect() {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Group legend={t.settings.language} hint={t.settings.languageHint}>
      {LOCALES.map((value) => (
        <label key={value} className={optionClass} lang={value}>
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
            className={radioClass}
          />
          <span className="font-semibold">{LOCALE_NAMES[value]}</span>
        </label>
      ))}
    </Group>
  )
}

function Group({ legend, hint, children }: { legend: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider">{legend}</legend>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      <div className="mt-4 divide-y divide-line border-y border-line">{children}</div>
    </fieldset>
  )
}
