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
  // Typed wider than DeliveryAdminDto on purpose: the SDK says these are `string | null`,
  // but a key the backend leaves out arrives as undefined, so the type admits that too.
  delivery: { matchedCourierId?: string | null; courierId?: string | null }
): string | undefined {
  if (eventType !== EnumDeliveryEventType.ACCEPTED) return undefined
  // `||` rather than `??`, so an empty string counts as no rider too.
  return delivery.matchedCourierId || delivery.courierId || undefined
}
