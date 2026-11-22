import { formatMonthYear } from '@/i18n/format'
import { DEFAULT_LANGUAGE, type Language } from '@/i18n/language'

// "March 2026" ("Μάρτιος 2026" in Greek): when a rider or a restaurant joined, on Athens time. A join
// date, not a tenure score. Shared by the couriers pages (spec 0012) and the restaurants pages (spec 0024).
// Pass the reader's language (useFormat().language); left out, it is Greek, like the format helpers.
export function memberSince(createdAt: Date, language: Language = DEFAULT_LANGUAGE): string {
  return formatMonthYear(createdAt, language)
}
