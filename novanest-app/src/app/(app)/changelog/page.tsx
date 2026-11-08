import { CHANGELOG } from '@/lib/changelog'
import { getI18n } from '@/lib/i18n/server'

// 版本紀錄：每一版新增或改善了什麼
export default async function ChangelogPage() {
  const { locale, t } = await getI18n()
  const tc = t.changelog
  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Changelog</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{tc.title}</h1>
          <p className="mt-4 text-base">{tc.intro}</p>
        </div>
      </section>
      <ol className="mx-auto max-w-3xl px-6 py-12">
        {CHANGELOG.map((release, i) => (
          <li key={release.version} className="border-b border-line py-8 first:pt-0 last:border-b-0">
            <h2 className="flex flex-wrap items-baseline gap-3">
              <span className="text-2xl font-bold tabular-nums">v{release.version}</span>
              <span className="text-sm text-muted tabular-nums">{release.date.replaceAll('-', '/')}</span>
              {i === 0 && <span className="border border-accent px-2 py-0.5 text-xs font-semibold text-accent">{tc.current}</span>}
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
              {release.items[locale].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
