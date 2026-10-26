import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export const instant = false

const tiles = [
  { title: '今日訓練', empty: '尚未設定訓練計劃', image: '/images/training.jpg', alt: '在深蹲架前準備槓鈴的女性' },
  { title: '今日營養', empty: '尚未記錄飲食', image: '/images/nutrition.jpg', alt: '一碗蔬菜沙拉' },
  { title: '體態紀錄', empty: '尚未上傳照片', image: '/images/body.jpg', alt: '伸展手臂的女性', position: 'object-[70%_center]' },
]

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <div>
      <section className="relative h-[60vh] min-h-[360px] w-full">
        <Image src="/images/hero.jpg" alt="在窗邊做仰臥起坐的女性" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
        <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end px-6 pb-12 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]">Welcome back</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-6xl">歡迎回來，{session.username}</h1>
          <p className="mt-3 max-w-md text-base text-white/85">繼續你的健身旅程，今天也動起來。</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold sm:text-3xl">從這裡開始</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {tiles.map((t) => (
            <article key={t.title} className="group">
              <div className="relative aspect-[4/3] sm:aspect-[4/5] overflow-hidden bg-stone">
                <Image
                  src={t.image}
                  alt={t.alt}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className={`object-cover ${t.position ?? ''} transition-transform duration-500 group-hover:scale-105`}
                />
              </div>
              <h3 className="mt-4 text-lg font-bold">{t.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.empty}</p>
              <span className="mt-3 inline-block text-xs font-semibold uppercase tracking-widest underline underline-offset-4">
                即將推出
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
