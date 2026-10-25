import type { DeliveryAdminDto } from '../../../backend-admin-sdk'
import { EnumDeliveryEventType, transitionsForStatus } from '../../../shared-types'

// Events the admin menus never offer, even where the state machine allows them.
// FAILED stays out, as it always has on the delivery page.
const DISALLOWED_EVENTS: EnumDeliveryEventType[] = [EnumDeliveryEventType.FAILED]

/**
 * The events an admin may submit by hand for a delivery in `status`.
 * Shared by the delivery page's "Trigger event" menu and the status page,
 * so the two admin paths cannot drift apart.
 */
export function adminEventsForStatus(status: string): EnumDeliveryEventType[] {
  // Object.keys always returns string[]; the keys of the transitions record are event types.
  const events = Object.keys(transitionsForStatus(status)) as EnumDeliveryEventType[]
  return events.filter((eventType) => !DISALLOWED_EVENTS.includes(eventType))
}

/**
 * The courierId to send with an admin event. The backend refuses an ACCEPTED event
 * without one, so ACCEPTED goes to the rider the delivery is offered to, or else the
 * rider already on it. Every other event is sent without a courierId.
 */
export function courierIdForAdminEvent(
  eventType: EnumDeliveryEventType,
  // Pick<T, K> is T cut down to the listed fields, so callers can pass any object that has them.
  delivery: Pick<DeliveryAdminDto, 'matchedCourierId' | 'courierId'>
): string | undefined {
  if (eventType !== EnumDeliveryEventType.ACCEPTED) return undefined
  // `||` rather than `??`: the SDK can hand back '' or undefined here despite its types.
  return delivery.matchedCourierId || delivery.courierId || undefined
}
