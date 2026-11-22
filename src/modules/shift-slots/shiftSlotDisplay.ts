import type { TFunction } from 'i18next'
import type { ShiftOfflineEventAdminDto, ShiftSlotFieldsAdmin } from '@/backend-admin-sdk'
import { formatTime, formatWeekdayDate, TIME_ZONE } from '@/i18n/format'
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

// Built once, since building a formatter is slow (format.ts caches its own for the same reason).
const ATHENS_DATE = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

// The YYYY-MM-DD day of a valid date on Athens time. formatToParts hands back the year, month and day as
// separate pieces, so the result never depends on how a locale orders or separates them.
function athensDay(date: Date): string {
  const parts = ATHENS_DATE.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

// "Παρ 20/11, 20:00 έως 23:59" or "Fri 20/11, 20:00 to 23:59": the booked shift of an Offline item, worded
// here in the reader's language on Athens time (row 124), from the shift's start and end. A shift that ends
// at midnight reads "24:00", as the backend's English and the rider's sentence do. With no start or end (an
// older backend), the server's English `shiftText` shows as it came.
// `Pick<A, 'x' | 'y'>` is the type of an object with only those fields of A, so a test can pass just them.
export function describeOfflineShift(
  event: Pick<ShiftOfflineEventAdminDto, 'shiftStartsAt' | 'shiftEndsAt' | 'shiftDate' | 'shiftText'>,
  t: TFunction,
  language: Language,
): string {
  const { shiftStartsAt, shiftEndsAt } = event
  if (!shiftStartsAt || !shiftEndsAt) return event.shiftText
  const startsAt = new Date(shiftStartsAt)
  const endsAt = new Date(shiftEndsAt)
  // A value that is not a time gives an Invalid Date, whose getTime() is NaN, and Intl throws on one;
  // then the server's English is the better line.
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return event.shiftText
  const end = formatTime(endsAt, language)
  const endsAtMidnight = end === '00:00' && athensDay(endsAt) !== event.shiftDate
  return t('shiftSlots.offline.shift', {
    day: formatWeekdayDate(startsAt, language),
    start: formatTime(startsAt, language),
    end: endsAtMidnight ? '24:00' : end,
  })
}
