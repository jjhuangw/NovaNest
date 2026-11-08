import { z } from 'zod'

// 使用者名稱即畫面上顯示的名字：可用中文與空白，也允許和別人重複（登入與身分辨識都用 Email／id）。
// 註冊與修改共用；錯誤訊息為代碼，由前端依語系顯示。
export const USERNAME_MAX = 30

// 去掉控制字元與零寬字元，連續空白合併成一個
export function normalizeUsername(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim()
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  // 以字元數計算，避免中文或 emoji 被算成多個字
  .refine((s) => s.length > 0 && [...s].length <= USERNAME_MAX, 'invalid_username')
