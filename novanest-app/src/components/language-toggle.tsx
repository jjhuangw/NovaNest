'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLocaleAction } from '@/lib/i18n/actions'
import { useI18n } from '@/lib/i18n/client'

export default function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      lang={locale === 'en' ? 'zh-TW' : 'en'}
      aria-label={t.language.switchLabel}
      title={t.language.switchLabel}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = locale === 'en' ? 'zh-TW' : 'en'
          await setLocaleAction(next)
          // 根 layout 是預先產生的，<html lang> 只在載入時由 cookie 設定，這裡同步更新
          document.documentElement.lang = next
          router.refresh()
        })
      }
      className={`min-w-8 border border-line px-2 py-1 text-xs font-semibold transition-colors hover:border-foreground disabled:opacity-50 ${className}`}
    >
      {t.language.switchShort}
    </button>
  )
}
