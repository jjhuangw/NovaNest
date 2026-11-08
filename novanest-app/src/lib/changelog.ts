import type { Locale } from './i18n/config'

// 版本紀錄：第一筆就是目前的版本。新增使用者看得到的功能時，在最前面加一筆並更新 package.json 的 version。
// 使用者更新後第一次進入 App 時，會看到最新一筆的「新功能」通知。
export interface Release {
  version: string
  date: string
  items: Record<Locale, string[]>
}

export const CHANGELOG: Release[] = [
  {
    version: '1.1.0',
    date: '2026-11-08',
    items: {
      'zh-TW': [
        '課表會依你的訓練經驗安排，新手以容易感受肌肉的器材為主，每個動作都附上「感受提示」',
        '飲食紀錄可以調整份量或重量，營養素與熱量來源比例會立即重新計算',
        '打卡圖可以分享到 Threads，附上 NovaNest 的介紹連結',
        '切換語言時，AI 課表也能翻譯成另一種語言',
        '換頁速度更快，點擊後畫面上方會顯示進度條',
        '新增版本資訊與新功能通知',
      ],
      en: [
        'Plans now match your training experience: beginners get exercises that are easier to feel, and every exercise has a “feel it” cue',
        'Adjust food portions or weight, and nutrients and calorie split update instantly',
        'Share your workout card to Threads with a link to NovaNest',
        'AI plans can be translated when you switch languages',
        'Faster page switching, with a progress bar at the top after each tap',
        'Version info and what’s-new notifications',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-11-08',
    items: {
      'zh-TW': [
        'IG 限時動態打卡圖：可改標題、換背景、放上自己的照片、加文字和 emoji',
        '使用者名稱可以在設定中修改，也能使用中文',
        '品牌標語「練出新的自己」',
        'AI 分析加上每日使用上限',
        '管理員後台：使用者管理與 AI 用量統計',
      ],
      en: [
        'Instagram story cards: edit the title, change the background, use your own photo, add text and emoji',
        'Change your username in Settings, in any language',
        'New slogan: “Train into a new you”',
        'Daily limits for AI analysis',
        'Admin console with user management and AI usage stats',
      ],
    },
  },
]

export const APP_VERSION = CHANGELOG[0].version

// 部署到 Vercel 時的 commit，方便回報問題時對照
export function buildId(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null
}
