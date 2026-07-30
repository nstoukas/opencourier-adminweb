import { humanizeEventType, humanizeStatus, describeTransition } from './deliveryEventDisplay'

describe('deliveryEventDisplay utils', () => {
  it('humanizes UPPER_SNAKE_CASE event types to sentence case', () => {
    expect(humanizeEventType('ARRIVED_AT_PICKUP_LOCATION')).toBe('Arrived at pickup location')
    expect(humanizeEventType('REASSIGNED')).toBe('Reassigned')
    expect(humanizeEventType('')).toBe('—')
  })

  it('humanizes status codes using STATUS_TO_HUMAN or falls back to raw string or em dash', () => {
    expect(humanizeStatus('ASSIGNING_COURIER')).toBe('Assigning Courier')
    expect(humanizeStatus(null)).toBe('—')
    expect(humanizeStatus(undefined)).toBe('—')
    expect(humanizeStatus('SOMETHING_NEW')).toBe('SOMETHING_NEW')
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
})
