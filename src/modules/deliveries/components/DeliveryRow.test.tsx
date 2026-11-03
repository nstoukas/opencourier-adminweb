import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeliveryRow } from './DeliveryRow'
import { EnumDeliveryStatus } from '@/shared-types'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'

// The row shared by the courier page (spec 0012) and the restaurant page (spec 0024).
describe('DeliveryRow', () => {
  const delivery = {
    id: 'del-shared-abcdef',
    orderReference: 'ORD-9',
    status: EnumDeliveryStatus.ACCEPTED,
    pickupBusinessName: 'Souvlaki Bar',
    dropoffName: 'Giannis S.',
    createdAt: new Date('2026-10-31T18:05:00.000Z'),
  } as unknown as DeliveryAdminDto

  it('by default reads "restaurant → customer" under the reference (the courier page)', () => {
    render(
      <ul>
        <DeliveryRow delivery={delivery} onOpen={jest.fn()} />
      </ul>,
    )

    expect(screen.getByText('Souvlaki Bar → Giannis S.')).toBeInTheDocument()
  })

  it('shows the subtitle it is given instead (the restaurant page passes the customer only)', () => {
    render(
      <ul>
        <DeliveryRow delivery={delivery} onOpen={jest.fn()} subtitle="Giannis S." />
      </ul>,
    )

    expect(screen.getByText('Giannis S.')).toBeInTheDocument()
    expect(screen.queryByText(/Souvlaki Bar/)).toBeNull()
  })

  it('links to the delivery with its reference and short id, and opens it on a plain click', () => {
    const onOpen = jest.fn()
    render(
      <ul>
        <DeliveryRow delivery={delivery} onOpen={onOpen} extra={<span>right side</span>} />
      </ul>,
    )

    const link = screen.getByRole('link', { name: 'ORD-9 · abcdef' })
    expect(link).toHaveAttribute('href', '/deliveries/del-shared-abcdef')
    expect(screen.getByText('right side')).toBeInTheDocument()
    expect(screen.getByText('Accepted')).toBeInTheDocument()
    fireEvent.click(link)
    expect(onOpen).toHaveBeenCalledWith('del-shared-abcdef')
  })
})
