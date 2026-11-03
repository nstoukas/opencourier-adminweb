import type { ShiftSlotFieldsAdmin } from '@/backend-admin-sdk'

// Spec 0026: ISO weekdays, Monday first, as the backend stores them (1 Monday to 7 Sunday). A fixed map,
// never the browser's locale, so a slot's day reads the same for every admin.
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.label ?? `Day ${weekday}`
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

// "Friday 19:00 to 23:00, 6 riders": how a slot reads in a list or a change.
export function describeSlot(slot: ShiftSlotFieldsAdmin): string {
  const riders = slot.riderCap === 1 ? '1 rider' : `${slot.riderCap} riders`
  return `${weekdayLabel(slot.weekday)} ${minutesToClock(slot.startMinute)} to ${minutesToClock(slot.endMinute)}, ${riders}`
}
