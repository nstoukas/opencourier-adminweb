import React from 'react'
import { render, screen } from '@testing-library/react'
import { DeliveryEventTimeline } from './DeliveryEventTimeline'
import { useGetDeliveryEventsQuery } from '../../../api/deliveriesApi'
import type { DeliveryEventAdminDto } from '../../../backend-admin-sdk'

jest.mock('../../../api/deliveriesApi', () => ({
  useGetDeliveryEventsQuery: jest.fn(),
}))

const mockUseGetDeliveryEventsQuery = useGetDeliveryEventsQuery as jest.Mock

const sampleEvents: DeliveryEventAdminDto[] = [
  {
    id: 'e1',
    type: 'CREATED',
    actor: 'PARTNER',
    eventSource: 'PARTNER_APP',
    oldStatus: null,
    newStatus: 'CREATED',
    transitionSuccessful: true,
    message: 'Delivery created',
    createdAt: new Date('2026-07-30T10:00:00Z'),
  },
  {
    id: 'e2',
    type: 'CONFIRMED',
    actor: 'ADMIN',
    eventSource: 'OPENCOURIER',
    oldStatus: 'ASSIGNING_COURIER',
    newStatus: 'ACCEPTED',
    transitionSuccessful: true,
    message: null,
    createdAt: new Date('2026-07-30T10:05:00Z'),
  },
  {
    id: 'e3',
    type: 'DISPATCHED',
    actor: 'ADMIN',
    eventSource: 'OPENCOURIER',
    oldStatus: 'DISPATCHED',
    newStatus: 'ASSIGNING_COURIER',
    transitionSuccessful: false,
    message: 'Courier ID is required for dispatching',
    createdAt: new Date('2026-07-30T10:10:00Z'),
  },
  {
    id: 'e4',
    type: 'REJECTED',
    actor: 'COURIER',
    eventSource: 'OPENCOURIER',
    oldStatus: 'ASSIGNING_COURIER',
    newStatus: 'ASSIGNING_COURIER',
    transitionSuccessful: false,
    message: 'Courier declined',
    createdAt: new Date('2026-07-30T10:15:00Z'),
  },
  {
    id: 'e5',
    type: 'REASSIGNED',
    actor: 'ADMIN',
    eventSource: 'OPENCOURIER',
    oldStatus: 'DISPATCHED',
    newStatus: 'ASSIGNING_COURIER',
    transitionSuccessful: true,
    message: 'payout policy FULL_COMPENSATION awards 10185 USD (cents) to the dropped courier: Moped broke down',
    createdAt: new Date('2026-07-30T10:20:00Z'),
  },
]

describe('DeliveryEventTimeline component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseGetDeliveryEventsQuery.mockReturnValue({
      data: sampleEvents,
      isLoading: false,
      isError: false,
      error: null,
    })
  })

  it('renders card title "What happened"', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)
    expect(screen.getByText('What happened')).toBeInTheDocument()
  })

  it('renders all event headlines humanized in sentence case', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Dispatched')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Reassigned')).toBeInTheDocument()
  })

  it('displays failed events with "Did not take effect" badge for non-late failed transitions', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(screen.getByText('Courier ID is required for dispatching')).toBeInTheDocument()

    // Exactly 2 failed events in the fixture, neither is late
    const failedBadges = screen.getAllByText('Did not take effect')
    expect(failedBadges).toHaveLength(2)
    expect(screen.queryByText(/Not applied: the delivery had already changed/)).toBeNull()
  })

  it('styles failed events with destructive container class alongside the badge', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    const failedMessage = screen.getByText('Courier ID is required for dispatching')
    const rowContainer = failedMessage.closest('[data-testid="delivery-event-row"]')

    expect(rowContainer).not.toBeNull()
    expect(rowContainer?.className).toContain('border-destructive/40 bg-destructive/5')
    expect(rowContainer).toHaveTextContent('Did not take effect')
  })

  it('renders every event without filtering any out', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    const rows = screen.getAllByTestId('delivery-event-row')
    expect(rows).toHaveLength(5)
  })

  it('renders status transitions correctly and displays "No status change" for failed events', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    // Successful transition e2
    expect(screen.getByText('Assigning Courier → Accepted')).toBeInTheDocument()

    // Failed transition e3: renders 'No status change' and never a misleading arrow
    expect(screen.getAllByText('No status change')).toHaveLength(2)

    const failedRow = screen.getByText('Courier ID is required for dispatching').closest('[data-testid="delivery-event-row"]')
    expect(failedRow?.textContent).not.toContain('Dispatched →')
    expect(failedRow?.textContent).not.toContain('→ Dispatched')
  })

  it('renders verbatim message text including embedded payout amounts', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(
      screen.getByText(/payout policy FULL_COMPENSATION awards 10185 USD \(cents\)/)
    ).toBeInTheDocument()
  })

  it('renders events in oldest-first order as received', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    const rows = screen.getAllByTestId('delivery-event-row')
    expect(rows[0]).toHaveTextContent('Created')
    expect(rows[4]).toHaveTextContent('Reassigned')
  })

  it('handles loading, error, and empty states cleanly with distinct messages', () => {
    // Loading state
    mockUseGetDeliveryEventsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    })
    const { rerender } = render(<DeliveryEventTimeline deliveryId="d100" />)
    expect(screen.getByText('Loading delivery events.')).toBeInTheDocument()

    // Error state
    mockUseGetDeliveryEventsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { status: 500 },
    })
    rerender(<DeliveryEventTimeline deliveryId="d100" />)
    expect(screen.getByText('Could not load the event history.')).toBeInTheDocument()

    // Empty array state
    mockUseGetDeliveryEventsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    })
    rerender(<DeliveryEventTimeline deliveryId="d100" />)
    expect(screen.getByText('No DeliveryEvents recorded for this Delivery.')).toBeInTheDocument()

    // Assert error and empty state texts are strictly different
    expect('Could not load the event history.').not.toEqual(
      'No DeliveryEvents recorded for this Delivery.'
    )
  })

  it('includes honest copy footnote and avoids claiming to be a complete record (spec 0011, AC-4)', () => {
    const { container } = render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(
      screen.getByText(
        /Recorded DeliveryEvents, in the order the server received them\. A step a rider sent late shows the time it happened, and when it arrived\. An event the state machine rejects outright is not written, except a rider's late step, which is kept as not applied\./
      )
    ).toBeInTheDocument()

    expect(container.textContent).not.toMatch(/complete record/i)
  })

  describe('Tap time & late event handling (spec 0011, AC-4)', () => {
    it('shows occurredAt time and "arrived HH:mm, N min later" for same-day late event', () => {
      // Event happened at 12:00:00Z and was received 2 minutes later at 12:02:00Z
      const lateEvent: DeliveryEventAdminDto = {
        id: 'ev-late-same-day',
        type: 'DROPPED_OFF',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ON_THE_WAY',
        newStatus: 'DELIVERED',
        transitionSuccessful: true,
        message: 'Dropped off order',
        createdAt: new Date('2026-10-30T12:02:00Z'),
        occurredAt: new Date('2026-10-30T12:00:00Z'),
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [lateEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      // Shows occurredAt time, not createdAt
      const row = screen.getByTestId('delivery-event-row')
      const { formatDate } = require('../../../ui-shared-utils')
      expect(row).toHaveTextContent(formatDate(lateEvent.occurredAt))
      expect(row.textContent).not.toContain(formatDate(lateEvent.createdAt))
      // Must contain late step note with arrived HH:mm and N min later
      const lateStepNote = screen.getByTestId('late-step')
      expect(lateStepNote).toHaveTextContent(/arrived \d{2}:\d{2}, 2 min later/)
      expect(row).toHaveTextContent('Dropped off')
    })

    it('shows full date when arrival occurred on another calendar day', () => {
      // Event tapped at 21:59:00Z (23:59 local in UTC+2) on Oct 30,
      // arrived at 22:01:00Z (00:01 local in UTC+2) on Oct 31 (2 min later)
      const crossDayLateEvent: DeliveryEventAdminDto = {
        id: 'ev-cross-day',
        type: 'DROPPED_OFF',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ON_THE_WAY',
        newStatus: 'DELIVERED',
        transitionSuccessful: true,
        message: 'Late arrival cross day',
        createdAt: new Date('2026-10-30T22:01:00Z'),
        occurredAt: new Date('2026-10-30T21:59:00Z'),
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [crossDayLateEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      const lateStepNote = screen.getByTestId('late-step')
      // When on another day, the arrival note includes the full date and "2 min later"
      expect(lateStepNote).toHaveTextContent(/arrived \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}, 2 min later/)
    })

    it('displays "Not applied: the delivery had already changed" for a failed late event with empty newStatus', () => {
      const failedLateEvent: DeliveryEventAdminDto = {
        id: 'ev-failed-late',
        type: 'DROPPED_OFF',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ON_THE_WAY',
        newStatus: null, // empty newStatus for no transition path
        transitionSuccessful: false,
        message: 'Order already canceled by dispatcher',
        createdAt: new Date('2026-10-30T12:05:00Z'),
        occurredAt: new Date('2026-10-30T12:00:00Z'), // 5 min earlier (> 60 s)
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [failedLateEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(screen.getByText('Not applied: the delivery had already changed')).toBeInTheDocument()
      expect(screen.queryByText('Did not take effect')).toBeNull()
    })

    it('pins Fix 2: a failed late event WITH a newStatus shows "Did not take effect", not "Not applied"', () => {
      const failedLateEventWithStatus: DeliveryEventAdminDto = {
        id: 'ev-failed-with-status',
        type: 'DROPPED_OFF',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ON_THE_WAY',
        newStatus: 'DROPPED_OFF', // has newStatus (e.g. backend catch path)
        transitionSuccessful: false,
        message: 'Database connection failed during state update',
        createdAt: new Date('2026-10-30T12:05:00Z'),
        occurredAt: new Date('2026-10-30T12:00:00Z'), // 5 min earlier (> 60 s)
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [failedLateEventWithStatus],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      // Must show "Did not take effect", NOT "Not applied: the delivery had already changed"
      expect(screen.getByText('Did not take effect')).toBeInTheDocument()
      expect(screen.queryByText(/Not applied/)).toBeNull()
      expect(screen.getByText('Database connection failed during state update')).toBeInTheDocument()
    })

    it('pins Fix 7: compares same day by calendar day (cross midnight shows arrival date, within same day shows only time) and verifies calendar day comparison', () => {
      const toDateStringSpy = jest.spyOn(Date.prototype, 'toDateString')

      // Case A: Within same calendar day (e.g. 14:00 to 14:05 on same day) -> shows only time
      const sameDayEvent: DeliveryEventAdminDto = {
        id: 'ev-same-day-cal',
        type: 'DROPPED_OFF',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ON_THE_WAY',
        newStatus: 'DROPPED_OFF',
        transitionSuccessful: true,
        message: null,
        createdAt: new Date('2026-10-30T14:05:00'),
        occurredAt: new Date('2026-10-30T14:00:00'),
      }

      // Case B: Cross midnight (e.g. 23:58 on Oct 30 to 00:03 on Oct 31, 5 min later) -> shows arrival date
      const crossMidnightEvent: DeliveryEventAdminDto = {
        id: 'ev-cross-midnight-cal',
        type: 'PICKED_UP',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ACCEPTED',
        newStatus: 'PICKED_UP',
        transitionSuccessful: true,
        message: null,
        createdAt: new Date('2026-10-31T00:03:00'),
        occurredAt: new Date('2026-10-30T23:58:00'),
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [sameDayEvent, crossMidnightEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      // Calendar day comparison method must be invoked (not string slicing)
      expect(toDateStringSpy).toHaveBeenCalled()

      const lateNotes = screen.getAllByTestId('late-step')
      expect(lateNotes).toHaveLength(2)

      const note0 = lateNotes[0] as HTMLElement
      const note1 = lateNotes[1] as HTMLElement

      // Same day event note: only time (no slash in date)
      expect(note0).toHaveTextContent(/arrived \d{2}:\d{2}, 5 min later/)
      expect(note0.textContent).not.toMatch(/\d{2}\/\d{2}\/\d{4}/)

      // Cross midnight event note: includes full arrival date DD/MM/YYYY
      expect(note1).toHaveTextContent(/arrived \d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}, 5 min later/)

      toDateStringSpy.mockRestore()
    })

    it('shows createdAt without late note when event has no occurredAt or gap is exactly 60 seconds', () => {
      const normalEvent: DeliveryEventAdminDto = {
        id: 'ev-normal',
        type: 'ACCEPTED',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ACCEPTED',
        transitionSuccessful: true,
        message: null,
        createdAt: new Date('2026-10-30T12:00:00Z'),
      }

      const exactlySixtySecEvent: DeliveryEventAdminDto = {
        id: 'ev-sixty-sec',
        type: 'ARRIVED_AT_PICKUP_LOCATION',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ACCEPTED',
        newStatus: 'COURIER_ARRIVED_AT_PICKUP_LOCATION',
        transitionSuccessful: true,
        message: null,
        createdAt: new Date('2026-10-30T12:01:00Z'),
        occurredAt: new Date('2026-10-30T12:00:00Z'), // exactly 60 s gap
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [normalEvent, exactlySixtySecEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(screen.queryByTestId('late-step')).toBeNull()
      expect(screen.queryByText(/later/)).toBeNull()
    })
  })

  describe('Actor, source, and rider formatting in words (spec 0002, AC-11)', () => {
    it('shows actor and source in words (e.g. "System · OpenCourier"), never raw enum text', () => {
      const systemEvent: DeliveryEventAdminDto = {
        id: 'e-sys',
        type: 'OFFERED',
        actor: 'SYSTEM',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: 'Delivery offered',
        createdAt: new Date('2026-10-26T10:00:00Z'),
        courierId: 'c1',
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [systemEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      const { container } = render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(screen.getByText('System · OpenCourier')).toBeInTheDocument()
      expect(container.textContent).not.toContain('SYSTEM · OPENCOURIER')
    })

    it('names the rider of an OFFERED or OFFER_EXPIRED event when courierNameById contains the rider', () => {
      const offerEvents: DeliveryEventAdminDto[] = [
        {
          id: 'e-offered',
          type: 'OFFERED',
          actor: 'SYSTEM',
          eventSource: 'OPENCOURIER',
          oldStatus: 'ASSIGNING_COURIER',
          newStatus: 'ASSIGNING_COURIER',
          transitionSuccessful: true,
          message: null,
          createdAt: new Date('2026-10-26T10:00:00Z'),
          courierId: 'c-ana',
        },
        {
          id: 'e-expired',
          type: 'OFFER_EXPIRED',
          actor: 'SYSTEM',
          eventSource: 'OPENCOURIER',
          oldStatus: 'ASSIGNING_COURIER',
          newStatus: 'ASSIGNING_COURIER',
          transitionSuccessful: true,
          message: 'Offer expired after 60 s',
          createdAt: new Date('2026-10-26T10:01:00Z'),
          courierId: 'c-ana',
        },
      ]

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: offerEvents,
        isLoading: false,
        isError: false,
        error: null,
      })

      const courierMap = new Map([['c-ana', 'Ana Papadopoulou']])
      render(<DeliveryEventTimeline deliveryId="d100" courierNameById={courierMap} />)

      // Both events render headlines in sentence case
      expect(screen.getByText('Offered')).toBeInTheDocument()
      expect(screen.getByText('Offer expired')).toBeInTheDocument()

      // The rider is named from the map
      const riderElements = screen.getAllByText('Ana Papadopoulou')
      expect(riderElements.length).toBe(2)
      expect(screen.getAllByText('Rider').length).toBe(2)
    })

    it('falls back to courierId when courierNameById does not contain the rider or is omitted', () => {
      const event: DeliveryEventAdminDto = {
        id: 'e-offered-unknown',
        type: 'OFFERED',
        actor: 'SYSTEM',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: null,
        createdAt: new Date('2026-10-26T10:00:00Z'),
        courierId: 'courier-unmapped-999',
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [event],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(screen.getByText('Rider')).toBeInTheDocument()
      expect(screen.getByText('courier-unmapped-999')).toBeInTheDocument()
    })

    it('renders NO_COURIER_AVAILABLE headline without Rider section', () => {
      const event: DeliveryEventAdminDto = {
        id: 'e-no-courier',
        type: 'NO_COURIER_AVAILABLE',
        actor: 'SYSTEM',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ASSIGNING_COURIER',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: 'No couriers available',
        createdAt: new Date('2026-10-26T10:00:00Z'),
        courierId: null,
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [event],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(screen.getByText('No courier available')).toBeInTheDocument()
      expect(screen.queryByText('Rider')).toBeNull()
    })

    it('renders the timeline row for a HANDED_BACK event as "Handed back" (spec 0020, AC-8)', () => {
      const handedBackEvent: DeliveryEventAdminDto = {
        id: 'e-hb',
        type: 'HANDED_BACK',
        actor: 'COURIER',
        eventSource: 'OPENCOURIER',
        oldStatus: 'ACCEPTED',
        newStatus: 'ASSIGNING_COURIER',
        transitionSuccessful: true,
        message: 'Handed back within the free window',
        createdAt: new Date('2026-11-02T10:05:00Z'),
        courierId: 'c-rider-1',
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [handedBackEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      const courierMap = new Map([['c-rider-1', 'Nikos Kazantzakis']])
      render(<DeliveryEventTimeline deliveryId="d100" courierNameById={courierMap} />)

      expect(screen.getByText('Handed back')).toBeInTheDocument()
      expect(screen.getByText('Handed back within the free window')).toBeInTheDocument()
      expect(screen.getByText('Nikos Kazantzakis')).toBeInTheDocument()
    })

    it('names a DROPOFF_POINT_CORRECTED event "Dropoff point corrected" in the timeline (row 99, spec 0016)', () => {
      const correctedEvent: DeliveryEventAdminDto = {
        id: 'e-dpc',
        type: 'DROPOFF_POINT_CORRECTED',
        actor: 'COURIER',
        eventSource: 'COURIER_APP',
        oldStatus: 'COURIER_ARRIVED_AT_DROPOFF_LOCATION',
        newStatus: 'COURIER_ARRIVED_AT_DROPOFF_LOCATION',
        transitionSuccessful: true,
        message: 'Drop off point moved 35 m by the rider',
        createdAt: new Date('2026-11-03T12:32:00Z'),
      }

      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [correctedEvent],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      const row = screen.getByTestId('delivery-event-row')
      expect(row).toHaveTextContent('Dropoff point corrected')
      expect(screen.getByText('Dropoff point corrected')).toBeInTheDocument()
      expect(screen.queryByText('DROPOFF_POINT_CORRECTED')).toBeNull()
      expect(screen.getByText('Drop off point moved 35 m by the rider')).toBeInTheDocument()
      // Not a status change, so no "Did not take effect" badge either.
      expect(screen.queryByText('Did not take effect')).toBeNull()
    })

    it('polls for delivery events every 30 seconds via pollingInterval (spec 0002, AC-11)', () => {
      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      // Timeline must poll every 30 s so new OFFERED, OFFER_EXPIRED or NO_COURIER_AVAILABLE events appear
      expect(mockUseGetDeliveryEventsQuery).toHaveBeenCalledWith(
        { deliveryId: 'd100' },
        expect.objectContaining({ pollingInterval: 30_000 })
      )
    })

    it('pauses polling (pollingInterval: 0) when the tab is hidden / in background (F6, decision 61.52)', () => {
      const visibilitySpy = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      mockUseGetDeliveryEventsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
      })

      render(<DeliveryEventTimeline deliveryId="d100" />)

      expect(mockUseGetDeliveryEventsQuery).toHaveBeenCalledWith(
        { deliveryId: 'd100' },
        expect.objectContaining({ pollingInterval: 0 })
      )

      visibilitySpy.mockRestore()
    })
  })
})
