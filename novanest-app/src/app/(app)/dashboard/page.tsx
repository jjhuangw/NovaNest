import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

export const instant = false

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold text-white">歡迎回來，<span className="text-orange-400">{session.username}</span></h1>
        <p className="text-zinc-400 mt-1 text-sm">繼續你的健身旅程</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-lg">💪</span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-300">今日訓練</h2>
          </div>
          <p className="text-zinc-500 text-sm">尚未設定訓練計劃</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
              <span className="text-green-400 text-lg">🥗</span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-300">今日營養</h2>
          </div>
          <p className="text-zinc-500 text-sm">尚未記錄飲食</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-blue-400 text-lg">📸</span>
            </div>
            <h2 className="text-sm font-semibold text-zinc-300">體態紀錄</h2>
          </div>
          <p className="text-zinc-500 text-sm">尚未上傳照片</p>
        </div>
      </div>
    </div>
  )
}
