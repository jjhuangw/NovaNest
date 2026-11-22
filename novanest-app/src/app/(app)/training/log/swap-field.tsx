'use client'

import { useId, useState, useTransition } from 'react'
import { useI18n } from '@/lib/i18n/client'
import type { SwapOption } from '@/lib/training/exercise-swap'
import { suggestSwapAction } from './actions'

// 記住上次輸入的器材，下次（或其他動作）直接帶入。只是方便用，讀寫失敗就當作沒有
const EQUIPMENT_KEY = 'novanest.equipment'

// 「換動作」：當天器材被占用或做不了時，輸入實際做的動作（swap-{動作索引}），
// 或輸入手邊的器材請 AI 建議（之前查過的直接使用）。只影響這一天的紀錄，課表不變。
export default function SwapField({
  date,
  exerciseIndex,
  exerciseLabel,
  planSubstitute,
  defaultValue,
}: {
  date: string
  exerciseIndex: number
  exerciseLabel: string
  planSubstitute?: string
  defaultValue: string
}) {
  const { t: messages } = useI18n()
  const t = messages.log
  const id = useId()
  const [value, setValue] = useState(defaultValue)
  const [equipment, setEquipment] = useState('')
  const [equipmentLoaded, setEquipmentLoaded] = useState(false)
  const [options, setOptions] = useState<SwapOption[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startSuggest] = useTransition()

  function loadEquipment() {
    if (equipmentLoaded) return
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
        const result = await suggestSwapAction({ date, exerciseIndex, equipment })
        if (!result.ok) {
          setError(result.error)
          setOptions(null)
        } else setOptions(result.options)
      } catch {
        setError(t.swapErrors.failed)
      }
    })
  }

  const current = value.trim()
  return (
    <details className="mt-2" open={defaultValue !== ''} onToggle={(e) => e.currentTarget.open && loadEquipment()}>
      <summary className="cursor-pointer text-xs font-semibold text-muted">
        {t.swap}
        {current && <span className="ml-2 font-normal text-foreground">{t.swapped(current)}</span>}
      </summary>
      <div className="mt-3 space-y-3 border-l-2 border-line pl-3">
        <p className="text-xs text-muted">{t.swapHint}</p>

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

        {error && <p className="border-l-2 border-accent bg-stone px-3 py-2 text-xs text-accent">{error}</p>}

        {options && options.length > 0 && (
          <div>
            <p className="text-xs font-semibold">{t.swapOptions}</p>
            <ul className="mt-1 space-y-1.5">
              {options.map((o) => (
                <li key={o.name}>
                  <button
                    type="button"
                    onClick={() => setValue(o.name)}
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
          <button type="button" onClick={() => setValue(planSubstitute)} className="text-xs font-semibold underline-offset-4 hover:underline">
            {t.swapSuggestion(planSubstitute)}
          </button>
        )}

        <label className="block">
          <span className="text-xs font-semibold">{t.swapLabel(exerciseLabel)}</span>
          <input
            name={`swap-${exerciseIndex}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={120}
            placeholder={t.swapPlaceholder}
            className="mt-1 w-full border border-line bg-surface px-3 py-2 text-sm placeholder-muted/60 focus:border-foreground focus:outline-none"
          />
        </label>
      </div>
    </details>
  )
}
