import { DateTimeDto } from '@/backend-customer-sdk'
import dayjs from 'dayjs'

export function formatDateAsHourAndMinute(date: string | number | Date): string {
  return dayjs(date).format('h:mm A')
}

export function formatDate(date: Date | string) {
  return dayjs(date).format('MMMM D, YYYY h:mm A')
}

// For dates the API can legitimately leave unset. The generated SDK types several of them
// as a required `Date` and deserializes with a bare `new Date(json[...])` — and
// `new Date(null)` is the Unix epoch, which is why an unset date rendered as
// "January 1, 1970". A real delivery timestamp is never the epoch, so treat that
// value — like null, undefined or an unparseable date — as "not set".
export function formatOptionalDate(date: Date | string | null | undefined) {
  if (date == null) return '—'

  const parsed = dayjs(date)
  if (!parsed.isValid() || parsed.valueOf() === 0) return '—'

  return parsed.format('MMMM D, YYYY h:mm A')
}

export function formatDateTime(dateTime: DateTimeDto) {
  const { year, month, day, hour, minute } = dateTime
  const date = new Date()
  date.setFullYear(year, month, day)
  date.setHours(hour, minute)

  const now = new Date()

  const dateFormatter = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' })
  const timeFormatter = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true })

  // Check if the date is today
  if (date.toDateString() === now.toDateString()) {
    return `Today @ ${timeFormatter.format(date)}`
  }

  // Check if the date is tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow @ ${timeFormatter.format(date)}`
  }

  // Format for any other day
  return `${dateFormatter.format(date)} @ ${timeFormatter.format(date)}`
}
