'use client'

import { useId, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/client'
import type { SwapOption } from '@/lib/training/exercise-swap'
import type { DayKey } from '@/lib/training/plan'
import { replaceExerciseAction } from './actions'
import { suggestSwapAction } from './log/actions'

// 記住上次輸入的器材，下次（或其他動作）直接帶入。只是方便用，讀寫失敗就當作沒有
const EQUIPMENT_KEY = 'novanest.equipment'

type Props = {
  day: DayKey
  exerciseIndex: number
  // 課表上的原始名稱（換動作時用來確認畫面上的課表是最新的）
  exerciseName: string
  // 顯示用的名稱（依語系翻譯）
  exerciseLabel: string
  planSubstitute?: string
} & (
  // 紀錄頁：只換這一天，名稱以 swap-{動作索引} 隨整份紀錄送出，課表不變
  | { mode: 'log'; defaultValue: string }
  // 課表頁：之後每週都換（存成新版本的課表）；canEdit 為 false 代表還在用範例課表
  | { mode: 'plan'; canEdit: boolean }
)

// 「換動作」：直接輸入動作，或輸入手邊的器材請 AI 建議（之前查過的直接使用，見 lib/training/exercise-swap.ts）
export default function SwapField(props: Props) {
  const { day, exerciseIndex, exerciseName, exerciseLabel, planSubstitute } = props
  const { t: messages } = useI18n()
  const t = messages.log
  const tp = messages.training
  const router = useRouter()
  const id = useId()
  const isLog = props.mode === 'log'
  const defaultValue = isLog ? props.defaultValue : ''
  const [open, setOpen] = useState(defaultValue !== '')
  const [value, setValue] = useState(defaultValue)
  const [equipment, setEquipment] = useState('')
  const [equipmentLoaded, setEquipmentLoaded] = useState(false)
  const [options, setOptions] = useState<SwapOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startSuggest] = useTransition()
  const [applying, startApply] = useTransition()

  function toggle(next: boolean) {
    setOpen(next)
    if (!next || equipmentLoaded) return
    setEquipmentLoaded(true)
    try {
      setEquipment(localStorage.getItem(EQUIPMENT_KEY) ?? '')
    } catch {
      // 無痕模式或封鎖網站資料時讀不到，維持空白
    }
  }

  function suggest() {
    if (pending) return
    setError(null)
    try {
      localStorage.setItem(EQUIPMENT_KEY, equipment.trim())
    } catch {
      // 同上，記不住就算了
    }
    startSuggest(async () => {
      try {
        const result = await suggestSwapAction({ day, exerciseIndex, equipment })
        if (!result.ok) {
          setError(result.error)
          setOptions(null)
        } else setOptions(result.options)
      } catch {
        setError(t.swapErrors.failed)
      }
    })
  }

  function apply() {
    if (applying) return
    setError(null)
    startApply(async () => {
      try {
        const result = await replaceExerciseAction({ day, exerciseIndex, from: exerciseName, name: value })
        if (!result.ok) {
          setError(result.error)
          return
        }
        setOpen(false)
        setValue('')
        setOptions(null)
        router.refresh()
      } catch {
        setError(tp.swapErrors.failed)
      }
    })
  }

  // 換了要改做的動作，之前的錯誤訊息就不再適用
  function choose(next: string) {
    setValue(next)
    setError(null)
  }

  const current = value.trim()

  // 範例課表不能修改：只說明要先產生自己的課表
  if (props.mode === 'plan' && !props.canEdit) {
    return (
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-muted">{tp.swap}</summary>
        <p className="mt-2 text-xs text-muted">
          {tp.swapNeedsPlan}{' '}
          <Link href="/training/setup" className="font-semibold text-foreground underline-offset-4 hover:underline">
            {tp.swapSetupLink}
          </Link>
        </p>
      </details>
    )
  }

  return (
    <details className="mt-2" open={open} onToggle={(e) => toggle(e.currentTarget.open)}>
      <summary className="cursor-pointer text-xs font-semibold text-muted">
        {isLog ? t.swap : tp.swap}
        {isLog && current && <span className="ml-2 font-normal text-foreground">{t.swapped(current)}</span>}
      </summary>
      <div className="mt-3 space-y-3 border-l-2 border-line pl-3">
        <p className="text-xs text-muted">{isLog ? t.swapHint : tp.swapHint}</p>

        <div>
          <label htmlFor={`${id}-equipment`} className="text-xs font-semibold">
            {t.equipment}
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`${id}-equipment`}
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              onKeyDown={(e) => {
                // 在這裡按 Enter 是要查詢，不是送出整份紀錄
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  suggest()
                }
              }}
              maxLength={300}
              placeholder={t.equipmentPlaceholder}
              className="min-w-0 flex-1 border border-line bg-surface px-3 py-2 text-sm placeholder-muted/60 focus:border-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={suggest}
              disabled={pending}
              className="shrink-0 border border-foreground px-3 text-xs font-semibold hover:bg-foreground hover:text-background disabled:opacity-40"
            >
              {pending ? t.suggestingSwap : t.suggestSwap}
            </button>
          </div>
        </div>

        {options && options.length > 0 && (
          <div>
            <p className="text-xs font-semibold">{t.swapOptions}</p>
            <ul className="mt-1 space-y-1.5">
              {options.map((o) => (
                <li key={o.name}>
                  <button
                    type="button"
                    onClick={() => choose(o.name)}
                    aria-pressed={current === o.name}
                    aria-label={t.useSwap(o.name)}
                    className={`w-full border px-3 py-2 text-left text-sm ${current === o.name ? 'border-foreground bg-foreground text-background' : 'border-line hover:border-foreground'}`}
                  >
                    <span className="font-semibold">{o.name}</span>
                    <span className={`mt-0.5 block text-xs ${current === o.name ? 'opacity-80' : 'text-muted'}`}>{o.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {planSubstitute && current !== planSubstitute && (
          <button type="button" onClick={() => choose(planSubstitute)} className="text-xs font-semibold underline-offset-4 hover:underline">
            {t.swapSuggestion(planSubstitute)}
          </button>
        )}

        <label className="block">
          <span className="text-xs font-semibold">{isLog ? t.swapLabel(exerciseLabel) : tp.swapLabel(exerciseLabel)}</span>
          <input
            name={isLog ? `swap-${exerciseIndex}` : undefined}
            value={value}
            onChange={(e) => choose(e.target.value)}
            onKeyDown={(e) => {
              if (!isLog && e.key === 'Enter' && !e.nativeEvent.isComposing) {
                e.preventDefault()
                apply()
              }
            }}
            maxLength={isLog ? 120 : 80}
            placeholder={t.swapPlaceholder}
            className="mt-1 w-full border border-line bg-surface px-3 py-2 text-sm placeholder-muted/60 focus:border-foreground focus:outline-none"
          />
        </label>

        {!isLog && (
          <button
            type="button"
            onClick={apply}
            disabled={applying || !current}
            className="border border-foreground bg-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wider text-background hover:opacity-85 disabled:opacity-40"
          >
            {applying ? tp.swapApplying : tp.swapApply}
          </button>
        )}

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-xs text-accent">{error}</p>}
      </div>
    </details>
  )
}
