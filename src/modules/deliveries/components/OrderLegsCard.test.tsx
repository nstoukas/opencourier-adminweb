// Spec 0046 (AC-6, cross check 5): the delivery page lists the legs of the order (same restaurant and
// order reference) with their status and rider, and the leg numbers the restaurant never sent.
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { OrderLegsCard } from './OrderLegsCard'
import type { OrderLegAdmin } from '../../../backend-admin-sdk/src/models/DeliveryAdminDto'

const leg = (overrides: Partial<OrderLegAdmin> = {}): OrderLegAdmin => ({
  id: 'delivery-aaaaaa111111',
  legNumber: 1,
  status: 'ACCEPTED',
  courierId: 'c1',
  courierName: 'Maria Papadopoulou',
  ...overrides,
})

describe('OrderLegsCard (spec 0046, AC-6)', () => {
  const two = [leg(), leg({ id: 'delivery-bbbbbb222222', legNumber: 2, status: 'ASSIGNING_COURIER', courierId: null, courierName: null })]

  it('is titled with the number of legs', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={2} legs={two} missingLegNumbers={[]} />)

    expect(within(screen.getByTestId('order-legs')).getByText('Order in 2 legs')).toBeInTheDocument()
  })

  it('lists each leg with its label, its status and its rider', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={2} legs={two} missingLegNumbers={[]} />)

    const rows = screen.getAllByRole('listitem') as [HTMLElement, HTMLElement]
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Leg 1 of 2')
    expect(rows[0]).toHaveTextContent('Maria Papadopoulou')
    expect(rows[0].querySelector('[data-status="ACCEPTED"]')).not.toBeNull()
    expect(rows[1]).toHaveTextContent('Leg 2 of 2')
    expect(rows[1]).toHaveTextContent('No rider yet')
    expect(rows[1].querySelector('[data-status="ASSIGNING_COURIER"]')).not.toBeNull()
  })

  it('links each other leg to its own page by its short id, and marks the one on this page', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={2} legs={two} missingLegNumbers={[]} />)

    const rows = screen.getAllByRole('listitem') as [HTMLElement, HTMLElement]
    expect(within(rows[0]).getByText('This delivery')).toBeInTheDocument()
    expect(within(rows[0]).queryByRole('link')).toBeNull()
    const link = within(rows[1]).getByRole('link')
    expect(link).toHaveAttribute('href', '/deliveries/delivery-bbbbbb222222')
    expect(link).toHaveTextContent('222222')
  })

  it('cross check 5: a 3 leg order with only leg 1 says legs 2 and 3 were never created', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={3} legs={[leg()]} missingLegNumbers={[2, 3]} />)

    expect(screen.getByText('Leg 2 of 3, Leg 3 of 3 were never created.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('one missing leg reads in the singular', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={2} legs={[leg()]} missingLegNumbers={[2]} />)

    expect(screen.getByText('Leg 2 of 2 was never created.')).toBeInTheDocument()
  })

  it('a complete order says nothing about a leg never created', () => {
    render(<OrderLegsCard deliveryId="delivery-aaaaaa111111" legCount={2} legs={two} missingLegNumbers={[]} />)

    expect(screen.queryByText(/never (sent|created)/)).not.toBeInTheDocument()
  })
})
