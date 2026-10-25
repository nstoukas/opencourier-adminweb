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
