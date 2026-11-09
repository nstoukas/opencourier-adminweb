import React from 'react'
import { render, screen } from '@testing-library/react'
import { WaitChargesCard } from './WaitChargesCard'
import type { DeliveryAdminDto } from '@/backend-admin-sdk'
import { formatOptionalDate } from '../../../ui-shared-utils'

// Base delivery object matching DeliveryAdminDto minimal structure
const baseDelivery = {
  id: 'del-wait-1',
  currencyCode: 'EUR',
} as DeliveryAdminDto

describe('WaitChargesCard component (spec 0033, AC-10, decision 23.20)', () => {
  it('renders nothing when waitCharges is undefined', () => {
    const { container } = render(
      <WaitChargesCard delivery={{ ...baseDelivery, waitCharges: undefined }} />
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Restaurant delay charges' })).toBeNull()
  })

  it('renders nothing when waitCharges is an empty list', () => {
    const { container } = render(
      <WaitChargesCard delivery={{ ...baseDelivery, waitCharges: [] }} />
    )
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Restaurant delay charges' })).toBeNull()
  })

  it('renders card title and shows each charge amount and formatted time for a single charge', () => {
    const chargeTime = '2026-11-09T10:30:00.000Z'
    const delivery = {
      ...baseDelivery,
      waitCharges: [
        {
          amount: 150, // 150 cents = €1.50
          currencyCode: 'EUR',
          createdAt: chargeTime,
        },
      ],
    } as DeliveryAdminDto

    render(<WaitChargesCard delivery={delivery} />)

    expect(screen.getByRole('heading', { name: 'Restaurant delay charges' })).toBeInTheDocument()
    expect(screen.getByText('€1.50')).toBeInTheDocument()
    expect(screen.getByText(formatOptionalDate(chargeTime))).toBeInTheDocument()
  })

  it('shows each charge amount and timestamp when there are multiple wait charges', () => {
    const time1 = '2026-11-09T10:15:00.000Z'
    const time2 = '2026-11-09T11:45:00.000Z'
    const delivery = {
      ...baseDelivery,
      waitCharges: [
        {
          amount: 200, // €2.00
          currencyCode: 'EUR',
          createdAt: time1,
        },
        {
          amount: 80, // €0.80
          currencyCode: 'EUR',
          createdAt: time2,
        },
      ],
    } as DeliveryAdminDto

    render(<WaitChargesCard delivery={delivery} />)

    expect(screen.getByRole('heading', { name: 'Restaurant delay charges' })).toBeInTheDocument()
    expect(screen.getByText('€2.00')).toBeInTheDocument()
    expect(screen.getByText(formatOptionalDate(time1))).toBeInTheDocument()
    expect(screen.getByText('€0.80')).toBeInTheDocument()
    expect(screen.getByText(formatOptionalDate(time2))).toBeInTheDocument()
  })

  it('formats amount using plain decimals when currencyCode is empty', () => {
    const chargeTime = '2026-11-09T12:00:00.000Z'
    const delivery = {
      ...baseDelivery,
      waitCharges: [
        {
          amount: 350,
          currencyCode: '',
          createdAt: chargeTime,
        },
      ],
    } as DeliveryAdminDto

    render(<WaitChargesCard delivery={delivery} />)

    expect(screen.getByText('3.50')).toBeInTheDocument()
    expect(screen.getByText(formatOptionalDate(chargeTime))).toBeInTheDocument()
  })

  it('falls back to String(amount) when formatMoney returns null for non-finite amount', () => {
    const chargeTime = '2026-11-09T12:00:00.000Z'
    const delivery = {
      ...baseDelivery,
      waitCharges: [
        {
          amount: NaN,
          currencyCode: 'EUR',
          createdAt: chargeTime,
        },
      ],
    } as any

    render(<WaitChargesCard delivery={delivery} />)

    expect(screen.getByText('NaN')).toBeInTheDocument()
    expect(screen.getByText(formatOptionalDate(chargeTime))).toBeInTheDocument()
  })
})
