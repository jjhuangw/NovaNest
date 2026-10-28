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
          await setLocaleAction(locale === 'en' ? 'zh-TW' : 'en')
          router.refresh()
        })
      }
      className={`min-w-8 border border-line px-2 py-1 text-xs font-semibold transition-colors hover:border-foreground disabled:opacity-50 ${className}`}
    >
      {t.language.switchShort}
    </button>
  )
}
