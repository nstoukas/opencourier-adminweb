import { EnumDeliveryEventType, EnumDeliveryStatus } from '../../../shared-types'
import { adminEventsForStatus, courierIdForAdminEvent } from './adminEvents'

describe('adminEvents utility functions', () => {
  describe('adminEventsForStatus', () => {
    it('returns available transitions for a status and strictly filters out FAILED', () => {
      // In STATE_MACHINE, CREATED transitions are ACCEPTED, CANCELED, and FAILED.
      // Admin menus must never offer FAILED.
      const createdEvents = adminEventsForStatus(EnumDeliveryStatus.CREATED)
      expect(createdEvents).toContain(EnumDeliveryEventType.ACCEPTED)
      expect(createdEvents).toContain(EnumDeliveryEventType.CANCELED)
      expect(createdEvents).not.toContain(EnumDeliveryEventType.FAILED)
      expect(createdEvents).toEqual([EnumDeliveryEventType.ACCEPTED, EnumDeliveryEventType.CANCELED])
    })

    it('omits ACCEPTED when riders object is passed with no rider ids', () => {
      // With riders defined and neither matchedCourierId nor courierId present, ACCEPTED must be omitted
      const eventsWithUndefinedRiders = adminEventsForStatus(EnumDeliveryStatus.CREATED, {
        matchedCourierId: undefined,
        courierId: undefined,
      })
      expect(eventsWithUndefinedRiders).toEqual([EnumDeliveryEventType.CANCELED])
      expect(eventsWithUndefinedRiders).not.toContain(EnumDeliveryEventType.ACCEPTED)

      const eventsWithNullRiders = adminEventsForStatus(EnumDeliveryStatus.CREATED, {
        matchedCourierId: null,
        courierId: null,
      })
      expect(eventsWithNullRiders).toEqual([EnumDeliveryEventType.CANCELED])

      const eventsWithEmptyStringRiders = adminEventsForStatus(EnumDeliveryStatus.CREATED, {
        matchedCourierId: '',
        courierId: '',
      })
      expect(eventsWithEmptyStringRiders).toEqual([EnumDeliveryEventType.CANCELED])

      const eventsWithEmptyObject = adminEventsForStatus(EnumDeliveryStatus.CREATED, {})
      expect(eventsWithEmptyObject).toEqual([EnumDeliveryEventType.CANCELED])
    })

    it('includes ACCEPTED when riders has matchedCourierId', () => {
      const events = adminEventsForStatus(EnumDeliveryStatus.CREATED, {
        matchedCourierId: 'courier-matched-42',
        courierId: undefined,
      })
      expect(events).toContain(EnumDeliveryEventType.ACCEPTED)
      expect(events).toEqual([EnumDeliveryEventType.ACCEPTED, EnumDeliveryEventType.CANCELED])
    })

    it('includes ACCEPTED when riders has courierId fallback', () => {
      const events = adminEventsForStatus(EnumDeliveryStatus.CREATED, {
        matchedCourierId: undefined,
        courierId: 'courier-assigned-99',
      })
      expect(events).toContain(EnumDeliveryEventType.ACCEPTED)
      expect(events).toEqual([EnumDeliveryEventType.ACCEPTED, EnumDeliveryEventType.CANCELED])
    })

    it('behaves exactly as before when riders argument is omitted (includes ACCEPTED for CREATED)', () => {
      const eventsWithoutRiders = adminEventsForStatus(EnumDeliveryStatus.CREATED)
      expect(eventsWithoutRiders).toContain(EnumDeliveryEventType.ACCEPTED)
      expect(eventsWithoutRiders).toEqual([EnumDeliveryEventType.ACCEPTED, EnumDeliveryEventType.CANCELED])
    })

    it('filters out FAILED from DISPATCHED transitions', () => {
      // DISPATCHED transitions in STATE_MACHINE: ARRIVED_AT_PICKUP_LOCATION, PICKED_UP, CANCELED, FAILED
      const dispatchedEvents = adminEventsForStatus(EnumDeliveryStatus.DISPATCHED)
      expect(dispatchedEvents).toEqual([
        EnumDeliveryEventType.ARRIVED_AT_PICKUP_LOCATION,
        EnumDeliveryEventType.PICKED_UP,
        EnumDeliveryEventType.CANCELED,
      ])
      expect(dispatchedEvents).not.toContain(EnumDeliveryEventType.FAILED)
    })

    it('returns empty array when status only has FAILED transition (CANCELED status)', () => {
      // CANCELED transitions only to FAILED in STATE_MACHINE
      const canceledEvents = adminEventsForStatus(EnumDeliveryStatus.CANCELED)
      expect(canceledEvents).toEqual([])
    })

    it('returns empty array for terminal statuses with no transitions (DROPPED_OFF and FAILED)', () => {
      expect(adminEventsForStatus(EnumDeliveryStatus.DROPPED_OFF)).toEqual([])
      expect(adminEventsForStatus(EnumDeliveryStatus.FAILED)).toEqual([])
    })

    it('returns empty array safely for unknown or unexpected status strings', () => {
      expect(adminEventsForStatus('UNKNOWN_STATUS')).toEqual([])
      expect(adminEventsForStatus('')).toEqual([])
    })
  })

  describe('courierIdForAdminEvent', () => {
    const fullDelivery = {
      matchedCourierId: 'courier-matched-42',
      courierId: 'courier-assigned-99',
    }

    it('returns undefined for any event type other than ACCEPTED', () => {
      const nonAcceptedEvents = [
        EnumDeliveryEventType.DISPATCHED,
        EnumDeliveryEventType.ARRIVED_AT_PICKUP_LOCATION,
        EnumDeliveryEventType.PICKED_UP,
        EnumDeliveryEventType.ON_THE_WAY,
        EnumDeliveryEventType.ARRIVED_AT_DROPOFF_LOCATION,
        EnumDeliveryEventType.DROPPED_OFF,
        EnumDeliveryEventType.CANCELED,
      ]

      nonAcceptedEvents.forEach((eventType) => {
        expect(courierIdForAdminEvent(eventType, fullDelivery)).toBeUndefined()
      })
    })

    it('prefers matchedCourierId for ACCEPTED event when both matchedCourierId and courierId are present', () => {
      const result = courierIdForAdminEvent(EnumDeliveryEventType.ACCEPTED, fullDelivery)
      expect(result).toBe('courier-matched-42')
    })

    it('falls back to courierId for ACCEPTED event when matchedCourierId is missing or empty', () => {
      const deliveryWithoutMatched = {
        matchedCourierId: undefined,
        courierId: 'courier-assigned-99',
      }
      expect(courierIdForAdminEvent(EnumDeliveryEventType.ACCEPTED, deliveryWithoutMatched)).toBe(
        'courier-assigned-99'
      )

      const deliveryWithEmptyMatched = {
        matchedCourierId: '',
        courierId: 'courier-assigned-99',
      }
      expect(courierIdForAdminEvent(EnumDeliveryEventType.ACCEPTED, deliveryWithEmptyMatched)).toBe(
        'courier-assigned-99'
      )
    })

    it('returns undefined for ACCEPTED event when neither matchedCourierId nor courierId is present', () => {
      const deliveryWithNoCouriers = {
        matchedCourierId: undefined,
        courierId: undefined,
      }
      expect(courierIdForAdminEvent(EnumDeliveryEventType.ACCEPTED, deliveryWithNoCouriers)).toBeUndefined()

      const deliveryWithEmptyStrings = {
        matchedCourierId: '',
        courierId: '',
      }
      expect(courierIdForAdminEvent(EnumDeliveryEventType.ACCEPTED, deliveryWithEmptyStrings)).toBeUndefined()
    })
  })
})
