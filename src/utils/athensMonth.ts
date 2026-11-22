// Spec 0036. Charges are grouped by the Athens calendar month (YYYY-MM), whatever the admin's
// computer says. Intl with the Athens time zone, as the dispatch stop times do (AGENTS.md).
import { LOCALES, type Language } from '@/i18n/language'

export const INSTANCE_TIMEZONE = 'Europe/Athens'

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

// True for a month the backend accepts (YYYY-MM, from 1970).
export function isMonth(text: unknown): text is string {
  return typeof text === 'string' && MONTH_PATTERN.test(text) && Number(text.slice(0, 4)) >= 1970
}

// This month in Athens, as YYYY-MM. Just after midnight on the 1st in Athens it is already the
// new month, even where the browser's clock still shows the old one.
export function currentAthensMonth(now: Date = new Date()): string {
  // en-CA formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: INSTANCE_TIMEZONE }).format(now).slice(0, 7)
}

// The earliest month the backend accepts: Previous stops here.
export const FIRST_MONTH = '1970-01'

// The month `delta` months away (negative goes back): shiftMonth('2026-01', -1) is '2025-12'.
export function shiftMonth(month: string, delta: number): string {
  const index = Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1) + delta
  const year = Math.floor(index / 12)
  return `${year}-${String((index % 12) + 1).padStart(2, '0')}`
}

// "November 2026" in English, "Νοέμβριος 2026" in Greek (spec 0054: pages pass the reader's language,
// the Greek statement passes 'el'). Required, so a caller cannot forget it (row 47 review).
export function monthTitle(month: string, language: Language): string {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 15))
  return new Intl.DateTimeFormat(LOCALES[language], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
}

// The parts of an instant on the Athens clock, as two digit strings.
function athensParts(iso: string): { year: string; month: string; day: string; hour: string; minute: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INSTANCE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

// "18/11/2026 14:05" in Athens time (the admin pages and the statement). Digits only, the same in
// Greek and English, so it takes no language.
export function athensDayTime(iso: string): string {
  const p = athensParts(iso)
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

// "2026-11-18 14:05" in Athens time (the CSV, which spreadsheets sort as text).
export function athensIsoMinute(iso: string): string {
  const p = athensParts(iso)
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
}
