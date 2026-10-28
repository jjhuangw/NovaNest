// 從 JPEG 檔頭讀出寬高（SOF marker），不需要解碼整張圖片。
// 不是完整的 JPEG（缺少開頭 SOI 或結尾 EOI）時回傳 null。
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  const n = bytes.length
  if (n < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  if (bytes[n - 2] !== 0xff || bytes[n - 1] !== 0xd9) return null

  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null
    const marker = bytes[i + 1]
    // 填充位元組
    if (marker === 0xff) {
      i += 1
      continue
    }
    // 沒有長度欄位的 marker
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      i += 2
      continue
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3]
    if (length < 2) return null
    // SOF0–SOF15，排除 DHT(C4)、JPG(C8)、DAC(CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6]
      const width = (bytes[i + 7] << 8) | bytes[i + 8]
      return width > 0 && height > 0 ? { width, height } : null
    }
    i += 2 + length
  }
  return null
}
