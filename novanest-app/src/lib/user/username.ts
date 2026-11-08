import { z } from 'zod'

// 註冊與修改使用者名稱共用；錯誤訊息為代碼，由前端依語系顯示
export const USERNAME_MIN = 3
export const USERNAME_MAX = 30
export const usernameSchema = z
  .string()
  .min(USERNAME_MIN, 'invalid_username')
  .max(USERNAME_MAX, 'invalid_username')
  .regex(/^[a-zA-Z0-9_]+$/, 'invalid_username')
