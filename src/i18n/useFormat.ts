import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type DateInput,
  formatDate,
  formatDateTime,
  formatDateTimeSeconds,
  formatDistance,
  formatMoney,
  formatMonthYear,
  formatNumber,
  formatTime,
  formatTimeSeconds,
  formatWeekdayDate,
  isOneOClock,
} from './format'
import { toLanguage } from './language'

/**
 * The format helpers (src/i18n/format.ts) already set to the reader's language (spec 0054, AC-3).
 * A custom hook: a function whose name starts with `use` and that calls other hooks, here
 * useTranslation, so the page re-renders when the language changes.
 */
export function useFormat() {
  const { i18n, t } = useTranslation()
  const language = toLanguage(i18n.language)
  // useMemo keeps the same object between renders until the language changes.
  return useMemo(
    () => ({
      language,
      money: (cents: number | null | undefined, currency: string | null | undefined) =>
        formatMoney(cents, currency, language),
      number: (value: number | null | undefined, maximumFractionDigits?: number) =>
        formatNumber(value, language, maximumFractionDigits),
      dateTime: (value: DateInput) => formatDateTime(value, language),
      dateTimeSeconds: (value: DateInput) => formatDateTimeSeconds(value, language),
      date: (value: DateInput) => formatDate(value, language),
      time: (value: DateInput) => formatTime(value, language),
      timeSeconds: (value: DateInput) => formatTimeSeconds(value, language),
      monthYear: (value: DateInput) => formatMonthYear(value, language),
      weekdayDate: (value: DateInput) => formatWeekdayDate(value, language),
      // "at 13:05" with the right Greek word for "at": "στις 13:05", but "στη 01:05" at one o'clock.
      atTime: (value: DateInput) =>
        t(isOneOClock(value) ? 'common.atOneOClock' : 'common.atTime', { time: formatTime(value, language) }),
      distance: (value: number | null | undefined, unit?: string | null) => formatDistance(value, unit, language),
    }),
    [language, t],
  )
}

// The return type of useFormat, for a helper that takes the formats as an argument.
export type Formats = ReturnType<typeof useFormat>
