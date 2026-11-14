'use client'

import Body, { type ExtendedBodyPart } from 'react-muscle-highlighter'
import { MUSCLES, type Muscle } from '@/lib/training/plan'
import type { Gender } from '@/lib/user/profile'
import { useI18n } from '@/lib/i18n/client'
import { useIsDark } from '@/lib/use-is-dark'
import { COLORS, MUSCLE_SLUGS, NEUTRAL_SLUGS } from './body-figures'

// 主要肌群用品牌紅、次要肌群用淡紅；SVG 屬性無法使用 CSS 變數，所以依主題挑顏色。
// 文字同時列出主要與次要肌群，不單靠顏色辨識。
const HIGHLIGHT = {
  light: { primary: '#d22030', secondary: '#f2a7ae' },
  dark: { primary: '#ff4b57', secondary: '#a5474e' },
}

// 紀錄頁每個動作旁的小人形圖：正面與背面，標出這個動作訓練到的部位
export default function ExerciseMuscles({ muscles, gender }: { muscles: Partial<Record<Muscle, number>>; gender: Gender }) {
  const { t } = useI18n()
  const dark = useIsDark()
  const c = COLORS[dark ? 'dark' : 'light']
  const h = HIGHLIGHT[dark ? 'dark' : 'light']
  const primary = MUSCLES.filter((m) => (muscles[m] ?? 0) >= 1)
  const secondary = MUSCLES.filter((m) => (muscles[m] ?? 0) > 0 && (muscles[m] ?? 0) < 1)
  if (primary.length + secondary.length === 0) return null

  const stroke = { stroke: c.gap, strokeWidth: 3 }
  const data: ExtendedBodyPart[] = [
    ...NEUTRAL_SLUGS.map((slug) => ({ slug, styles: { fill: c.silhouette, ...stroke } })),
    { slug: 'hair', styles: { fill: c.hair, ...stroke } },
    ...MUSCLES.flatMap((m) =>
      MUSCLE_SLUGS[m].map((slug) => ({
        slug,
        styles: { fill: primary.includes(m) ? h.primary : secondary.includes(m) ? h.secondary : c.unplanned, ...stroke },
      })),
    ),
  ]
  const names = (list: Muscle[]) => list.map((m) => t.muscles[m]).join(t.muscleMap.listSeparator)

  return (
    <div className="mt-2 flex items-center gap-3">
      <div aria-hidden className="flex shrink-0 gap-0.5 [&_svg]:h-auto [&_svg]:w-full">
        {(['front', 'back'] as const).map((side) => (
          <div key={side} className="pointer-events-none w-10">
            <Body data={data} side={side} gender={gender} border={c.border} defaultFill={c.silhouette} />
          </div>
        ))}
      </div>
      <p className="text-xs leading-relaxed">
        <span className="sr-only">{t.log.musclesWorked}：</span>
        {primary.length > 0 && (
          <span className="mr-3 inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: h.primary }} />
            <span className="text-muted">{t.log.primaryMuscles}</span>
            <span className="font-semibold">{names(primary)}</span>
          </span>
        )}
        {secondary.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: h.secondary }} />
            <span className="text-muted">{t.log.secondaryMuscles}</span>
            <span>{names(secondary)}</span>
          </span>
        )}
      </p>
    </div>
  )
}
