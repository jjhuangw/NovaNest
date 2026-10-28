import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NovaNest',
  description: '打造屬於你的體態，增肌減脂健身飲食全方位管理',
}

// 在第一次繪製前套用 cookie 中的主題與語系，避免閃爍；
// 讀 cookie 而非在伺服器端讀取，讓根 layout 保持可預先渲染
const PREFERENCES_SCRIPT = `(function(){try{var d=document.documentElement,c=document.cookie;var t=c.match(/(?:^|; )theme=(light|dark)(?:;|$)/);if(t)d.setAttribute("data-theme",t[1]);var l=c.match(/(?:^|; )locale=(zh-TW|en)(?:;|$)/);if(l)d.lang=l[1]}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: PREFERENCES_SCRIPT }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  )
}
