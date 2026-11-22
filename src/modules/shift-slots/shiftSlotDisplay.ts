import type { TFunction } from 'i18next'
import type { ShiftSlotFieldsAdmin } from '@/backend-admin-sdk'
import { LOCALES, type Language } from '@/i18n/language'

// Spec 0026: ISO weekdays, Monday first, as the backend stores them (1 Monday to 7 Sunday).
export const WEEKDAYS: number[] = [1, 2, 3, 4, 5, 6, 7]

// The day's name in the reader's language ("Monday", "Δευτέρα"), from Intl rather than a list typed here
// (spec 0054). Worked out on a fixed Monday, 1 January 2024, in UTC, so the browser's own zone or locale
// never moves the day. A number outside 1 to 7 reads "Day 8".
export function weekdayLabel(weekday: number, t: TFunction, language: Language): string {
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return t('shiftSlots.dayNumber', { number: weekday })
  const day = new Date(Date.UTC(2024, 0, weekday))
  return new Intl.DateTimeFormat(LOCALES[language], { weekday: 'long', timeZone: 'UTC' }).format(day)
}

// Minutes after midnight as "HH:mm" on the 24 hour clock; 1440 is "24:00" (a slot that ends at midnight).
export function minutesToClock(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

// "HH:mm" typed by the admin, to minutes after midnight; null when it is not a time. "24:00" counts
// only where `allowMidnightEnd` is set (the End box), since a slot can end at midnight but not start there.
export function clockToMinutes(text: string, allowMidnightEnd: boolean): number | null {
  const value = text.trim()
  if (allowMidnightEnd && value === '24:00') return 1440
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

// "Friday 19:00 to 23:00, 6 riders": how a slot reads in a list or a change, in the reader's language
// (`t` and the language come from the component's useTranslation and useFormat).
export function describeSlot(slot: ShiftSlotFieldsAdmin, t: TFunction, language: Language): string {
  return t('shiftSlots.slot', {
    day: weekdayLabel(slot.weekday, t, language),
    start: minutesToClock(slot.startMinute),
    end: minutesToClock(slot.endMinute),
    riders: t('shiftSlots.riders', { count: slot.riderCap }),
  })
}
