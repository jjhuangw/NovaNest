import type { Locale } from '../config'
import en from './en'
import zhTW, { type Messages } from './zh-TW'

const MESSAGES: Record<Locale, Messages> = { 'zh-TW': zhTW, en }

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale]
}

export type { Messages }
