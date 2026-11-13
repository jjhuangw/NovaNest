'use client'

import { useId, useState, useTransition } from 'react'
import { useI18n } from '@/lib/i18n/client'
import type { ExerciseGuide as Guide, GuideSections } from '@/lib/training/exercise-guide'
import { exerciseGuideAction } from './actions'

const SECTIONS = ['setup', 'steps', 'force', 'mistakes'] as const satisfies readonly (keyof GuideSections)[]

// 課表上每個動作的「怎麼做・怎麼發力」：起始與結束的示範圖，以及 AI 產生的器材設定、步驟、發力與常見錯誤。
// 還沒有人產生過說明時，第一次打開才會呼叫 AI。
export default function ExerciseGuide({
  name,
  displayName,
  catalogId,
  initialGuide,
}: {
  // 課表上的原始名稱（用來找說明），以及目前語系顯示的名稱
  name: string
  displayName: string
  catalogId: string | null
  initialGuide: Guide | null
}) {
  const { t } = useI18n()
  const tg = t.training.guide
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [guide, setGuide] = useState(initialGuide)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const imageId = guide?.catalogId ?? catalogId

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && !guide && !pending) {
      setError(null)
      startTransition(async () => {
        try {
          const result = await exerciseGuideAction(name)
          if (result.ok) setGuide(result.guide)
          else setError(result.error)
        } catch {
          setError(tg.failed)
        }
      })
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold underline-offset-4 hover:underline"
      >
        <span aria-hidden className={`inline-block transition-transform ${open ? 'rotate-90' : ''}`}>
          ▸
        </span>
        {open ? tg.close : tg.open}
      </button>

      {open && (
        <div id={panelId} className="mt-3 border border-line p-4 sm:p-5">
          {imageId && (
            <figure>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((i) => `/exercises/${imageId}-${i}.webp`).map((src, i) => {
                  const phase = i === 0 ? tg.start : tg.end
                  return (
                    <div key={src}>
                      {/* 圖片已經是壓縮過的 WebP，不需要再經過圖片最佳化 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={tg.imageAlt(displayName, phase)}
                        width={480}
                        height={320}
                        loading="lazy"
                        className="aspect-[3/2] w-full bg-stone object-cover"
                      />
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
                        {i + 1}・{phase}
                      </p>
                    </div>
                  )
                })}
              </div>
              <figcaption className="sr-only">{displayName}</figcaption>
            </figure>
          )}

          {guide ? (
            <div className={`grid gap-x-8 gap-y-5 sm:grid-cols-2 ${imageId ? 'mt-5' : ''}`}>
              {SECTIONS.map((key) =>
                guide.sections[key].length > 0 ? (
                  <section key={key}>
                    <h4 className="text-xs font-semibold uppercase tracking-widest">{tg[key]}</h4>
                    {key === 'steps' ? (
                      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm font-normal leading-relaxed marker:text-muted">
                        {guide.sections[key].map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ol>
                    ) : (
                      <ul
                        className={`mt-2 list-disc space-y-1.5 pl-5 text-sm font-normal leading-relaxed marker:text-line ${
                          key === 'mistakes' ? 'text-muted' : ''
                        }`}
                      >
                        {guide.sections[key].map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                ) : null,
              )}
            </div>
          ) : pending ? (
            <p className={`text-sm font-normal text-muted ${imageId ? 'mt-4' : ''}`} role="status">
              {tg.loading}
            </p>
          ) : error ? (
            <p className={`border-l-2 border-accent bg-stone px-3 py-2 text-sm font-normal text-accent ${imageId ? 'mt-4' : ''}`} role="alert">
              {error}
            </p>
          ) : null}

          <p className="mt-4 text-[11px] font-normal leading-relaxed text-muted">
            {guide && `${tg.aiNote} `}
            {imageId && tg.imageCredit}
          </p>
        </div>
      )}
    </div>
  )
}
