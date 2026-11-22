import type { TFunction } from 'i18next'

// Spec 0015: the words the admin reads about a cancelled delivery. Private copies of the backend's
// EnumCancelledBy and EnumFoodOutcome values, like the other enums in src/shared-types.
// The words themselves are in the language files (`deliveries.cancelledBy.*`, spec 0054).

export type CancelledBy = 'RESTAURANT' | 'CUSTOMER' | 'COOP'

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

// Who asked for the cancellation, in the reader's language; an unknown value reads as itself.
export function cancelledByText(value: string | null | undefined, t: TFunction): string {
  if (!value) return '—'
  // defaultValue is what i18next returns when the key does not exist.
  return t(`deliveries.cancelledBy.${value}`, { defaultValue: value })
}

export function wasAcceptedWhenCancelled(cancelledFromStatus: string | null | undefined): boolean {
  return !!cancelledFromStatus && ONGOING_STATUSES.includes(cancelledFromStatus)
}

// What happened to the food, in words: only a job cancelled after pickup has food to return.
export function foodOutcomeText(
  cancelledFromStatus: string | null | undefined,
  foodOutcome: string | null | undefined,
  t: TFunction
): string {
  if (!cancelledFromStatus || !PICKED_UP_STATUSES.includes(cancelledFromStatus)) {
    return t('deliveries.cancellation.food.noFood')
  }
  if (foodOutcome === 'RETURNED') return t('deliveries.cancellation.food.returned')
  if (foodOutcome === 'NOT_RETURNED') return t('deliveries.cancellation.food.notReturned')
  return t('deliveries.cancellation.food.notRecorded')
}
