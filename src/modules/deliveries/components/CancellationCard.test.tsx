import React from 'react'
import { render, screen } from '@testing-library/react'
import { CancellationCard } from './CancellationCard'
import type { DeliveryAdminDto } from '../../../backend-admin-sdk'

const baseDelivery= {
  id: 'del-1',
  status: 'CANCELED',
  currencyCode: 'EUR',
} as DeliveryAdminDto

describe('CancellationCard component (spec 0015, AC-13)', () => {
  it('renders nothing when cancelledAt is null or undefined', () => {
    const { container: containerNull } = render(
      <CancellationCard delivery={{ ...baseDelivery, cancelledAt: null }} />
    )
    expect(containerNull.firstChild).toBeNull()

    const { container: containerUndef } = render(
      <CancellationCard delivery={{ ...baseDelivery, cancelledAt: undefined }} />
    )
    expect(containerUndef.firstChild).toBeNull()
  })

  it('renders the Cancellation card heading and details when cancelledAt is present', () => {
    const delivery= {
      ...baseDelivery,
      cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
      cancelledBy: 'COOP',
      cancelledFromStatus: 'ASSIGNING_COURIER',
    } as DeliveryAdminDto

    render(<CancellationCard delivery={delivery} />)
    expect(screen.getByRole('heading', { name: 'Cancellation' })).toBeInTheDocument()
    expect(screen.getByText('Who asked')).toBeInTheDocument()
    expect(screen.getByText('The co-op')).toBeInTheDocument()
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByText('Cancelled from')).toBeInTheDocument()
    expect(screen.getByText('Assigning Courier')).toBeInTheDocument()
  })

  it('renders who asked in words for COOP, RESTAURANT, CUSTOMER, and em dash when missing', () => {
    const { rerender } = render(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ASSIGNING_COURIER',
          cancelledBy: 'RESTAURANT',
        }}
      />
    )
    expect(screen.getByText('Who asked').nextElementSibling?.textContent).toBe('The restaurant')

    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ASSIGNING_COURIER',
          cancelledBy: 'CUSTOMER',
        }}
      />
    )
    expect(screen.getByText('Who asked').nextElementSibling?.textContent).toBe('The customer')

    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ASSIGNING_COURIER',
          cancelledBy: null,
        }}
      />
    )
    expect(screen.getByText('Who asked').nextElementSibling?.textContent).toBe('—')
  })

  it('renders restaurant charge formatted as money when present, and "None" when null', () => {
    const { rerender } = render(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          partnerCharge: {
            amount: 500, // €5.00
            currencyCode: 'EUR',
            createdAt: '2026-11-01T10:00:00.000Z',
          },
        }}
      />
    )
    expect(screen.getByText('€5.00')).toBeInTheDocument()

    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          partnerCharge: null,
        }}
      />
    )
    expect(screen.getByText('None')).toBeInTheDocument()
  })

  it('displays rider’s pay line differing for accepted vs not accepted', () => {
    // When cancelled from ongoing/accepted status (e.g. DISPATCHED)
    const { rerender } = render(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'DISPATCHED',
        }}
      />
    )
    expect(
      screen.getByText(
        'Paid under the co-op’s cancelled job pay: see “Courier paid for cancellation” in the events'
      )
    ).toBeInTheDocument()

    // When cancelled before any rider accepted (e.g. ASSIGNING_COURIER)
    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ASSIGNING_COURIER',
        }}
      />
    )
    expect(screen.getByText('None: no rider had accepted it')).toBeInTheDocument()
  })

  it('displays food line correctly across all outcomes: before pickup, returned, not returned, not recorded', () => {
    // 1. Before pickup
    const { rerender } = render(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ACCEPTED',
          foodOutcome: null,
        }}
      />
    )
    expect(screen.getByText('No food to return (cancelled before pickup)')).toBeInTheDocument()

    // 2. After pickup, food returned
    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'PICKED_UP',
          foodOutcome: 'RETURNED',
        }}
      />
    )
    expect(screen.getByText('Returned to the restaurant')).toBeInTheDocument()

    // 3. After pickup, food not returned
    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'ON_THE_WAY',
          foodOutcome: 'NOT_RETURNED',
        }}
      />
    )
    expect(screen.getByText('Not returned (see the rider’s note in the events)')).toBeInTheDocument()

    // 4. After pickup, not recorded yet
    rerender(
      <CancellationCard
        delivery={{
          ...baseDelivery,
          cancelledAt: new Date('2026-11-01T10:00:00.000Z'),
          cancelledFromStatus: 'COURIER_ARRIVED_AT_DROPOFF_LOCATION',
          foodOutcome: null,
        }}
      />
    )
    expect(screen.getByText('Not recorded yet by the rider')).toBeInTheDocument()
  })
})
