// 讀取 Postgres 錯誤（drizzle 會把原始錯誤放在 cause）
export function uniqueViolation(e: unknown): string | null {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } }
  const code = err.code ?? err.cause?.code
  if (code !== '23505') return null
  return err.constraint ?? err.cause?.constraint ?? ''
}
