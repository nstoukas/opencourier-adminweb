import type { TFunction } from 'i18next'
import { statusLabel } from '../admin-web-components/components/atoms/StatusBadge'

// Converts UPPER_SNAKE_CASE event type into Sentence case string for display. The English fallback
// for a type the language files do not name yet (eventTypeLabel below), so it still reads as words.
export function humanizeEventType(type: string): string {
  if (!type) return '—'
  const formatted = type.replace(/_/g, ' ').toLowerCase()
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

// An event type in the reader's language (spec 0054): `deliveries.eventType.<TYPE>`, or the English
// words above for a type the backend added after this copy. TFunction is the type of i18next's `t`.
export function eventTypeLabel(t: TFunction, type: string): string {
  if (!type) return '—'
  // defaultValue is what i18next returns when the key does not exist.
  return t(`deliveries.eventType.${type}`, { defaultValue: humanizeEventType(type) })
}

// The words for a delivery status: the same ones StatusBadge shows (both read STATUS_TO_HUMAN
// through statusLabel), so the timeline and the badge above it never name a status two ways.
// An unknown value reads as words ("Some new status"), never raw caps.
export function humanizeStatus(status: string | null | undefined): string {
  if (!status) return '—'
  return statusLabel(status)
}

// A delivery status in the reader's language, from the same `enums.deliveryStatus` keys the badge
// reads; a status this copy does not know yet reads as the badge's English words.
export function statusText(t: TFunction, status: string | null | undefined): string {
  if (!status) return '—'
  return t(`enums.deliveryStatus.${status}`, { defaultValue: humanizeStatus(status) })
}

// Ignore status fields on failure because backend saveDeliveryEvent swaps oldStatus/newStatus on failure path.
// Takes `t` because the words are the reader's language (spec 0054).
export function describeTransition(
  event: {
    oldStatus: string | null
    newStatus: string | null
    transitionSuccessful: boolean
  },
  t: TFunction
): string {
  if (event.transitionSuccessful === false) {
    return t('deliveries.transition.noChange')
  }
  // A record beside the delivery, such as a review request (spec 0038), carries no status at all.
  if (!event.oldStatus && !event.newStatus) {
    return t('deliveries.transition.noChange')
  }

  const oldHuman = statusText(t, event.oldStatus)
  const newHuman = statusText(t, event.newStatus)

  if (event.oldStatus && event.newStatus && event.oldStatus === event.newStatus) {
    return t('deliveries.transition.stayed', { status: oldHuman })
  }

  return t('deliveries.transition.changed', { from: oldHuman, to: newHuman })
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
