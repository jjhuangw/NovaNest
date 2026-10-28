// 課表的顯示文字。mockPlan 的中文動作名稱同時是資料庫中 set_logs.exercise_name 的鍵值，
// 所以計算一律使用 mockPlan，只在顯示時透過這裡換成目前語系的文字。
import type { Locale } from '@/lib/i18n/config'
import { mockPlan, type DayKey, type Guideline } from './plan'

interface PlanText {
  title: string
  goal: string
  sessionLength: string
  days: Record<DayKey, { title: string; notes: string[] }>
  guidelines: Guideline[]
  weeklyTracking: string[]
  exercises: Record<string, string>
}

const en: PlanText = {
  title: 'Muscle-building plan',
  goal: 'Build muscle and improve your V-taper and arm definition',
  sessionLength: 'About 30 min on weekdays',
  days: {
    mon: {
      title: 'Chest + side delts + triceps',
      notes: [
        'Set the incline bench to about 20–30 degrees.',
        'Prioritize form and progressive overload on the incline press.',
        'Short on time? Finish the first three exercises first.',
      ],
    },
    tue: {
      title: 'Back + rear delts + biceps',
      notes: [
        'On pulldowns, drive your elbows down and toward your sides.',
        "On rows, don't shrug or swing your body.",
        'Use a weight you can control on reverse flyes.',
      ],
    },
    wed: {
      title: 'Shoulder focus',
      notes: [
        'Lateral raises are key to visual shoulder width.',
        "Don't swing the weight up on lateral raises.",
        'Short on time? Prioritize the shoulder press, lateral raises and incline press.',
      ],
    },
    thu: {
      title: 'Chest & back + arms',
      notes: [
        'Alternate chest and back to save time.',
        'Keep biceps and triceps progressing steadily.',
        "If time is tight, do 2 sets of each arm exercise. Don't rush the reps.",
      ],
    },
    fri: {
      title: 'Rest day',
      notes: ['No formal weight training.', 'Go for a walk or do light activity.', 'Get enough sleep and food.'],
    },
    sat: {
      title: 'Legs + core',
      notes: [
        'Keep strict form on squats and Romanian deadlifts.',
        "Don't grind squats or deadlifts to failure without a spotter.",
        "If your knees still feel off, adjust range of motion and weight first. Don't push through pain.",
      ],
    },
    sun: {
      title: 'Rest day',
      notes: ['Rest, walk and stretch.', 'Recover for next week.'],
    },
  },
  guidelines: [
    {
      title: 'Rest periods',
      items: [
        'Compound lifts: 90–150 seconds, longer if needed.',
        'Isolation exercises: 45–75 seconds.',
        'If short rests make your weight or reps drop noticeably, rest longer.',
      ],
    },
    {
      title: 'Intensity',
      items: [
        'Leave 1–3 reps in reserve on most working sets (RIR 1–3).',
        "You don't need to take every set to failure.",
        'When training alone, put safety first on squats and bench presses.',
      ],
    },
    {
      title: 'Progressive overload',
      items: [
        'For example, incline dumbbell press is 4 sets × 6–10 reps: once every working set reaches 10 clean reps with about 1–2 reps in reserve, add a little weight next session.',
        'If reps drop after adding weight, work back up from 6–8 reps.',
        'Record the weight, reps and sets of every exercise.',
      ],
    },
    {
      title: 'Nutrition for muscle gain',
      items: [
        'Protein: about 120–140 g per day.',
        'Calories: start about 200–300 kcal above maintenance.',
        'Weight goal: gain about 0.1–0.25 kg per week on average.',
        'Weigh yourself at the same time each week, in the morning after using the bathroom.',
        'Also watch your waist and training performance so you don’t gain weight too fast.',
      ],
    },
  ],
  weeklyTracking: [
    'Date',
    'Morning weight',
    'Waist',
    'Sleep',
    'Incline dumbbell press: weight / reps',
    'Lat pulldown: weight / reps',
    'Dumbbell lateral raise: weight / reps',
    'Squat or Smith squat: weight / reps',
  ],
  exercises: {
    上斜啞鈴臥推: 'Incline dumbbell press',
    胸推機: 'Chest press machine',
    啞鈴側平舉: 'Dumbbell lateral raise',
    低位至高位滑輪夾胸: 'Low-to-high cable fly',
    三頭繩索下壓: 'Triceps rope pushdown',
    高位下拉: 'Lat pulldown',
    坐姿划船: 'Seated row',
    單手啞鈴划船: 'One-arm dumbbell row',
    胸靠反向飛鳥: 'Chest-supported reverse fly',
    啞鈴彎舉: 'Dumbbell curl',
    啞鈴肩推: 'Dumbbell shoulder press',
    反向飛鳥: 'Reverse fly',
    上斜胸推機: 'Incline chest press machine',
    繩索面拉: 'Cable face pull',
    上斜胸推: 'Incline chest press',
    二頭彎舉: 'Biceps curl',
    '深蹲或 Smith 深蹲': 'Squat or Smith squat',
    羅馬尼亞硬舉: 'Romanian deadlift',
    腿推機: 'Leg press',
    腿彎舉: 'Leg curl',
    腿伸展: 'Leg extension',
    小腿提踵: 'Calf raise',
    腹部訓練: 'Ab training',
  },
}

const zhTW: PlanText = {
  title: mockPlan.title,
  goal: mockPlan.goal,
  sessionLength: mockPlan.sessionLength,
  days: Object.fromEntries(mockPlan.days.map((d) => [d.day, { title: d.title, notes: d.notes }])) as PlanText['days'],
  guidelines: mockPlan.guidelines,
  weeklyTracking: mockPlan.weeklyTracking,
  exercises: {},
}

export function planText(locale: Locale) {
  const text = locale === 'en' ? en : zhTW
  return {
    ...text,
    day: (key: DayKey) => text.days[key],
    exercise: (name: string) => text.exercises[name] ?? name,
  }
}
