import {
  cancelledByText,
  wasAcceptedWhenCancelled,
  foodOutcomeText,
  CANCELLED_BY_TO_HUMAN,
} from './cancellationDisplay'

describe('cancellationDisplay utils (spec 0015, AC-5, AC-13)', () => {
  describe('CANCELLED_BY_TO_HUMAN mapping', () => {
    it('defines human readable labels for all CancelledBy enum keys', () => {
      expect(CANCELLED_BY_TO_HUMAN.COOP).toBe('The co-op')
      expect(CANCELLED_BY_TO_HUMAN.RESTAURANT).toBe('The restaurant')
      expect(CANCELLED_BY_TO_HUMAN.CUSTOMER).toBe('The customer')
    })
  })

  describe('cancelledByText helper', () => {
    it('returns em dash for null, undefined, or empty string', () => {
      expect(cancelledByText(null)).toBe('—')
      expect(cancelledByText(undefined)).toBe('—')
      expect(cancelledByText('')).toBe('—')
    })

    it('returns human-readable text for known cancellers', () => {
      expect(cancelledByText('COOP')).toBe('The co-op')
      expect(cancelledByText('RESTAURANT')).toBe('The restaurant')
      expect(cancelledByText('CUSTOMER')).toBe('The customer')
    })

    it('returns the raw string value when an unknown canceller is passed', () => {
      // Future proof: unknown server enum values read as themselves rather than undefined or crashing
      expect(cancelledByText('UNKNOWN_ACTOR')).toBe('UNKNOWN_ACTOR')
      expect(cancelledByText('DISPATCH_TEAM')).toBe('DISPATCH_TEAM')
    })
  })

  describe('wasAcceptedWhenCancelled helper', () => {
    it('returns false for null, undefined, and empty string', () => {
      expect(wasAcceptedWhenCancelled(null)).toBe(false)
      expect(wasAcceptedWhenCancelled(undefined)).toBe(false)
      expect(wasAcceptedWhenCancelled('')).toBe(false)
    })

    it('returns false for statuses before courier acceptance', () => {
      expect(wasAcceptedWhenCancelled('CREATED')).toBe(false)
      expect(wasAcceptedWhenCancelled('ASSIGNING_COURIER')).toBe(false)
    })

    it('returns true for all ongoing statuses where a rider held the delivery', () => {
      expect(wasAcceptedWhenCancelled('ACCEPTED')).toBe(true)
      expect(wasAcceptedWhenCancelled('DISPATCHED')).toBe(true)
      expect(wasAcceptedWhenCancelled('COURIER_ARRIVED_AT_PICKUP_LOCATION')).toBe(true)
      expect(wasAcceptedWhenCancelled('PICKED_UP')).toBe(true)
      expect(wasAcceptedWhenCancelled('ON_THE_WAY')).toBe(true)
      expect(wasAcceptedWhenCancelled('COURIER_ARRIVED_AT_DROPOFF_LOCATION')).toBe(true)
    })

    it('returns false for terminal or non-ongoing statuses', () => {
      expect(wasAcceptedWhenCancelled('DROPPED_OFF')).toBe(false)
      expect(wasAcceptedWhenCancelled('FULFILLED')).toBe(false)
      expect(wasAcceptedWhenCancelled('CANCELED')).toBe(false)
      expect(wasAcceptedWhenCancelled('FAILED')).toBe(false)
      expect(wasAcceptedWhenCancelled('SOMETHING_ELSE')).toBe(false)
    })
  })

  describe('foodOutcomeText helper', () => {
    it('returns before-pickup notice when cancelledFromStatus is null, undefined, or empty', () => {
      expect(foodOutcomeText(null, null)).toBe('No food to return (cancelled before pickup)')
      expect(foodOutcomeText(undefined, undefined)).toBe('No food to return (cancelled before pickup)')
      expect(foodOutcomeText('', 'RETURNED')).toBe('No food to return (cancelled before pickup)')
    })

    it('returns before-pickup notice for any status before pickup, regardless of foodOutcome', () => {
      const prePickupStatuses = [
        'CREATED',
        'ASSIGNING_COURIER',
        'ACCEPTED',
        'DISPATCHED',
        'COURIER_ARRIVED_AT_PICKUP_LOCATION',
      ]

      for (const status of prePickupStatuses) {
        expect(foodOutcomeText(status, null)).toBe('No food to return (cancelled before pickup)')
        expect(foodOutcomeText(status, 'RETURNED')).toBe('No food to return (cancelled before pickup)')
        expect(foodOutcomeText(status, 'NOT_RETURNED')).toBe('No food to return (cancelled before pickup)')
      }
    })

    it('returns "Returned to the restaurant" when foodOutcome is RETURNED after pickup', () => {
      const pickedUpStatuses = ['PICKED_UP', 'ON_THE_WAY', 'COURIER_ARRIVED_AT_DROPOFF_LOCATION']

      for (const status of pickedUpStatuses) {
        expect(foodOutcomeText(status, 'RETURNED')).toBe('Returned to the restaurant')
      }
    })

    it('returns "Not returned (see the rider’s note in the events)" when foodOutcome is NOT_RETURNED after pickup', () => {
      const pickedUpStatuses = ['PICKED_UP', 'ON_THE_WAY', 'COURIER_ARRIVED_AT_DROPOFF_LOCATION']

      for (const status of pickedUpStatuses) {
        expect(foodOutcomeText(status, 'NOT_RETURNED')).toBe(
          'Not returned (see the rider’s note in the events)'
        )
      }
    })

    it('returns "Not recorded yet by the rider" when cancelled after pickup but foodOutcome is null, undefined, or other', () => {
      const pickedUpStatuses = ['PICKED_UP', 'ON_THE_WAY', 'COURIER_ARRIVED_AT_DROPOFF_LOCATION']

      for (const status of pickedUpStatuses) {
        expect(foodOutcomeText(status, null)).toBe('Not recorded yet by the rider')
        expect(foodOutcomeText(status, undefined)).toBe('Not recorded yet by the rider')
        expect(foodOutcomeText(status, 'OTHER_STATUS')).toBe('Not recorded yet by the rider')
      }
    })
  })
})
