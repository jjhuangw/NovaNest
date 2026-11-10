'use client'

import { useSyncExternalStore } from 'react'

// 目前實際顯示的是否為深色：html[data-theme] 為 system 時跟隨裝置設定，沒有設定時為淺色。
// 給無法使用 CSS 變數的地方（例如 SVG 屬性）選顏色用。
const QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => {
    media.removeEventListener('change', onChange)
    observer.disconnect()
  }
}

function getSnapshot() {
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'system' ? window.matchMedia(QUERY).matches : theme === 'dark'
}

export function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
