import type { DateInput } from '@/i18n/format'
import type { Formats } from '@/i18n/useFormat'

// A date the API can legitimately leave unset, as a date and time in the reader's language, or "—".
// The SDK deserializes several of them with a bare `new Date(json[...])`, and `new Date(null)` is the
// Unix epoch, so the epoch (like null or an unparseable date) means "not set", as formatOptionalDate
// in ui-shared-utils had it. `f` is useFormat()'s result.
export function optionalDateTime(f: Formats, date: DateInput): string {
  if (date == null || date === '') return '—'
  const time = (date instanceof Date ? date : new Date(date)).getTime()
  if (Number.isNaN(time) || time === 0) return '—'
  return f.dateTime(date)
}
