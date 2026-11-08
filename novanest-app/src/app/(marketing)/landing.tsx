import Image from 'next/image'
import Link from 'next/link'
import LanguageToggle from '@/components/language-toggle'
import type { Messages } from '@/lib/i18n/messages'

// 對外的產品介紹頁：不讀取登入狀態，任何人都能看
export default function Landing({ t }: { t: Messages }) {
  const tl = t.landing
  const primary =
    'inline-flex min-h-12 items-center justify-center bg-accent px-8 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-90'
  const secondary =
    'inline-flex min-h-12 items-center justify-center border border-white/70 px-8 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white hover:text-black'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-line bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-base font-black uppercase tracking-[0.15em] sm:text-lg sm:tracking-[0.2em]">NovaNest</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold sm:gap-6">
            <a href="#features" className="hidden hover:underline sm:inline">
              {tl.nav.features}
            </a>
            <a href="#how" className="hidden hover:underline sm:inline">
              {tl.nav.how}
            </a>
            <LanguageToggle />
            <Link href="/login" className="hover:underline">
              {tl.nav.login}
            </Link>
            <Link href="/register" className="hidden bg-foreground px-4 py-2 text-background hover:opacity-85 sm:inline-block">
              {tl.nav.start}
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* 主視覺 */}
        <section className="relative flex min-h-[78vh] items-end overflow-hidden">
          <Image src="/images/hero.jpg" alt={tl.heroAlt} fill priority sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-32 text-white sm:pb-24">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/80">{tl.heroEyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-balance text-5xl font-black leading-tight sm:text-7xl">{tl.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-base text-white/90 sm:text-lg">{tl.heroSub}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={primary}>
                {tl.heroCta}
              </Link>
              <Link href="/login" className={secondary}>
                {tl.heroSecondary}
              </Link>
            </div>
          </div>
        </section>

        {/* 功能 */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{tl.featuresEyebrow}</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold sm:text-5xl">{tl.featuresTitle}</h2>
          <ol className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {tl.features.map((f, i) => (
              <li key={f.title} className="bg-background p-8">
                <span className="text-sm font-semibold tabular-nums text-accent">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-4 text-xl font-bold">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{f.body}</p>
              </li>
            ))}
          </ol>
          <ul className="mt-8 flex flex-wrap gap-2 text-xs font-semibold">
            {tl.extras.map((x) => (
              <li key={x} className="border border-line px-3 py-1.5">
                {x}
              </li>
            ))}
          </ul>
        </section>

        {/* 圖片帶：訓練、飲食、體態 */}
        <section aria-hidden className="grid grid-cols-3">
          {['/images/training.jpg', '/images/nutrition.jpg', '/images/body.jpg'].map((src) => (
            <div key={src} className="relative aspect-[3/4] sm:aspect-[4/3]">
              <Image src={src} alt="" fill sizes="33vw" className="object-cover" />
            </div>
          ))}
        </section>

        {/* 如何開始 */}
        <section id="how" className="bg-stone">
          <div className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">{tl.howEyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-5xl">{tl.howTitle}</h2>
            <ol className="mt-14 grid gap-10 sm:grid-cols-3">
              {tl.steps.map((s, i) => (
                <li key={s.title}>
                  <span className="text-6xl font-black tabular-nums text-accent">{i + 1}</span>
                  <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 打卡圖展示 */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-5xl">{tl.showcaseTitle}</h2>
            <p className="mt-5 max-w-md text-base text-muted">{tl.showcaseBody}</p>
            <Link href="/register" className={`${primary} mt-8`}>
              {tl.heroCta}
            </Link>
          </div>
          <StoryPreview t={t} />
        </section>

        {/* 隱私 */}
        <section className="border-y border-line">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center">
            <h2 className="text-2xl font-bold">{tl.privacyTitle}</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">{tl.privacyBody}</p>
          </div>
        </section>

        {/* 結尾 */}
        <section className="bg-foreground text-background">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
            <p className="inline-flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-sm font-black uppercase tracking-[0.25em]">NovaNest</span>
            </p>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance text-3xl font-black sm:text-5xl">{tl.finalTitle}</h2>
            <Link href="/register" className={`${primary} mt-10`}>
              {tl.finalCta}
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-xs text-muted">{tl.footer}</footer>
    </div>
  )
}

// 打卡圖的示意（與實際產生的圖相同風格）
function StoryPreview({ t }: { t: Messages }) {
  const s = t.landing.sample
  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-[18rem] bg-[#0e0e0e] p-6 text-[#f2f2f0] shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="mt-6 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff4b57]" />
            <span className="text-[10px] font-black tracking-[0.25em]">NOVANEST</span>
          </span>
          <span className="text-[9px] text-[#a3a3a0]">{t.log.share.card.slogan}</span>
        </div>
        <p className="mt-5 text-[10px] text-[#a3a3a0]">{s.date}</p>
        <p className="text-xl font-extrabold">{s.title}</p>
        <p className="mt-4 text-[9px] text-[#a3a3a0]">{s.completion}</p>
        <p className="text-6xl font-black leading-none">100%</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div>
            <p className="text-[9px] text-[#a3a3a0]">{s.sets}</p>
            <p className="text-base font-extrabold">9 / 9</p>
          </div>
          <div>
            <p className="text-[9px] text-[#a3a3a0]">{s.volume}</p>
            <p className="text-base font-extrabold">6,330 kg</p>
          </div>
        </div>
        <div className="mt-4 border-t border-[#34342f] pt-2">
          {s.rows.map(([name, value]) => (
            <p key={name} className="flex justify-between py-1 text-[10px]">
              <span className="font-bold">{name}</span>
              <span className="text-[#a3a3a0]">{value}</span>
            </p>
          ))}
        </div>
        <p className="mt-auto mb-6 flex justify-end border-t border-[#34342f] pt-3 text-[9px] font-black text-[#ff4b57]">✓ WORKOUT DONE</p>
      </div>
    </div>
  )
}
