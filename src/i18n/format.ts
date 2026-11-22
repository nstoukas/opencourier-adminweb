// How money, dates, times and distances read in the admin, in the reader's language (spec 0054, AC-3).
// Greek: the euro after the number with a decimal comma (1.234,56 €), dates day first, the 24 hour clock
// (23:25). English: "€1,234.56", still day first and on the 24 hour clock (en-GB, decision 47.5).
// One place for these, so every page shows the same thing. Components get them already bound to the
// reader's language through `useFormat()` (src/i18n/useFormat.ts); code outside React passes the language.
// Times are shown on Greek time (Europe/Athens) whatever the computer's own time zone is: the co-op serves
// Volos, so a laptop left on another zone must not shift a time on the record.
// The same functions as request-web's src/utils/format.ts, plus the ones the admin needs (seconds, a month).
import { DEFAULT_LANGUAGE, LOCALES, type Language } from './language'

export const TIME_ZONE = 'Europe/Athens'

// Accepts what the pages hold: an ISO string, a Date (the admin SDK turns timestamps into Dates), or nothing.
export type DateInput = string | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// Intl.DateTimeFormat is built into every browser and Node; the locale ('el-GR' or 'en-GB') gives the
// separators and order. Building one is slow, so each (language, options) pair is built once and kept.
const formatters = new Map<string, Intl.DateTimeFormat>()
function dateFormat(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${language}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(LOCALES[language], { ...options, timeZone: TIME_ZONE })
    formatters.set(key, formatter)
  }
  return formatter
}

const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
const TIME_SECONDS: Intl.DateTimeFormatOptions = { ...TIME, second: '2-digit' }

// Every function below takes the language last, with Greek, the admin's default, when it is left out.
// Pages always pass the reader's language (through useFormat). A missing value reads "—".

/** A date and time, for example "30/09/2026, 23:25". */
export function formatDateTime(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, { ...DATE, ...TIME }).format(date) : '—'
}

/** A date and time with seconds, for example "30/09/2026, 23:25:07" (the delivery record). */
export function formatDateTimeSeconds(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, { ...DATE, ...TIME_SECONDS }).format(date) : '—'
}

/** A whole date with no time, for example "30/09/2026". */
export function formatDate(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, DATE).format(date) : '—'
}

/** Only the time of day, for example "23:25". */
export function formatTime(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, TIME).format(date) : '—'
}

/** The time of day with seconds, for example "23:25:07". */
export function formatTimeSeconds(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, TIME_SECONDS).format(date) : '—'
}

/** A month and year in words, for example "Σεπτέμβριος 2026" or "September 2026". */
export function formatMonthYear(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, { month: 'long', year: 'numeric' }).format(date) : '—'
}

/** A day with its weekday, for example "Τρί 30/09" or "Tue 30/09". */
export function formatWeekdayDate(value: DateInput, language: Language = DEFAULT_LANGUAGE): string {
  const date = toDate(value)
  return date ? dateFormat(language, { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date) : '—'
}

/**
 * Whether a time reads as one o'clock (01:00 to 01:59) on Greek time. Greek says "στη 01:05" (στη μία)
 * but "στις 13:05", so a sentence that puts "at" before a time needs to know (decision 47.16).
 * formatToParts splits the formatted time into pieces, so the hour can be read on its own.
 */
export function isOneOClock(value: DateInput): boolean {
  const date = toDate(value)
  if (!date) return false
  const hour = dateFormat('el', TIME).formatToParts(date).find((part) => part.type === 'hour')
  return hour?.value === '01'
}

/** True only for a trimmed three letter code such as "EUR", which is what Intl accepts. */
function usableCurrency(code: string | null | undefined): string | null {
  return typeof code === 'string' && /^[A-Za-z]{3}$/.test(code.trim()) ? code.trim().toUpperCase() : null
}

/**
 * Money stored as cents: 338 with 'EUR' reads "3,38 €" (Greek) or "€3.38". Without a usable currency
 * code the number is shown with no symbol ("3,38"), never a guessed one. Missing reads "—".
 */
export function formatMoney(
  cents: number | null | undefined,
  currency: string | null | undefined,
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (cents == null || !Number.isFinite(cents)) return '—'
  const code = usableCurrency(currency)
  const options: Intl.NumberFormatOptions = code
    ? { style: 'currency', currency: code }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  try {
    return new Intl.NumberFormat(LOCALES[language], options).format(cents / 100)
  } catch {
    // An unknown three letter code makes Intl throw a RangeError: show the plain number instead.
    return new Intl.NumberFormat(LOCALES[language], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      cents / 100,
    )
  }
}

/** A plain number in the language's style: 1234.5 reads "1.234,5" (Greek) or "1,234.5". */
export function formatNumber(
  value: number | null | undefined,
  language: Language = DEFAULT_LANGUAGE,
  maximumFractionDigits = 2,
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits }).format(value)
}

// The backend names its unit in words ('KILOMETERS'); pages show the symbol, the same in Greek and
// English (decision 47.5). A unit not listed here is shown in lower case.
const UNIT_SYMBOLS: Record<string, string> = {
  KM: 'km',
  KILOMETERS: 'km',
  KILOMETER: 'km',
  MI: 'mi',
  MILES: 'mi',
  MILE: 'mi',
  M: 'm',
  METERS: 'm',
  METRES: 'm',
}

/** A distance with its unit, one decimal: 2.43 and 'KILOMETERS' read "2,4 km" (Greek) or "2.4 km". */
export function formatDistance(
  value: number | null | undefined,
  unit: string | null | undefined = 'KILOMETERS',
  language: Language = DEFAULT_LANGUAGE,
): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const number = new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 1 }).format(value)
  return unit ? `${number} ${UNIT_SYMBOLS[unit.toUpperCase()] ?? unit.toLowerCase()}` : number
}
