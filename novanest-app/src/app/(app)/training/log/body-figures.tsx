'use client'

import { useState } from 'react'
import Body, { type ExtendedBodyPart, type Slug } from 'react-muscle-highlighter'
import type { Muscle } from '@/lib/training/plan'
import type { Gender } from '@/lib/user/profile'

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

const SILHOUETTE = '#ecebe7'
const HAIR = '#d6d4ce'
const STROKE = { stroke: '#ffffff', strokeWidth: 3 }

export interface MuscleFill {
  muscle: Muscle
  color: string
  description: string
}

export default function BodyFigures({ gender, fills }: { gender: Gender; fills: MuscleFill[] }) {
  const [selected, setSelected] = useState<Muscle | null>(null)
  const slugToMuscle = new Map(Object.entries(MUSCLE_SLUGS).flatMap(([m, slugs]) => slugs.map((s) => [s, m as Muscle])))

  const data: ExtendedBodyPart[] = [
    ...NEUTRAL_SLUGS.map((slug) => ({ slug, styles: { fill: SILHOUETTE, ...STROKE } })),
    { slug: 'hair', styles: { fill: HAIR, ...STROKE } },
    ...fills.flatMap((f) =>
      MUSCLE_SLUGS[f.muscle].map((slug) => ({
        slug,
        styles: { fill: f.color, ...STROKE, ...(selected === f.muscle ? { stroke: '#000000', strokeWidth: 6 } : {}) },
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
            <Body data={data} side={side} gender={gender} border="#c9c7c0" defaultFill={SILHOUETTE} onBodyPartPress={onPress} />
            <figcaption className="mt-1 text-center text-xs text-muted">{side === 'front' ? '正面' : '背面'}</figcaption>
          </figure>
        ))}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm">
        {info ? info.description : <span className="text-muted">點選身體部位查看該肌群的數字</span>}
      </p>
    </div>
  )
}
