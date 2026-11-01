import { statusLabel } from '../admin-web-components/components/atoms/StatusBadge'

// Converts UPPER_SNAKE_CASE event type into Sentence case string for display.
export function humanizeEventType(type: string): string {
  if (!type) return '—'
  const formatted = type.replace(/_/g, ' ').toLowerCase()
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

// The words for a delivery status: the same ones StatusBadge shows (both read STATUS_TO_HUMAN
// through statusLabel), so the timeline and the badge above it never name a status two ways.
// An unknown value reads as words ("Some new status"), never raw caps.
export function humanizeStatus(status: string | null | undefined): string {
  if (!status) return '—'
  return statusLabel(status)
}

// Ignore status fields on failure because backend saveDeliveryEvent swaps oldStatus/newStatus on failure path.
export function describeTransition(event: {
  oldStatus: string | null
  newStatus: string | null
  transitionSuccessful: boolean
}): string {
  if (event.transitionSuccessful === false) {
    return 'No status change'
  }

  const oldHuman = humanizeStatus(event.oldStatus)
  const newHuman = humanizeStatus(event.newStatus)

  if (event.oldStatus && event.newStatus && event.oldStatus === event.newStatus) {
    return `Stayed ${oldHuman}`
  }

  return `${oldHuman} → ${newHuman}`
}

// A step that reached the server more than this long after it happened is shown as late
// (spec 0011, AC-4): one threshold for the time shown and for "Not applied".
export const LATE_STEP_THRESHOLD_MS = 60 * 1000

export type LateStep = {
  // When the step happened (the rider's tap).
  occurredAt: Date
  // When the server received it.
  arrivedAt: Date
  // Whole minutes between the two, rounded.
  minutesLater: number
}

// The tap and arrival of an event that arrived more than a minute after it happened, or null
// for every other event (including one from a backend that sends no occurredAt).
export function lateStepOf(event: { occurredAt?: Date; createdAt: Date }): LateStep | null {
  if (!event.occurredAt) return null
  const gap = event.createdAt.getTime() - event.occurredAt.getTime()
  if (gap <= LATE_STEP_THRESHOLD_MS) return null
  return {
    occurredAt: event.occurredAt,
    arrivedAt: event.createdAt,
    minutesLater: Math.round(gap / 60000),
  }
}
