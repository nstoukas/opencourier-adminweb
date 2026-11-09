import {
  humanizeEventType,
  humanizeStatus,
  describeTransition,
  lateStepOf,
  LATE_STEP_THRESHOLD_MS,
} from './deliveryEventDisplay'
import { EnumDeliveryStatus } from '../shared-types/delivery-events'
import { STATUS_TO_HUMAN } from '../shared-types/state-machine'

describe('deliveryEventDisplay utils', () => {
  it('humanizes UPPER_SNAKE_CASE event types to sentence case', () => {
    expect(humanizeEventType('ARRIVED_AT_PICKUP_LOCATION')).toBe('Arrived at pickup location')
    expect(humanizeEventType('REASSIGNED')).toBe('Reassigned')
    expect(humanizeEventType('COURIER_PAID_FOR_CANCELLATION')).toBe('Courier paid for cancellation')
    expect(humanizeEventType('FOOD_RETURNED')).toBe('Food returned')
    expect(humanizeEventType('FOOD_NOT_RETURNED')).toBe('Food not returned')
    expect(humanizeEventType('HANDED_BACK')).toBe('Handed back')
    expect(humanizeEventType('DROPOFF_POINT_CORRECTED')).toBe('Dropoff point corrected')
    expect(humanizeEventType('READY_DELAYED')).toBe('Ready delayed')
    expect(humanizeEventType('FOOD_READY')).toBe('Food ready')
    expect(humanizeEventType('PRODUCT_REPORTED')).toBe('Product reported')
    expect(humanizeEventType('PRODUCT_REPORT_RESOLVED')).toBe('Product report resolved')
    expect(humanizeEventType('')).toBe('—')
  })

  it('humanizes status codes using STATUS_TO_HUMAN or falls back to words or em dash', () => {
    expect(humanizeStatus('ASSIGNING_COURIER')).toBe('Assigning Courier')
    expect(humanizeStatus(null)).toBe('—')
    expect(humanizeStatus(undefined)).toBe('—')
    // Unknown values now read as words ('Something new'), never raw caps
    expect(humanizeStatus('SOMETHING_NEW')).toBe('Something new')
    expect(humanizeStatus('ANOTHER_UNKNOWN_STATUS')).toBe('Another unknown status')
  })

  it('ensures humanizeStatus(s) equals STATUS_TO_HUMAN[s] for every EnumDeliveryStatus value', () => {
    for (const status of Object.values(EnumDeliveryStatus)) {
      expect(humanizeStatus(status)).toBe(STATUS_TO_HUMAN[status])
    }
  })

  it('describes status transitions for successful and stayed transitions', () => {
    expect(
      describeTransition({
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ACCEPTED',
        transitionSuccessful: true,
      })
    ).toBe('Assigning Courier → Accepted')

    expect(
      describeTransition({
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
      })
    ).toBe('Stayed Assigning Courier')

    expect(
      describeTransition({
        oldStatus: null,
        newStatus: 'ACCEPTED',
        transitionSuccessful: true,
      })
    ).toBe('— → Accepted')
  })

  it('ignores status fields on failure to prevent rendering misleading status arrows (swap guard)', () => {
    // Backend saveDeliveryEvent swaps oldStatus/newStatus on failure path (real row cmq73ce1z000bij95k4om7wut)
    expect(
      describeTransition({
        oldStatus: 'DISPATCHED',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: false,
      })
    ).toBe('No status change')
  })

  describe('lateStepOf threshold & rounding (spec 0011, AC-4)', () => {
    it('returns null when occurredAt is undefined', () => {
      const event = { createdAt: new Date('2026-11-01T12:00:00Z') }
      expect(lateStepOf(event)).toBeNull()
    })

    it('returns null when occurredAt is exactly at threshold (60 s) or less than threshold', () => {
      const createdAt = new Date('2026-11-01T12:01:00.000Z')

      // Exactly 60 s gap: not late
      const exactly60s = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() - LATE_STEP_THRESHOLD_MS),
      }
      expect(lateStepOf(exactly60s)).toBeNull()

      // 30 s gap: not late
      const thirtySec = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() - 30_000),
      }
      expect(lateStepOf(thirtySec)).toBeNull()

      // 0 s gap (same moment): not late
      const sameMoment = { createdAt, occurredAt: createdAt }
      expect(lateStepOf(sameMoment)).toBeNull()

      // occurredAt in the future relative to createdAt: not late
      const future = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() + 10_000),
      }
      expect(lateStepOf(future)).toBeNull()
    })

    it('returns LateStep when occurredAt is more than 60 s before createdAt', () => {
      const createdAt = new Date('2026-11-01T12:05:00.000Z')

      // 61 seconds gap (> 60 s threshold)
      const lateEvent61s = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() - 61_000),
      }
      const late61 = lateStepOf(lateEvent61s)
      expect(late61).not.toBeNull()
      expect(late61?.minutesLater).toBe(1)
      expect(late61?.occurredAt.toISOString()).toBe('2026-11-01T12:03:59.000Z')
      expect(late61?.arrivedAt.toISOString()).toBe('2026-11-01T12:05:00.000Z')

      // 120 seconds gap (2 min)
      const lateEvent2m = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() - 120_000),
      }
      const late2m = lateStepOf(lateEvent2m)
      expect(late2m?.minutesLater).toBe(2)

      // 150 seconds gap (2.5 min) rounds to 3 min
      const lateEvent150s = {
        createdAt,
        occurredAt: new Date(createdAt.getTime() - 150_000),
      }
      const late150s = lateStepOf(lateEvent150s)
      expect(late150s?.minutesLater).toBe(3)
    })
  })
})
