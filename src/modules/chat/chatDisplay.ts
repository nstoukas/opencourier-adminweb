// Spec 0034 (chat): how the Messages page words and times things. Pure functions, so they test alone.

import type { TFunction } from 'i18next'
import { LOCALES, type Language } from '@/i18n/language'

// The instance's time zone: messages are shown in Volos time on the 24 hour clock, whatever the
// browser's own zone (redesign notes: 24 hour clock).
const TIME_ZONE = 'Europe/Athens'

// The clock and the short date follow the reader's language (spec 0054, AC-3): "17 Nov" or "17 Νοε".
// Each function takes the language last; left out it is English, the words these had before.
// Building an Intl formatter is slow, so each language's pair is built once and kept.
const formats = new Map<Language, { clock: Intl.DateTimeFormat; day: Intl.DateTimeFormat }>()
function formatsFor(language: Language) {
  let found = formats.get(language)
  if (!found) {
    found = {
      clock: new Intl.DateTimeFormat(LOCALES[language], { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
      day: new Intl.DateTimeFormat(LOCALES[language], { timeZone: TIME_ZONE, day: 'numeric', month: 'short' }),
    }
    formats.set(language, found)
  }
  return found
}
// Which Athens calendar day a time falls on, as YYYY-MM-DD (en-CA's order): logic, not words.
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

export function messageTime(iso: string, language: Language = 'en'): string {
  return formatsFor(language).clock.format(new Date(iso))
}

// A message's stamp: the clock for today (Athens day), the date and the clock before that, since one
// thread runs for up to 90 days (AC-18). "14:05" today, "17 Nov, 14:05" for an older day.
export function messageStamp(iso: string, now: Date = new Date(), language: Language = 'en'): string {
  const { clock, day } = formatsFor(language)
  const date = new Date(iso)
  const time = clock.format(date)
  return dayKey.format(date) === dayKey.format(now) ? time : `${day.format(date)}, ${time}`
}

// A thread row's time: the clock for today, the date before that.
export function threadTime(iso: string | null, now: Date = new Date(), language: Language = 'en'): string {
  if (!iso) return ''
  const { clock, day } = formatsFor(language)
  const date = new Date(iso)
  return dayKey.format(date) === dayKey.format(now) ? clock.format(date) : day.format(date)
}

// "Ana Torres" -> "AT"; "Tiger Noodles" -> "TN"; one word -> its first two letters.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  const last = words[words.length - 1] ?? ''
  if (first === '') return '?'
  if (words.length === 1) return first.slice(0, 2).toUpperCase()
  return (first.charAt(0) + last.charAt(0)).toUpperCase()
}

// Who a thread is with, in the reader's language. Takes `t` (i18next's translate function) because a
// plain helper has no hook to read the language from.
export function roleLabel(kind: 'COURIER' | 'PARTNER', t: TFunction): string {
  return t(kind === 'COURIER' ? 'chat.role.COURIER' : 'chat.role.PARTNER')
}

// The order a message or thread is about, as the rest of admin names it.
export function orderLabel(orderReference: string | null, deliveryId: string | null): string | null {
  if (orderReference) return `#${orderReference}`
  if (deliveryId) return `#${deliveryId.slice(-6)}`
  return null
}

// What the Send button may send: trimmed, 1 to 1000 characters (AC-4).
export const CHAT_MESSAGE_MAX_LENGTH = 1000
export function sendableText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= CHAT_MESSAGE_MAX_LENGTH ? trimmed : null
}

// A new id for one message, so a retry after a failed send can never make a second one (AC-19).
export function newClientMessageId(): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return `admin-${random}`
}
