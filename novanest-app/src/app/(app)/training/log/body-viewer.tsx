'use client'

import dynamic from 'next/dynamic'
import { useSyncExternalStore } from 'react'
import type { Gender } from '@/lib/user/profile'
import BodyFigures, { type MuscleFill } from './body-figures'

// 3D 套件只在這裡按需載入；瀏覽器不支援 WebGL 時改用原本的 2D 肌肉圖
const Body3D = dynamic(() => import('./body-3d'), {
  ssr: false,
  loading: () => <div className="mx-auto mt-6 aspect-[3/4] w-full max-w-[320px] bg-stone motion-safe:animate-pulse" />,
})

let webglSupport: boolean | null = null
function supportsWebGL(): boolean {
  if (webglSupport === null) {
    try {
      const canvas = document.createElement('canvas')
      webglSupport = !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      webglSupport = false
    }
  }
  return webglSupport
}

const noop = () => () => {}

export default function BodyViewer({ gender, fills }: { gender: Gender; fills: MuscleFill[] }) {
  // 伺服器端先當作支援，第一次在瀏覽器渲染時才檢查
  const webgl = useSyncExternalStore(noop, supportsWebGL, () => true)
  return webgl ? <Body3D gender={gender} fills={fills} /> : <BodyFigures gender={gender} fills={fills} />
}
