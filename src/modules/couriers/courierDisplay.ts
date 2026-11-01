import dayjs from 'dayjs'
import type { CourierAdminDto } from '@/backend-admin-sdk'

// How a rider takes offers, in words (spec 0012). NONE reads "Not set". A setting added on the
// server later has no words here yet, so it shows as sent rather than as "undefined".
export function deliverySettingLabel(value: CourierAdminDto['deliverySetting']): string {
  const labels: Record<CourierAdminDto['deliverySetting'], string> = {
    AUTO_ACCEPT: 'Auto accept',
    AUTO_REJECT: 'Auto reject',
    MANUAL: 'Manual',
    NONE: 'Not set',
  }
  // Read through a string index: the API can send a value this build has no label for.
  const label = (labels as Partial<Record<string, string>>)[value]
  return label ?? value
}

// "March 2026": when the rider joined, in the browser's time zone. A join date, not a tenure score.
export function memberSince(createdAt: Date): string {
  return dayjs(createdAt).format('MMMM YYYY')
}

// The rider's full name, or "Courier" when both parts are empty.
export function courierName(courier: Pick<CourierAdminDto, 'firstName' | 'lastName'>): string {
  return `${courier.firstName} ${courier.lastName}`.trim() || 'Courier'
}
