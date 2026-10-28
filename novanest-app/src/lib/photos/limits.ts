// 體態照片的格式與大小限制，瀏覽器與伺服器共用。

// 使用者可選擇的原始檔格式（iPhone 的 HEIC 會在選取時自動轉成 JPEG）
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ACCEPT_ATTR = ACCEPTED_TYPES.join(',')
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024
// 避免解碼超大圖片拖垮手機
export const MAX_ORIGINAL_PIXELS = 50_000_000

// 瀏覽器縮圖後上傳的檔案：一律 JPEG
export const MAX_EDGE = 1600
export const MIN_EDGE = 300
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

export const LIMITS_HINT = 'JPEG、PNG、WebP，15MB 以內，至少 300 × 300 像素'

export function formatMB(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
