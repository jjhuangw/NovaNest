// 體態示意剪影：依性別、體脂率與肌肉量計算輪廓寬度，只是幫助使用者描述方向的示意，不是精確的體型。
import type { Gender } from '@/lib/user/profile'

type Point = [number, number]

const CENTER = 50

interface Widths {
  neck: number
  shoulder: number
  chest: number
  bust: number
  waist: number
  hip: number
  thigh: number
  knee: number
  calf: number
  ankle: number
  arm: number
  forearm: number
}

// 數字為距離中線的半寬（座標寬 100、高 220，顯示時裁掉兩側空白）
function widthsFor(gender: Gender, bodyFat: number, muscle: number): Widths {
  if (gender === 'female') {
    const fat = bodyFat - 18
    return {
      neck: 4.3,
      shoulder: 15.5 + muscle * 3,
      chest: 12.5 + muscle * 1.2 + Math.max(0, fat) * 0.1,
      bust: 13.2 + muscle * 0.8 + Math.max(0, fat) * 0.18,
      waist: 9.3 + fat * 0.38 - muscle * 0.3,
      hip: 15.2 + fat * 0.27 + muscle * 0.5,
      thigh: 14.4 + fat * 0.25 + muscle * 1.2,
      knee: 8 + fat * 0.08,
      calf: 8 + fat * 0.08 + muscle * 0.8,
      ankle: 4.6,
      arm: 3.6 + muscle * 1.8 + fat * 0.1,
      forearm: 3 + muscle * 1 + fat * 0.04,
    }
  }
  const fat = bodyFat - 10
  return {
    neck: 5.3 + muscle * 1 + fat * 0.04,
    shoulder: 18 + muscle * 6.5 + fat * 0.08,
    chest: 14.8 + muscle * 2.6 + fat * 0.16,
    bust: 14.8 + muscle * 2.2 + fat * 0.2,
    waist: 11.2 + fat * 0.42 - muscle * 0.6,
    hip: 13.2 + fat * 0.26,
    thigh: 12.4 + fat * 0.2 + muscle * 2.2,
    knee: 7.8 + fat * 0.07,
    calf: 8 + fat * 0.07 + muscle * 1.4,
    ankle: 4.8,
    arm: 4.6 + muscle * 3 + fat * 0.11,
    forearm: 3.8 + muscle * 1.5 + fat * 0.04,
  }
}

// 右半邊身體（不含手臂）由上而下，再沿腿內側回到胯下
function torsoRight(w: Widths, gender: Gender): Point[] {
  return [
    [w.neck, 28],
    [w.neck + 0.6, 36],
    [w.shoulder - 6, 40],
    [w.shoulder - 1, 45],
    [w.chest, 60],
    [w.bust, gender === 'female' ? 70 : 72],
    [w.waist, 95],
    [w.hip, 114],
    [w.thigh, 130],
    [w.knee + 0.5, 162],
    [w.calf, 180],
    [w.ankle, 206],
    [w.ankle + 2.5, 214],
    [1.6, 214],
    [1.8, 205],
    [2.4, 180],
    [2.2, 162],
    [1.2, 134],
  ]
}

// 右手臂：外側由肩往下到手，再沿內側回到腋下
function armRight(w: Widths): Point[] {
  const root = w.shoulder - 1.5
  return [
    [root - 2, 43],
    [root + w.arm * 0.7, 52],
    [root + w.arm * 0.75, 72],
    [root + w.forearm * 0.6 + 1.2, 94],
    [root + w.forearm * 0.75 + 1.8, 106],
    [root + 3.2, 126],
    [root + 3.4, 136],
    [root - 0.6, 136],
    [root - 0.6, 126],
    [root - w.forearm * 0.75 + 1.2, 106],
    [root - w.arm * 0.45 + 0.6, 94],
    [root - w.arm * 0.6, 72],
    [w.chest + 0.4, 61],
  ]
}

const mirror = (points: Point[]): Point[] => points.map(([x, y]) => [CENTER - x, y])
const right = (points: Point[]): Point[] => points.map(([x, y]) => [CENTER + x, y])

// Catmull-Rom 轉成三次貝茲曲線，讓輪廓平順
function smoothPath(points: Point[], closed: boolean): string {
  const n = points.length
  const at = (i: number) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))]
  let d = `M${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`
  const last = closed ? n : n - 1
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return closed ? `${d}Z` : d
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export function BodyShapeFigure({
  gender,
  bodyFat,
  muscle,
  className,
}: {
  gender: Gender
  bodyFat: number
  muscle: number
  className?: string
}) {
  const w = widthsFor(gender, bodyFat, muscle)
  const half = torsoRight(w, gender)
  const body = smoothPath([...right(half), ...mirror(half).reverse()], true)
  const arm = armRight(w)
  const arms = [smoothPath(right(arm), true), smoothPath(mirror(arm), true)]

  // 體脂越低、肌肉越多，線條越明顯
  const absThreshold = gender === 'male' ? 17 : 23
  const abs = clamp01((absThreshold - bodyFat) / 7) * (0.5 + muscle * 0.5)
  const muscleLines = clamp01((muscle - 0.3) / 0.5)
  // 體脂高時，下腹與腰側出現皺褶
  const fold = clamp01((bodyFat - (gender === 'male' ? 24 : 32)) / 8)
  const absHalf = Math.min(w.waist - 3, 6)

  return (
    <svg viewBox="12 0 76 220" className={className} aria-hidden>
      <g fill="currentColor">
        {gender === 'female' && <path d="M40.5,20 C39,8 61,8 59.5,20 C61,30 60.5,36 57,38 L43,38 C39.5,36 39,30 40.5,20Z" opacity={0.75} />}
        <ellipse cx={CENTER} cy={17} rx={7.6} ry={9.6} />
        <path d={body} />
      </g>
      {/* 手臂描一圈背景色，體脂高、手臂貼著身體時仍分得出來 */}
      <g fill="currentColor" stroke="var(--background)" strokeWidth={0.8}>
        {arms.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" stroke="var(--background)" strokeLinecap="round" strokeWidth={0.7}>
        {muscleLines > 0 && (
          <g opacity={0.25 + muscleLines * 0.4}>
            {/* 胸大肌下緣 */}
            <path d={`M${CENTER - w.chest + 3},${66} Q${CENTER - 5},${71} ${CENTER - 0.5},${65}`} />
            <path d={`M${CENTER + w.chest - 3},${66} Q${CENTER + 5},${71} ${CENTER + 0.5},${65}`} />
          </g>
        )}
        {abs > 0 && (
          <g opacity={abs * 0.75}>
            <path d={`M${CENTER},${72} L${CENTER},${104}`} />
            {[80, 88, 96].map((y) => (
              <path key={y} d={`M${CENTER - absHalf},${y} Q${CENTER},${y + 1.2} ${CENTER + absHalf},${y}`} />
            ))}
          </g>
        )}
        {fold > 0 && (
          <g opacity={fold * 0.6}>
            <path d={`M${CENTER - w.waist + 3},${104} Q${CENTER},${111} ${CENTER + w.waist - 3},${104}`} />
          </g>
        )}
      </g>
    </svg>
  )
}
