'use client'

import { useState } from 'react'
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter'
import type { MuscleStatus } from '@/lib/training/muscles'
import type { Muscle } from '@/lib/training/plan'
import type { Gender } from '@/lib/user/profile'
import { useI18n } from '@/lib/i18n/client'
import { useIsDark } from '@/lib/use-is-dark'

// 每個肌群對應到圖上的部位
const MUSCLE_SLUGS: Record<Muscle, Slug[]> = {
  chest: ['chest'],
  shoulders: ['deltoids'],
  back: ['upper-back', 'trapezius', 'lower-back'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  core: ['abs', 'obliques'],
  quads: ['quadriceps', 'adductors'],
  posterior: ['gluteal', 'hamstring'],
  calves: ['calves'],
}
const NEUTRAL_SLUGS: Slug[] = ['head', 'neck', 'hands', 'feet', 'ankles', 'knees', 'forearm', 'tibialis']

// SVG 屬性無法使用 CSS 變數，所以依主題挑顏色
const COLORS = {
  light: { silhouette: '#ecebe7', hair: '#d6d4ce', unplanned: '#dddcd6', upcoming: '#c3c2b7', gap: '#ffffff', border: '#c9c7c0', selected: '#000000' },
  dark: { silhouette: '#2b2b28', hair: '#3a3a36', unplanned: '#3a3a36', upcoming: '#5e5d57', gap: '#0e0e0e', border: '#4a4a45', selected: '#ffffff' },
}
const STATUS_COLORS: Record<Exclude<MuscleStatus, 'upcoming'>, string> = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b' }

export interface MuscleFill {
  muscle: Muscle
  // null：本週課表未安排
  status: MuscleStatus | null
  description: string
}

export default function BodyFigures({ gender, fills }: { gender: Gender; fills: MuscleFill[] }) {
  const [selected, setSelected] = useState<Muscle | null>(null)
  const { t } = useI18n()
  const c = COLORS[useIsDark() ? 'dark' : 'light']
  const STROKE = { stroke: c.gap, strokeWidth: 3 }
  const slugToMuscle = new Map(Object.entries(MUSCLE_SLUGS).flatMap(([m, slugs]) => slugs.map((s) => [s, m as Muscle])))

  const data: ExtendedBodyPart[] = [
    ...NEUTRAL_SLUGS.map((slug) => ({ slug, styles: { fill: c.silhouette, ...STROKE } })),
    { slug: 'hair', styles: { fill: c.hair, ...STROKE } },
    ...fills.flatMap((f) =>
      MUSCLE_SLUGS[f.muscle].map((slug) => ({
        slug,
        styles: { fill: f.status === null ? c.unplanned : f.status === 'upcoming' ? c.upcoming : STATUS_COLORS[f.status], ...STROKE, ...(selected === f.muscle ? { stroke: c.selected, strokeWidth: 6 } : {}) },
      })),
    ),
  ]

  const onPress = (part: ExtendedBodyPart) => {
    const muscle = part.slug ? slugToMuscle.get(part.slug) : undefined
    setSelected(muscle && muscle !== selected ? muscle : null)
  }
  const info = fills.find((f) => f.muscle === selected)

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-2 [&_svg]:h-auto [&_svg]:w-full">
        {(['front', 'back'] as const).map((side) => (
          <figure key={side} className="mx-auto w-full max-w-[180px]">
            <Body data={data} side={side} gender={gender} border={c.border} defaultFill={c.silhouette} onBodyPartPress={onPress} />
            <figcaption className="mt-1 text-center text-xs text-muted">{side === 'front' ? t.muscleMap.front : t.muscleMap.back}</figcaption>
          </figure>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm">
        {info ? info.description : <span className="text-muted">{t.muscleMap.tapHint}</span>}
      </p>
    </div>
  )
}
