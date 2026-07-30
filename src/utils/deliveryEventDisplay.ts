import { STATUS_TO_HUMAN } from '../shared-types/state-machine'

// Converts UPPER_SNAKE_CASE event type into Sentence case string for display.
export function humanizeEventType(type: string): string {
  if (!type) return '—'
  const formatted = type.replace(/_/g, ' ').toLowerCase()
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

// Looks up a status string in STATUS_TO_HUMAN map or falls back to raw status string.
export function humanizeStatus(status: string | null | undefined): string {
  if (!status) return '—'
  // Index record as string to safely handle status enum values or arbitrary strings.
  return (STATUS_TO_HUMAN as Record<string, string>)[status] ?? status
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
