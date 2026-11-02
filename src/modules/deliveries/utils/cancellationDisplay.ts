// Spec 0015: the words the admin reads about a cancelled delivery. Private copies of the backend's
// EnumCancelledBy and EnumFoodOutcome values, like the other enums in src/shared-types.

export type CancelledBy = 'RESTAURANT' | 'CUSTOMER' | 'COOP'

export const CANCELLED_BY_TO_HUMAN: Record<CancelledBy, string> = {
  COOP: 'The co-op',
  RESTAURANT: 'The restaurant',
  CUSTOMER: 'The customer',
}

// The statuses in which the rider had the food when the job was cancelled: it goes back, and the
// rider records what happened to it.
const PICKED_UP_STATUSES = ['PICKED_UP', 'ON_THE_WAY', 'COURIER_ARRIVED_AT_DROPOFF_LOCATION']

// A rider had accepted the job: the cancellation pays them (and charges a restaurant that asked).
const ONGOING_STATUSES = [
  'ACCEPTED',
  'DISPATCHED',
  'COURIER_ARRIVED_AT_PICKUP_LOCATION',
  ...PICKED_UP_STATUSES,
]

export function cancelledByText(value: string | null | undefined): string {
  if (!value) return '—'
  // `in` checks the key exists, so an unknown value reads as itself rather than undefined.
  return value in CANCELLED_BY_TO_HUMAN ? CANCELLED_BY_TO_HUMAN[value as CancelledBy] : value
}

export function wasAcceptedWhenCancelled(cancelledFromStatus: string | null | undefined): boolean {
  return !!cancelledFromStatus && ONGOING_STATUSES.includes(cancelledFromStatus)
}

// What happened to the food, in words: only a job cancelled after pickup has food to return.
export function foodOutcomeText(
  cancelledFromStatus: string | null | undefined,
  foodOutcome: string | null | undefined
): string {
  if (!cancelledFromStatus || !PICKED_UP_STATUSES.includes(cancelledFromStatus)) {
    return 'No food to return (cancelled before pickup)'
  }
  if (foodOutcome === 'RETURNED') return 'Returned to the restaurant'
  if (foodOutcome === 'NOT_RETURNED') return 'Not returned (see the rider’s note in the events)'
  return 'Not recorded yet by the rider'
}
