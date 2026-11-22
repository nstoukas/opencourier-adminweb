import type { TFunction } from 'i18next'
import type { JobEndLabel, TimeWorkedChangeCause } from '../../backend-admin-sdk'
import { athensToday } from '../dispatch-stop/dispatchStopDisplay'
import { LOCALES, type Language } from '@/i18n/language'
import { keyMessage, type ShownMessage } from '@/i18n/shownMessage'
import type { Formats } from '@/i18n/useFormat'

// Spec 0040: plain helpers for the Time worked page and a rider's Time worked card. Days are
// YYYY-MM-DD in Europe/Athens, as the server counts them; this file does no timezone maths of its own.

// The longest ranges the server accepts (AC-14, AC-15).
export const TOTALS_MAX_DAYS = 92
export const RIDER_MAX_DAYS = 31

const DAY = /^\d{4}-\d{2}-\d{2}$/

export function isDay(text: unknown): text is string {
  if (typeof text !== 'string' || !DAY.test(text)) return false
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
}

// A day moved by whole days, worked out on the calendar date alone (no timezone involved).
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// How many days a range covers, both ends included.
export function daysInRange(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1
}

export type DayRange = { from: string; to: string }

// The range in the URL when it is valid and within the limit, else the last `defaultDays` days ending
// today. A sentence says why a range was not used, so a pasted link never fails silently. The sentence
// is a translation key (with its values), translated by the page, so it follows the reader's language.
export function rangeFromQuery(
  from: unknown,
  to: unknown,
  maxDays: number,
  defaultDays: number,
  now: Date = new Date()
): { range: DayRange; problem: ShownMessage | null } {
  const today = athensToday(now)
  const fallback = { from: addDays(today, -(defaultDays - 1)), to: today }
  if (from === undefined && to === undefined) return { range: fallback, problem: null }
  if (!isDay(from) || !isDay(to))
    return {
      range: fallback,
      problem: keyMessage('timeWorked.problem.format'),
    }
  if (from > to)
    return {
      range: fallback,
      problem: keyMessage('timeWorked.problem.order'),
    }
  if (daysInRange(from, to) > maxDays)
    return {
      range: fallback,
      problem: keyMessage('timeWorked.problem.tooLong', { max: maxDays }),
    }
  return { range: { from, to }, problem: null }
}

// A calendar day (YYYY-MM-DD) in words, "Thu 19 Nov 2026" (Greek "Πέμ 19 Νοε 2026"). The day is formatted
// in UTC so it stays the same day whatever the browser's zone. Used by the rider card and the totals page
// alike. The language picks the locale (en-GB or el-GR, src/i18n/language.ts). It is required in every helper
// here, so a caller cannot forget it and silently get one language (row 47 review).
export function formatDay(day: string, withWeekday: boolean, language: Language): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
    timeZone: 'UTC',
    weekday: withWeekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// The totals add up only the days inside the range, so a "By week" row whose Monday to Sunday week
// reaches outside it is part of a week. This says which part, or null for a whole week (review
// 2026-11-20, decision 36.49). `t` and the language come from the page (useTranslation, useFormat).
export function weekPart(monday: string, range: DayRange, t: TFunction, language: Language): string | null {
  const sunday = addDays(monday, 6)
  const first = monday < range.from ? range.from : monday
  const last = sunday > range.to ? range.to : sunday
  if (first === monday && last === sunday) return null
  const short = (day: string) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString(LOCALES[language], {
      timeZone: 'UTC',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  return first === last
    ? t('timeWorked.weekPart.only', { day: short(first) })
    : t('timeWorked.weekPart.range', { first: short(first), last: short(last) })
}

// "3 h 12 min", "48 min", "0 min" (Greek "3 ώρ. 12 λ."), in the reader's language through `t`.
export function formatDuration(seconds: number, t: TFunction): string {
  const minutes = Math.max(0, Math.floor(seconds / 60))
  if (minutes < 60) return t('timeWorked.duration.minutes', { minutes })
  return t('timeWorked.duration.hours', {
    hours: Math.floor(minutes / 60),
    minutes: String(minutes % 60).padStart(2, '0'),
  })
}

// "38%" for unpaid over work, or an em dash with no work time.
export function formatShare(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '—'
}

// A status's words come from enumLabel(t, 'courierStatus', …) (src/i18n/enumLabel.ts).

// The translation key of each cause. A Record over the backend's type, so a cause added there without a
// key here is a type error.
export const CAUSE_KEYS: Record<TimeWorkedChangeCause, string> = {
  RIDER: 'timeWorked.cause.RIDER',
  ADMIN: 'timeWorked.cause.ADMIN',
  CUT_OFF: 'timeWorked.cause.CUT_OFF',
  LAST_CALL_ACCEPTED: 'timeWorked.cause.LAST_CALL_ACCEPTED',
  SYSTEM_START: 'timeWorked.cause.SYSTEM_START',
}

// Spec 0042 (AC-8): how a job ended when not in this rider's drop off, the rider app's words, as keys.
export const END_KEYS: Record<JobEndLabel, string> = {
  CANCELLED_AFTER_PICKUP: 'timeWorked.end.CANCELLED_AFTER_PICKUP',
  CANCELLED: 'timeWorked.end.CANCELLED',
  REMOVED: 'timeWorked.end.REMOVED',
  HANDED_BACK: 'timeWorked.end.HANDED_BACK',
  REASSIGNED: 'timeWorked.end.REASSIGNED',
  FAILED: 'timeWorked.end.FAILED',
  ENDED: 'timeWorked.end.ENDED',
  IN_PROGRESS: 'timeWorked.end.IN_PROGRESS',
}

// "1.2 km", always one decimal (spec 0042 AC-1); "1,2 km" in Greek.
export function formatKm(km: number, language: Language): string {
  const number = new Intl.NumberFormat(LOCALES[language], { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${number.format(Math.round(km * 10) / 10)} km`
}

// A time of a shift, with its weekday and date when it falls on another Athens day than `fromIso`
// ("17:00", or "Sun 02/11, 06:00"), in the reader's language through the format helper.
export function shiftTime(f: Formats, fromIso: string, iso: string): string {
  return athensToday(new Date(fromIso)) === athensToday(new Date(iso)) ? f.time(iso) : dayAndTime(f, iso)
}

// "Sun 02/11, 06:00" on Athens time.
export function dayAndTime(f: Formats, iso: string): string {
  return `${f.weekdayDate(iso)}, ${f.time(iso)}`
}

// Accept to the job's end (or now, while held), in whole minutes, rounded as the server rounds them.
// Never below 0: a job still held, read on a browser whose clock runs behind the server's.
export function jobMinutes(job: { acceptedAt: string; endedAt: string | null }, now: number = Date.now()): number {
  return Math.max(0, Math.round(((job.endedAt ? Date.parse(job.endedAt) : now) - Date.parse(job.acceptedAt)) / 60_000))
}

// A break shorter than a minute would read "Break 01:35 to 01:35", so the card gives it its own words.
// It is never hidden: the record is there to be checked (row 122, the rule the rider app uses, row 120).
export function isUnderAMinute(b: { startedAt: string; endedAt: string }): boolean {
  return Date.parse(b.endedAt) - Date.parse(b.startedAt) < 60_000
}
