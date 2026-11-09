'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'
import type { MuscleStatus } from '@/lib/training/muscles'
import type { Muscle } from '@/lib/training/plan'
import type { Gender } from '@/lib/user/profile'
import { useI18n } from '@/lib/i18n/client'
import { useIsDark } from '@/lib/use-is-dark'
import type { MuscleFill } from './body-figures'

// 風格化的 3D 人形：用低面數的球體、膠囊組成，每個肌群是獨立的部件，依本週狀態上色。
// 只能左右旋轉（拖曳或按鈕），上下滑動仍會捲動頁面。

type Vec3 = [number, number, number]

interface Part {
  // 肌群；沒有的是身體的中性部位（頭、手、關節…）
  muscle?: Muscle
  shape: 'sphere' | 'capsule'
  position: Vec3
  // sphere：三軸半徑；capsule：[半徑, 長度, 半徑]
  scale: Vec3
  // capsule 的傾斜（繞 z 軸，弧度）
  tilt?: number
}

// 男女體型差異：肩寬、腰、臀
function bodyParts(gender: Gender): Part[] {
  const f = gender === 'female'
  const shoulder = f ? 0.2 : 0.235
  const hip = f ? 0.115 : 0.1
  const chestZ = f ? 0.115 : 0.105
  const parts: Part[] = [
    // 中性：頭、頸、軀幹、骨盆
    { shape: 'sphere', position: [0, 1.74, 0], scale: [0.095, 0.115, 0.1] },
    { shape: 'capsule', position: [0, 1.61, -0.01], scale: [0.05, 0.06, 0.05] },
    { shape: 'sphere', position: [0, 1.32, 0], scale: [f ? 0.15 : 0.17, 0.3, 0.12] },
    { shape: 'sphere', position: [0, 0.98, 0], scale: [f ? 0.17 : 0.15, 0.11, 0.11] },
    // 胸
    ...[-1, 1].map((s): Part => ({ muscle: 'chest', shape: 'sphere', position: [s * 0.07, 1.39, chestZ - 0.01], scale: [0.08, 0.06, 0.035] })),
    // 腹部與側腹
    { muscle: 'core', shape: 'sphere', position: [0, 1.2, 0.105], scale: [0.085, 0.14, 0.035] },
    ...[-1, 1].map((s): Part => ({ muscle: 'core', shape: 'sphere', position: [s * 0.125, 1.18, 0.06], scale: [0.04, 0.11, 0.06] })),
    // 背：斜方、闊背、下背
    { muscle: 'back', shape: 'sphere', position: [0, 1.53, -0.07], scale: [0.14, 0.07, 0.06] },
    ...[-1, 1].map((s): Part => ({ muscle: 'back', shape: 'sphere', position: [s * 0.085, 1.33, -0.1], scale: [0.11, 0.16, 0.045] })),
    { muscle: 'back', shape: 'sphere', position: [0, 1.12, -0.1], scale: [0.08, 0.07, 0.035] },
  ]

  for (const s of [-1, 1]) {
    const x = s * shoulder
    parts.push(
      // 肩（三角肌）
      { muscle: 'shoulders', shape: 'sphere', position: [x, 1.5, 0], scale: [0.068, 0.072, 0.07] },
      // 上臂：中性骨架＋前側二頭、後側三頭（各段互相重疊，關節才不會斷開）
      { shape: 'capsule', position: [x + s * 0.012, 1.3, 0], scale: [0.042, 0.32, 0.042], tilt: s * 0.06 },
      { muscle: 'biceps', shape: 'sphere', position: [x + s * 0.014, 1.32, 0.03], scale: [0.04, 0.09, 0.032] },
      { muscle: 'triceps', shape: 'sphere', position: [x + s * 0.014, 1.33, -0.032], scale: [0.042, 0.095, 0.032] },
      // 手肘、前臂、手
      { shape: 'sphere', position: [x + s * 0.022, 1.15, 0.005], scale: [0.038, 0.038, 0.038] },
      { shape: 'capsule', position: [x + s * 0.032, 1.01, 0.012], scale: [0.034, 0.3, 0.034], tilt: s * 0.07 },
      { shape: 'sphere', position: [x + s * 0.042, 0.84, 0.016], scale: [0.032, 0.055, 0.022] },
      // 臀
      { muscle: 'posterior', shape: 'sphere', position: [s * 0.08, 0.95, -0.085], scale: [0.09, 0.085, 0.06] },
      // 大腿：中性骨架＋股四頭（前）、內收（內側）、腿後側
      { shape: 'capsule', position: [s * hip, 0.7, 0], scale: [0.066, 0.42, 0.066] },
      { muscle: 'quads', shape: 'sphere', position: [s * hip, 0.73, 0.04], scale: [0.065, 0.16, 0.042] },
      { muscle: 'quads', shape: 'sphere', position: [s * (hip - 0.045), 0.78, 0.005], scale: [0.03, 0.11, 0.04] },
      { muscle: 'posterior', shape: 'sphere', position: [s * hip, 0.72, -0.04], scale: [0.06, 0.15, 0.04] },
      // 膝、小腿、腳踝、腳
      { shape: 'sphere', position: [s * hip, 0.5, 0.012], scale: [0.05, 0.05, 0.05] },
      { shape: 'capsule', position: [s * hip, 0.29, 0], scale: [0.043, 0.42, 0.043] },
      { muscle: 'calves', shape: 'sphere', position: [s * hip, 0.35, -0.035], scale: [0.046, 0.11, 0.042] },
      { shape: 'sphere', position: [s * hip, 0.08, 0.005], scale: [0.034, 0.034, 0.034] },
      { shape: 'sphere', position: [s * hip, 0.045, 0.045], scale: [0.045, 0.03, 0.09] },
    )
  }
  return parts
}

// 與 2D 圖相同的配色規則：狀態色＋依主題調整的中性灰
const STATUS_COLORS: Record<Exclude<MuscleStatus, 'upcoming'>, string> = { good: '#0ca30c', warning: '#fab219', critical: '#d03b3b' }
const NEUTRAL = {
  light: { body: '#d9d7d0', unplanned: '#c1bfb7', upcoming: '#a6a499' },
  dark: { body: '#5c5c56', unplanned: '#78776f', upcoming: '#9e9d93' },
}

const STEP = Math.PI / 4

function Figure({
  gender,
  fills,
  selected,
  angle,
  dark,
  onSelect,
  dragging,
}: {
  gender: Gender
  fills: MuscleFill[]
  selected: Muscle | null
  angle: number
  dark: boolean
  onSelect: (m: Muscle | null) => void
  dragging: React.RefObject<boolean>
}) {
  const group = useRef<Group>(null)
  const invalidate = useThree((s) => s.invalidate)
  const parts = useMemo(() => bodyParts(gender), [gender])
  const status = new Map(fills.map((f) => [f.muscle, f.status]))
  const c = NEUTRAL[dark ? 'dark' : 'light']

  // 平滑轉到目標角度；轉到之後停止重繪
  useFrame(() => {
    const g = group.current
    if (!g) return
    const diff = angle - g.rotation.y
    if (Math.abs(diff) < 0.001) {
      g.rotation.y = angle
      return
    }
    g.rotation.y += diff * 0.2
    invalidate()
  })
  useEffect(() => invalidate(), [angle, selected, dark, fills, invalidate])

  const colorOf = (m?: Muscle) => {
    if (!m) return c.body
    const s = status.get(m)
    if (s === undefined || s === null) return c.unplanned
    return s === 'upcoming' ? c.upcoming : STATUS_COLORS[s]
  }

  return (
    <group ref={group} position={[0, -0.92, 0]}>
      {parts.map((p, i) => {
        const isSelected = p.muscle !== undefined && p.muscle === selected
        return (
          <mesh
            key={i}
            position={p.position}
            rotation={[0, 0, p.tilt ?? 0]}
            scale={p.shape === 'sphere' ? p.scale : [1, 1, 1]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation()
              if (dragging.current) return
              onSelect(p.muscle && p.muscle !== selected ? p.muscle : null)
            }}
            onPointerOver={(e: ThreeEvent<PointerEvent>) => {
              if (p.muscle) {
                e.stopPropagation()
                document.body.style.cursor = 'pointer'
              }
            }}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            {p.shape === 'sphere' ? (
              <sphereGeometry args={[1, 18, 14]} />
            ) : (
              <capsuleGeometry args={[p.scale[0], Math.max(0.01, p.scale[1] - p.scale[0] * 2), 6, 12]} />
            )}
            <meshStandardMaterial
              color={colorOf(p.muscle)}
              flatShading
              roughness={0.75}
              metalness={0}
              emissive={isSelected ? (dark ? '#ffffff' : '#000000') : '#000000'}
              emissiveIntensity={isSelected ? (dark ? 0.25 : 0.5) : 0}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default function Body3D({ gender, fills }: { gender: Gender; fills: MuscleFill[] }) {
  const { t } = useI18n()
  const m = t.muscleMap
  const dark = useIsDark()
  const [angle, setAngle] = useState(0)
  const [selected, setSelected] = useState<Muscle | null>(null)
  const drag = useRef<{ x: number; start: number } | null>(null)
  const dragging = useRef(false)
  const info = fills.find((f) => f.muscle === selected)

  useEffect(() => () => void (document.body.style.cursor = ''), [])

  // 只處理水平拖曳；垂直方向交給瀏覽器捲動（touch-action: pan-y）
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = { x: e.clientX, start: angle }
    dragging.current = false
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x
    if (Math.abs(dx) > 4) dragging.current = true
    if (dragging.current) setAngle(drag.current.start + dx * 0.012)
  }
  function onPointerUp() {
    drag.current = null
    // 讓緊接著的 click 知道剛剛是拖曳，之後再重設
    setTimeout(() => (dragging.current = false), 0)
  }

  const facing = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  const showingBack = facing > Math.PI / 2 && facing < (3 * Math.PI) / 2
  const button = 'min-h-10 border border-line px-3 text-sm font-semibold hover:border-foreground'

  return (
    <div className="mt-6">
      <div
        className="mx-auto aspect-[3/4] w-full max-w-[320px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ position: [0, 0.05, 3], fov: 34 }}
          aria-label={m.model3dLabel}
          role="img"
          onPointerMissed={() => !dragging.current && setSelected(null)}
        >
          <ambientLight intensity={dark ? 0.85 : 1.1} />
          <directionalLight position={[1.5, 2.5, 3]} intensity={dark ? 1.5 : 1.6} />
          <directionalLight position={[-2, 1, -3]} intensity={0.6} />
          <Figure gender={gender} fills={fills} selected={selected} angle={angle} dark={dark} onSelect={setSelected} dragging={dragging} />
        </Canvas>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2" role="group" aria-label={m.rotateLabel}>
        <button type="button" onClick={() => setAngle((a) => a - STEP)} className={button} aria-label={m.rotateLeft} title={m.rotateLeft}>
          <RotateIcon />
        </button>
        <button type="button" aria-pressed={!showingBack} onClick={() => setAngle((a) => Math.round(a / (2 * Math.PI)) * 2 * Math.PI)} className={button}>
          {m.front}
        </button>
        <button type="button" aria-pressed={showingBack} onClick={() => setAngle((a) => Math.round((a - Math.PI) / (2 * Math.PI)) * 2 * Math.PI + Math.PI)} className={button}>
          {m.back}
        </button>
        <button type="button" onClick={() => setAngle((a) => a + STEP)} className={button} aria-label={m.rotateRight} title={m.rotateRight}>
          <RotateIcon flip />
        </button>
      </div>

      <p aria-live="polite" className="mt-3 min-h-5 text-center text-sm">
        {info ? info.description : <span className="text-muted">{m.tapHint3d}</span>}
      </p>
    </div>
  )
}

function RotateIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`h-4 w-4 ${flip ? '-scale-x-100' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}
