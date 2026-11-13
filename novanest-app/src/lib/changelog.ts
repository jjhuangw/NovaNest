import type { Locale } from './i18n/config'

// 版本紀錄：第一筆就是目前的版本。只有重要的新功能或修正才需要新增一筆（並更新 package.json 的 version），
// 小調整不必每次部署都記錄。announce 為 true 的版本，使用者更新後第一次進入 App 會看到「新功能」通知。
export interface Release {
  version: string
  date: string
  // 是否在 App 內通知使用者
  announce: boolean
  items: Record<Locale, string[]>
}

export const CHANGELOG: Release[] = [
  {
    version: '1.5.0',
    date: '2026-11-13',
    announce: true,
    items: {
      'zh-TW': ['課表上的動作附上示範圖（人與器材的起始、結束姿勢），點「怎麼做・怎麼發力」可以看器材設定、動作步驟、發力與感受，以及常見錯誤'],
      en: ['Exercises in your plan now show demo photos of the start and finish with the equipment. Tap “How to do it” for setup, steps, where to feel it, and common mistakes'],
    },
  },
  {
    version: '1.4.0',
    date: '2026-11-10',
    announce: true,
    items: {
      'zh-TW': ['預設改為淺色模式；想用深色或跟隨裝置設定，可以在「設定 → 外觀」切換', '新增品牌故事頁，介紹 NovaNest 名字的由來，並提供聯絡信箱 contact@novanestfit.com'],
      en: ['Light mode is now the default; switch to dark or follow your device under Settings → Appearance', 'New Our story page about where the NovaNest name comes from, with our contact email contact@novanestfit.com'],
    },
  },
  {
    version: '1.3.0',
    date: '2026-11-09',
    announce: true,
    items: {
      'zh-TW': ['新增 Free 與 Pro 方案：在「設定 → 方案」可以看到目前的方案，以及 AI 分析、課表等功能這段期間的剩餘次數'],
      en: ['Free and Pro plans: see your plan and how many AI analyses and plan generations you have left under Settings → Plan'],
    },
  },
  {
    version: '1.2.0',
    date: '2026-11-09',
    announce: true,
    items: {
      'zh-TW': ['新增「訓練趨勢」：每週總訓練量、每週達成率，以及每個動作的最佳一組與推估最大肌力（1RM）'],
      en: ['New Training trends: weekly volume, weekly completion, and best set and estimated max (1RM) for each exercise'],
    },
  },
  {
    version: '1.1.2',
    date: '2026-11-08',
    announce: true,
    items: {
      'zh-TW': ['已記錄的飲食可以編輯：修改餐別、名稱、份量與營養素，調整份量會自動重新計算', '點頁面最下方的版本號就能查看更新紀錄'],
      en: ['Edit logged food: change the meal, name, portion and nutrients, and portion changes recalculate automatically', 'Tap the version number at the bottom of any page to see what’s new'],
    },
  },
  {
    version: '1.1.1',
    date: '2026-11-08',
    announce: false,
    items: {
      'zh-TW': ['深色模式下，訓練紀錄頁的肌肉圖線條與輪廓更清楚', '每一頁最下方都可以點「更新紀錄」查看各版本的新功能'],
      en: ['Clearer muscle outlines on the training log’s muscle map in dark mode', 'A “What’s new” link at the bottom of every page shows each version’s changes'],
    },
  },
  {
    version: '1.1.0',
    date: '2026-11-08',
    announce: true,
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
    announce: true,
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

// 最近一個需要通知使用者的版本
export const LATEST_ANNOUNCEMENT = CHANGELOG.find((r) => r.announce) ?? null

// 部署到 Vercel 時的 commit，方便回報問題時對照
export function buildId(): string | null {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null
}
