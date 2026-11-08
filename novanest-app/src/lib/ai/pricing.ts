// 每百萬 token 的美元價格（Anthropic 官方 API 牌價）。只用於後台估算，實際金額以 Anthropic Console 帳單為準。
// 快取寫入以 5 分鐘 TTL 的 1.25 倍輸入價計算。
interface Price {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
}

const PRICES: Record<string, Price> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-sonnet-5': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  'claude-opus-5': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4-8': { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
}

export interface TokenCounts {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

// 不認得的模型回傳 null，畫面上顯示為「—」而不是錯誤的金額
export function estimateCostUsd(model: string, t: TokenCounts): number | null {
  const p = PRICES[model]
  if (!p) return null
  return (
    (t.inputTokens * p.input + t.outputTokens * p.output + t.cacheReadTokens * p.cacheRead + t.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  )
}
