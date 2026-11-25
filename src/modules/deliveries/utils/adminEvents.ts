import { EnumDeliveryEventType, transitionsForStatus } from '../../../shared-types'

// Row 176: the events the backend's admin path acts on, one `case` each in `submitDeliveryEvent`
// (opencourier-backend/src/domains/delivery/delivery.domain.service.ts). Any other event it logs as
// "Unknown status" and answers as if it worked, so the menu offers only these. The rider's own steps
// (arrived at pickup, on the way, arrived at drop off) stay the rider's. CONFIRMED is never in
// STATE_MACHINE and FAILED is in DISALLOWED_EVENTS, so neither is offered; they are listed to mirror the backend.
export const ADMIN_PATH_EVENTS: EnumDeliveryEventType[] = [
  EnumDeliveryEventType.CONFIRMED,
  EnumDeliveryEventType.ACCEPTED,
  EnumDeliveryEventType.DISPATCHED,
  EnumDeliveryEventType.REJECTED,
  EnumDeliveryEventType.PICKED_UP,
  EnumDeliveryEventType.CANCELED,
  EnumDeliveryEventType.DROPPED_OFF,
  EnumDeliveryEventType.FAILED,
]

// Events the admin menus never offer, even where the state machine allows them.
// FAILED stays out, as it always has on the delivery page.
const DISALLOWED_EVENTS: EnumDeliveryEventType[] = [EnumDeliveryEventType.FAILED]

/**
 * The events an admin may submit by hand for a delivery in `status`.
 * Shared by the delivery page's "Trigger event" menu and the status page,
 * so the two admin paths cannot drift apart. When the delivery's rider ids are
 * passed, ACCEPTED is left out while there is no rider to accept it for,
 * because the backend would refuse it.
 */
export function adminEventsForStatus(
  status: string,
  riders?: { matchedCourierId?: string | null; courierId?: string | null }
): EnumDeliveryEventType[] {
  // Object.keys always returns string[]; the keys of the transitions record are event types.
  const events = Object.keys(transitionsForStatus(status)) as EnumDeliveryEventType[]
  return events.filter(
    (eventType) =>
      ADMIN_PATH_EVENTS.includes(eventType) &&
      !DISALLOWED_EVENTS.includes(eventType) &&
      !(riders && eventType === EnumDeliveryEventType.ACCEPTED && courierIdForAdminEvent(eventType, riders) === undefined)
  )
}

/**
 * The courierId to send with an admin event. The backend refuses an ACCEPTED event
 * without one, so ACCEPTED goes to the rider the delivery is offered to, or else the
 * rider already on it. Every other event is sent without a courierId.
 */
export function courierIdForAdminEvent(
  eventType: EnumDeliveryEventType,
  // Typed wider than DeliveryAdminDto on purpose: the SDK turns a missing `matchedCourierId`
  // into null but passes `courierId` through as sent, so it can arrive undefined; the type admits both.
  delivery: { matchedCourierId?: string | null; courierId?: string | null }
): string | undefined {
  if (eventType !== EnumDeliveryEventType.ACCEPTED) return undefined
  // `||` rather than `??`, so an empty string counts as no rider too.
  return delivery.matchedCourierId || delivery.courierId || undefined
}
