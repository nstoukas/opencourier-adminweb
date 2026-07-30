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
})
