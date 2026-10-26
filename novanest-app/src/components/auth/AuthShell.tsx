import Image from 'next/image'
import Link from 'next/link'

export const inputClass =
  'w-full border border-line bg-white px-4 py-3 text-sm text-foreground placeholder-muted/70 focus:border-foreground focus:outline-none'

export const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-foreground mb-2'

export const buttonClass =
  'w-full bg-foreground py-3.5 text-sm font-semibold uppercase tracking-widest text-white transition-opacity hover:opacity-85 disabled:opacity-50'

export default function AuthShell({
  image,
  imageAlt,
  tagline,
  title,
  children,
}: {
  image: string
  imageAlt: string
  tagline: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <div className="relative h-56 sm:h-72 lg:h-auto">
        <Image src={image} alt={imageAlt} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/25" />
        <p className="absolute bottom-6 left-6 right-6 max-w-lg text-balance text-3xl font-bold leading-tight text-white sm:text-4xl lg:bottom-12 lg:left-12 lg:text-5xl">
          {tagline}
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm space-y-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-lg font-black uppercase tracking-[0.2em]">NovaNest</span>
          </Link>
          <h1 className="text-2xl font-bold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  )
}
