import { getI18n } from '@/lib/i18n/server'
import Landing from '../landing'

// 與首頁相同的產品介紹，已登入也能看（方便分享與檢視）
export default async function AboutPage() {
  const { t } = await getI18n()
  return <Landing t={t} />
}
