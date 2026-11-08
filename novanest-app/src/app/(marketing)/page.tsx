import { getI18n } from '@/lib/i18n/server'
import Landing from './landing'

// 首頁：未登入的訪客看到產品介紹；已登入者由 middleware 導向 /dashboard
export default async function HomePage() {
  const { t } = await getI18n()
  return <Landing t={t} />
}
