import dayjs from 'dayjs'

// "March 2026": when a rider or a restaurant joined, in the browser's time zone. A join date,
// not a tenure score. Shared by the couriers pages (spec 0012) and the restaurants pages (spec 0024).
export function memberSince(createdAt: Date): string {
  return dayjs(createdAt).format('MMMM YYYY')
}
