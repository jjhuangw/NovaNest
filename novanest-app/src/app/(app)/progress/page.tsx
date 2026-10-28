/* eslint-disable @next/next/no-img-element -- 私有照片使用短效簽章網址，不經過圖片最佳化 */
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { formatDate, isISODate, todayISO } from '@/lib/training/dates'
import { listPhotos, type PhotoView } from '@/lib/photos/photos'
import { isPose, POSES, type Pose } from '@/lib/photos/poses'
import { getI18n } from '@/lib/i18n/server'
import DeleteButton from './delete-button'
import UploadForm from './upload-form'

export const instant = false

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

function formatSigned(n: number) {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`
}

function formatWeight(kg: number | null) {
  return kg === null ? null : `${kg.toFixed(1)} kg`
}

export default async function ProgressPage(props: PageProps<'/progress'>) {
  const session = await getSession()
  if (!session) redirect('/login')

  const [params, photos, { t }] = await Promise.all([props.searchParams, listPhotos(session.userId), getI18n()])
  const tp = t.progress
  const today = todayISO()

  // 對比：預設挑有照片的第一個姿勢，最早 vs 最新
  const pose: Pose = isPose(params.pose) ? params.pose : (POSES.find((p) => photos.some((x) => x.pose === p)) ?? 'front')
  const posePhotos = photos.filter((p) => p.pose === pose)
  const poseDates = [...new Set(posePhotos.map((p) => p.takenOn))].sort()
  const pick = (value: unknown, fallback: string | undefined) =>
    isISODate(value) && poseDates.includes(value) ? value : fallback
  const before = pick(params.a, poseDates[0])
  const after = pick(params.b, poseDates.at(-1))
  const beforePhoto = posePhotos.find((p) => p.takenOn === before)
  const afterPhoto = posePhotos.find((p) => p.takenOn === after)

  const weighed = photos.filter((p) => p.weightKg !== null)
  const weightChange =
    weighed.length >= 2 ? weighed[0].weightKg! - weighed[weighed.length - 1].weightKg! : null

  const apart = tp.daysApart(beforePhoto && afterPhoto ? daysBetween(beforePhoto.takenOn, afterPhoto.takenOn) : 0)

  const byDate = new Map<string, PhotoView[]>()
  for (const p of photos) byDate.set(p.takenOn, [...(byDate.get(p.takenOn) ?? []), p])

  return (
    <div>
      <section className="bg-stone">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Progress</p>
          <h1 className="mt-3 text-3xl font-bold sm:text-5xl">{tp.title}</h1>
          <p className="mt-4 text-base">{tp.intro}</p>
          <dl className="mt-8 grid max-w-2xl grid-cols-3 gap-6">
            <Stat label={tp.photos} value={tp.photoCount(photos.length)} />
            <Stat label={tp.latest} value={photos[0] ? formatDate(photos[0].takenOn) : '—'} />
            <Stat
              label={tp.weightChange}
              value={weightChange === null ? '—' : `${formatSigned(weightChange)} kg`}
            />
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-bold">{tp.upload}</h2>
        <div className="mt-6">
          <UploadForm today={today} />
        </div>
      </section>

      {photos.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="text-2xl font-bold">{tp.compare}</h2>
            <form method="get" className="mt-6 flex flex-wrap items-end gap-4 text-sm">
              <label>
                <span className="mb-1 block text-xs text-muted">{tp.pose}</span>
                <select name="pose" defaultValue={pose} className="border border-line bg-surface px-3 py-2">
                  {POSES.map((p) => (
                    <option key={p} value={p}>
                      {tp.poses[p]}
                    </option>
                  ))}
                </select>
              </label>
              {poseDates.length > 0 && (
                <>
                  <DateSelect name="a" label={tp.before} dates={poseDates} value={before!} />
                  <DateSelect name="b" label={tp.after} dates={poseDates} value={after!} />
                </>
              )}
              <button type="submit" className="border border-foreground px-4 py-2 font-semibold hover:bg-foreground hover:text-background">
                {tp.compareButton}
              </button>
            </form>

            {beforePhoto && afterPhoto ? (
              <>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-6">
                  <CompareCard title={tp.before} photo={beforePhoto} />
                  <CompareCard title={tp.after} photo={afterPhoto} />
                </div>
                <p className="mt-4 text-sm">
                  {apart.before}
                  <span className="font-bold">{apart.value}</span>
                  {apart.after}
                  {beforePhoto.weightKg !== null &&
                    afterPhoto.weightKg !== null &&
                    tp.weightDiff(formatSigned(afterPhoto.weightKg - beforePhoto.weightKg))}
                </p>
              </>
            ) : (
              <p className="mt-6 bg-stone px-6 py-10 text-center text-muted">{tp.noPose(tp.poses[pose])}</p>
            )}
          </div>
        </section>
      )}

      {photos.length > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="text-2xl font-bold">{tp.all}</h2>
            <div className="mt-6 space-y-10">
              {[...byDate].map(([date, list]) => (
                <div key={date}>
                  <h3 className="border-b border-foreground pb-2 font-bold">
                    {date.replaceAll('-', '/')}
                    {list.find((p) => p.weightKg !== null) && (
                      <span className="ml-3 text-sm font-normal text-muted">
                        {formatWeight(list.find((p) => p.weightKg !== null)!.weightKg)}
                      </span>
                    )}
                  </h3>
                  <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {list.map((p) => (
                      <li key={p.id}>
                        <a href={p.url ?? '#'} target="_blank" rel="noreferrer" className="block aspect-[3/4] overflow-hidden bg-stone">
                          {p.url && (
                            <img src={p.url} alt={`${p.takenOn} ${tp.poses[p.pose]}`} loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </a>
                        <div className="mt-1.5 flex items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold">{tp.poses[p.pose]}</span>
                          <DeleteButton id={p.id} label={tp.deleteLabel(p.takenOn, tp.poses[p.pose])} />
                        </div>
                        {p.notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{p.notes}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function DateSelect({ name, label, dates, value }: { name: string; label: string; dates: string[]; value: string }) {
  return (
    <label>
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <select name={name} defaultValue={value} className="border border-line bg-surface px-3 py-2 tabular-nums">
        {dates.map((d) => (
          <option key={d} value={d}>
            {d.replaceAll('-', '/')}
          </option>
        ))}
      </select>
    </label>
  )
}

function CompareCard({ title, photo }: { title: string; photo: PhotoView }) {
  return (
    <figure>
      <div className="aspect-[3/4] overflow-hidden bg-stone">
        {photo.url && <img src={photo.url} alt={`${title}：${photo.takenOn}`} className="h-full w-full object-cover" />}
      </div>
      <figcaption className="mt-2 flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="whitespace-nowrap font-bold">
          {title}・{photo.takenOn.replaceAll('-', '/')}
        </span>
        {photo.weightKg !== null && <span className="whitespace-nowrap text-muted">{formatWeight(photo.weightKg)}</span>}
      </figcaption>
    </figure>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  )
}
