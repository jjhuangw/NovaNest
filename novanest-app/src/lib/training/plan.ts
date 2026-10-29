// 訓練課表的資料模型。目前以 mockPlan 提供資料，之後再改成從資料庫讀取。

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]

export const MUSCLES = ['chest', 'shoulders', 'back', 'biceps', 'triceps', 'core', 'quads', 'posterior', 'calves'] as const
export type Muscle = (typeof MUSCLES)[number]

export interface Exercise {
  name: string
  sets: number
  reps: string
  perSide?: boolean
  // 組間休息秒數：複合動作 90–150 秒、孤立動作 45–75 秒
  restSeconds: number
  // 每組對各肌群的計數：主要肌群 1、次要肌群 0.5
  muscles: Partial<Record<Muscle, number>>
}

export interface TrainingDay {
  day: DayKey
  title: string
  // 空陣列代表休息日
  exercises: Exercise[]
  notes: string[]
}

export interface Guideline {
  title: string
  items: string[]
}

// 課表對應的飲食策略，每日營養目標由此計算（見 lib/nutrition/targets.ts）
export interface NutritionStrategy {
  // 相對維持熱量的增減（kcal）：增肌為正、減脂為負
  calorieAdjustment: number
  proteinPerKg: number
  fatPerKg: number
}

export interface TrainingPlan {
  title: string
  goal: string
  currentWeightKg: number
  targetWeightKg: number
  daysPerWeek: number
  sessionLength: string
  nutrition: NutritionStrategy
  days: TrainingDay[]
  guidelines: Guideline[]
  weeklyTracking: string[]
}

export function isDayKey(value: unknown): value is DayKey {
  return typeof value === 'string' && (DAY_KEYS as readonly string[]).includes(value)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const mockPlan: TrainingPlan = {
  title: '增肌訓練課表',
  goal: '增加肌肉量、改善 V 型身材與手臂線條',
  currentWeightKg: 70,
  targetWeightKg: 73,
  daysPerWeek: 5,
  sessionLength: '平日約 30 分鐘',
  // 對應「增肌飲食」原則：熱量多 200–300 kcal、70 kg 時蛋白質約 120–140 g
  nutrition: { calorieAdjustment: 250, proteinPerKg: 1.8, fatPerKg: 0.9 },
  days: [
    {
      day: 'mon',
      title: '胸＋側肩＋三頭',
      exercises: [
        { name: '上斜啞鈴臥推', sets: 4, reps: '6–10', restSeconds: 120, muscles: { chest: 1, shoulders: 0.5, triceps: 0.5 } },
        { name: '胸推機', sets: 3, reps: '8–12', restSeconds: 120, muscles: { chest: 1, shoulders: 0.5, triceps: 0.5 } },
        { name: '啞鈴側平舉', sets: 3, reps: '12–20', restSeconds: 60, muscles: { shoulders: 1 } },
        { name: '低位至高位滑輪夾胸', sets: 2, reps: '12–15', restSeconds: 60, muscles: { chest: 1 } },
        { name: '三頭繩索下壓', sets: 2, reps: '10–15', restSeconds: 60, muscles: { triceps: 1 } },
      ],
      notes: [
        '上斜椅角度約 20–30 度。',
        '優先確保上斜臥推的動作品質與漸進超負荷。',
        '時間不足時，優先完成前三個動作。',
      ],
    },
    {
      day: 'tue',
      title: '背＋後肩＋二頭',
      exercises: [
        { name: '高位下拉', sets: 4, reps: '8–12', restSeconds: 120, muscles: { back: 1, biceps: 0.5 } },
        { name: '坐姿划船', sets: 3, reps: '8–12', restSeconds: 120, muscles: { back: 1, biceps: 0.5 } },
        { name: '單手啞鈴划船', sets: 2, reps: '10–12', perSide: true, restSeconds: 90, muscles: { back: 1, biceps: 0.5 } },
        { name: '胸靠反向飛鳥', sets: 3, reps: '12–15', restSeconds: 60, muscles: { shoulders: 1, back: 0.5 } },
        { name: '啞鈴彎舉', sets: 3, reps: '10–12', restSeconds: 60, muscles: { biceps: 1 } },
      ],
      notes: [
        '下拉時手肘往身體兩側及下方移動。',
        '划船避免過度聳肩或用身體甩動。',
        '反向飛鳥使用可控制的重量。',
      ],
    },
    {
      day: 'wed',
      title: '肩膀重點',
      exercises: [
        { name: '啞鈴肩推', sets: 3, reps: '8–10', restSeconds: 120, muscles: { shoulders: 1, triceps: 0.5 } },
        { name: '啞鈴側平舉', sets: 4, reps: '12–20', restSeconds: 60, muscles: { shoulders: 1 } },
        { name: '反向飛鳥', sets: 3, reps: '12–15', restSeconds: 60, muscles: { shoulders: 1, back: 0.5 } },
        { name: '上斜胸推機', sets: 3, reps: '8–12', restSeconds: 120, muscles: { chest: 1, shoulders: 0.5, triceps: 0.5 } },
        { name: '繩索面拉', sets: 2, reps: '12–15', restSeconds: 60, muscles: { shoulders: 1, back: 0.5 } },
      ],
      notes: [
        '側平舉是肩膀視覺寬度的重點。',
        '側平舉不要用慣性甩起重量。',
        '時間不足時，優先完成肩推、側平舉、上斜胸推。',
      ],
    },
    {
      day: 'thu',
      title: '胸背＋手臂',
      exercises: [
        { name: '上斜胸推', sets: 3, reps: '8–12', restSeconds: 120, muscles: { chest: 1, shoulders: 0.5, triceps: 0.5 } },
        { name: '高位下拉', sets: 3, reps: '8–12', restSeconds: 120, muscles: { back: 1, biceps: 0.5 } },
        { name: '胸推機', sets: 2, reps: '10–12', restSeconds: 120, muscles: { chest: 1, shoulders: 0.5, triceps: 0.5 } },
        { name: '坐姿划船', sets: 2, reps: '10–12', restSeconds: 120, muscles: { back: 1, biceps: 0.5 } },
        { name: '二頭彎舉', sets: 2, reps: '10–15', restSeconds: 60, muscles: { biceps: 1 } },
        { name: '三頭繩索下壓', sets: 2, reps: '10–15', restSeconds: 60, muscles: { triceps: 1 } },
      ],
      notes: [
        '胸與背交替進行，可節省時間。',
        '二頭、三頭保持穩定進步。',
        '若時間不夠，手臂動作可各做 2 組，不必趕動作。',
      ],
    },
    {
      day: 'fri',
      title: '休息日',
      exercises: [],
      notes: ['不安排正式重量訓練。', '可散步或進行輕度活動。', '確保睡眠與飲食充足。'],
    },
    {
      day: 'sat',
      title: '腿部＋核心',
      exercises: [
        { name: '深蹲或 Smith 深蹲', sets: 3, reps: '6–10', restSeconds: 150, muscles: { quads: 1, posterior: 0.5, core: 0.5 } },
        { name: '羅馬尼亞硬舉', sets: 3, reps: '8–10', restSeconds: 150, muscles: { posterior: 1, back: 0.5 } },
        { name: '腿推機', sets: 3, reps: '10–12', restSeconds: 120, muscles: { quads: 1, posterior: 0.5 } },
        { name: '腿彎舉', sets: 3, reps: '10–15', restSeconds: 60, muscles: { posterior: 1 } },
        { name: '腿伸展', sets: 2, reps: '12–15', restSeconds: 60, muscles: { quads: 1 } },
        { name: '小腿提踵', sets: 3, reps: '12–20', restSeconds: 60, muscles: { calves: 1 } },
        { name: '腹部訓練', sets: 3, reps: '12–15', restSeconds: 60, muscles: { core: 1 } },
      ],
      notes: [
        '深蹲與羅馬尼亞硬舉優先維持標準姿勢。',
        '深蹲、硬舉不要在無保護的情況下勉強做到力竭。',
        '如果膝蓋仍有不適，先調整活動範圍及重量，不要硬撐。',
      ],
    },
    {
      day: 'sun',
      title: '休息日',
      exercises: [],
      notes: ['休息、散步、伸展。', '為下週訓練恢復體力。'],
    },
  ],
  guidelines: [
    {
      title: '休息時間',
      items: [
        '複合動作：90–150 秒，必要時更久。',
        '孤立動作：45–75 秒。',
        '若休息太短導致重量或次數明顯下降，延長休息。',
      ],
    },
    {
      title: '訓練強度',
      items: [
        '大部分工作組保留 1–3 下餘力（RIR 1–3）。',
        '不需要每一組都做到力竭。',
        '獨自訓練時，深蹲及臥推應優先確保安全。',
      ],
    },
    {
      title: '漸進超負荷',
      items: [
        '例如上斜啞鈴臥推安排 4 組 × 6–10 下：當所有工作組都能以標準動作完成 10 下，且仍保留約 1–2 下餘力，下次訓練再小幅增加重量。',
        '加重後若次數下降，回到 6–8 下逐步進步即可。',
        '記錄每個動作的重量、次數與組數。',
      ],
    },
    {
      title: '增肌飲食',
      items: [
        '蛋白質：每天約 120–140 g。',
        '熱量：先比目前維持熱量多約 200–300 kcal。',
        '體重目標：每週平均增加約 0.1–0.25 kg。',
        '每週固定早上起床、上完廁所後量體重。',
        '同時觀察腰圍與訓練表現，避免體重增加太快。',
      ],
    },
  ],
  weeklyTracking: [
    '日期',
    '早晨體重',
    '腰圍',
    '睡眠狀況',
    '上斜啞鈴臥推：重量／次數',
    '高位下拉：重量／次數',
    '啞鈴側平舉：重量／次數',
    '深蹲或 Smith 深蹲：重量／次數',
  ],
}
