import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// 體態照片存放在私有 bucket，只能由伺服器以 service role 存取，
// 再對已登入的本人發出短效簽章網址。
export const PHOTO_BUCKET = 'body-photos'
export const SIGNED_URL_TTL_SECONDS = 60 * 60

let client: SupabaseClient | null = null

export function storage() {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is not set')
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  return client.storage.from(PHOTO_BUCKET)
}
