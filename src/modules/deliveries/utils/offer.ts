import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryStatus } from '../../../shared-types'

// The admin Offer column and the delivery page's offer line (spec 0002, AC-11). It reads only
// what the backend already decided to show: the rider holding the open offer right now and
// since when, or since when nobody has been free. Nothing here counts or remembers offers per
// rider (value 5); a delivery that is no longer looking for a rider shows nothing.

// `Pick<T, 'a' | 'b'>` is "the type T, keeping only fields a and b", so a caller (or a test)
// can pass any object that has these fields, not a whole delivery.
export type DeliveryOfferFields = Pick<
  DeliveryAdminDto,
  'status' | 'courierId' | 'matchedCourierId' | 'matchedCourierName' | 'offeredAt' | 'waitingForCourierSince'
>

// A union of two object shapes told apart by `kind`: after `if (offer.kind === 'offered')`
// TypeScript knows `riderName` exists, and in the other branch that `since` is never null.
export type DeliveryOffer =
  | { kind: 'offered'; riderName: string; since: Date | null }
  | { kind: 'waiting'; since: Date }

export function deliveryOffer(delivery: DeliveryOfferFields): DeliveryOffer | null {
  // The same test the backend uses: still looking for a rider and nobody has accepted.
  const isLooking = delivery.status === EnumDeliveryStatus.ASSIGNING_COURIER && !delivery.courierId
  if (!isLooking) return null
  if (delivery.matchedCourierId) {
    return {
      kind: 'offered',
      // The backend leaves the name null only if the rider's record is gone.
      riderName: delivery.matchedCourierName || 'Unknown rider',
      // null for an offer made before offers were timed: shown without a time.
      since: delivery.offeredAt ?? null,
    }
  }
  if (delivery.waitingForCourierSince) {
    return { kind: 'waiting', since: delivery.waitingForCourierSince }
  }
  // Looking, but matching has not reported "no rider free" yet: nothing to say.
  return null
}

// "Ana Papadopoulou" becomes "Ana P.", the spec's short form for a narrow table column.
// A one word name stays as it is.
export function shortRiderName(fullName: string): string {
  const words = fullName.trim().split(/\s+/)
  const first = words[0]
  const last = words[words.length - 1]
  // Reading an array by index can be undefined as far as TypeScript knows, so check both.
  if (words.length < 2 || !first || !last) return fullName.trim()
  return `${first} ${last.charAt(0)}.`
}

// Whole minutes from `since` to `now`, rounded down. Under a minute reads "under 1 min"
// rather than "0 min", and a `since` slightly ahead of this browser's clock reads the same.
export function minutesWaiting(since: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - since.getTime()) / 60_000)
  return minutes < 1 ? 'under 1 min' : `${minutes} min`
}

// The text itself: "Ana P., 2 min", "No rider free, 4 min", or null for an empty cell.
// `nameStyle` picks the short name for the list and the full name for the delivery page.
export function describeOffer(
  delivery: DeliveryOfferFields,
  now: Date,
  nameStyle: 'short' | 'full' = 'short'
): string | null {
  const offer = deliveryOffer(delivery)
  if (!offer) return null
  if (offer.kind === 'waiting') return `No rider free, ${minutesWaiting(offer.since, now)}`
  const name = nameStyle === 'short' ? shortRiderName(offer.riderName) : offer.riderName
  return offer.since ? `${name}, ${minutesWaiting(offer.since, now)}` : name
}
