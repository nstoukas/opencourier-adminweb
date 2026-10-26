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

  it('renders all event headlines humanized in sentence case', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
    expect(screen.getByText('Dispatched')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(screen.getByText('Reassigned')).toBeInTheDocument()
  })

  it('displays failed events with "Did not take effect" badge for each failed transition', () => {
    render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(screen.getByText('Courier ID is required for dispatching')).toBeInTheDocument()

    // Exactly 2 failed events in the fixture
    const failedBadges = screen.getAllByText('Did not take effect')
    expect(failedBadges).toHaveLength(2)
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

  it('includes honest copy footnote and avoids claiming to be a complete record', () => {
    const { container } = render(<DeliveryEventTimeline deliveryId="d100" />)

    expect(
      screen.getByText(
        /Recorded DeliveryEvents, oldest first\. An event the state machine rejects outright is never written, so it cannot appear here\./
      )
    ).toBeInTheDocument()

    expect(container.textContent).not.toMatch(/complete record/i)
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
  })
})
