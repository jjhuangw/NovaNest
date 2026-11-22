'use client'

import { useI18n } from '@/lib/i18n/client'

// 動作示範圖：起始、結束兩張（public/exercises/{id}-0.webp、-1.webp）。
// sm 是清單裡的縮圖（不標示起始／結束），md 是選好動作後的預覽
export default function ExerciseDemo({ imageId, name, size }: { imageId: string; name: string; size: 'sm' | 'md' }) {
  const { t } = useI18n()
  const tg = t.training.guide
  return (
    <div className={size === 'sm' ? 'flex shrink-0 gap-0.5' : 'grid max-w-sm grid-cols-2 gap-2'}>
      {[0, 1].map((i) => {
        const phase = i === 0 ? tg.start : tg.end
        return (
          <div key={i}>
            {/* 圖片已經是壓縮過的 WebP，不需要再經過圖片最佳化 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/exercises/${imageId}-${i}.webp`}
              alt={tg.imageAlt(name, phase)}
              width={size === 'sm' ? 48 : 240}
              height={size === 'sm' ? 32 : 160}
              loading="lazy"
              className={size === 'sm' ? 'h-8 w-12 bg-stone object-cover' : 'aspect-[3/2] w-full bg-stone object-cover'}
            />
            {size === 'md' && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
                {i + 1}・{phase}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
