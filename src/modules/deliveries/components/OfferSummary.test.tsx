import React from 'react'
import { render, screen } from '@testing-library/react'
import { OfferSummary } from './OfferSummary'
import { EnumDeliveryStatus } from '../../../shared-types'
import type { DeliveryOfferFields } from '../utils/offer'

describe('OfferSummary component (spec 0002, AC-11)', () => {
  const fixedNow = new Date('2026-10-26T12:00:00.000Z')

  it('renders nothing (null) when delivery is not looking for a rider', () => {
    const delivery: DeliveryOfferFields = {
      status: EnumDeliveryStatus.ACCEPTED,
      courierId: 'c1',
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      waitingForCourierSince: null,
    }

    const { container } = render(<OfferSummary delivery={delivery} now={fixedNow} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when ASSIGNING_COURIER has no offer and no waiting record', () => {
    const delivery: DeliveryOfferFields = {
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      waitingForCourierSince: null,
    }

    const { container } = render(<OfferSummary delivery={delivery} now={fixedNow} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders open offer with "Ana P., 2 min", data-offer-kind="offered" and clock icon', () => {
    const delivery: DeliveryOfferFields = {
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: 'c1',
      matchedCourierName: 'Ana Papadopoulou',
      offeredAt: new Date(fixedNow.getTime() - 120_000), // 2 min ago
      waitingForCourierSince: null,
    }

    render(<OfferSummary delivery={delivery} now={fixedNow} />)

    const element = screen.getByText('Ana P., 2 min')
    expect(element).toBeInTheDocument()

    const containerSpan = element.closest('span[data-offer-kind="offered"]')
    expect(containerSpan).not.toBeNull()
    // Icon is present inside the container
    expect(containerSpan?.querySelector('svg')).not.toBeNull()
  })

  it('renders open offer with full name when nameStyle="full"', () => {
    const delivery: DeliveryOfferFields = {
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: 'c1',
      matchedCourierName: 'Ana Papadopoulou',
      offeredAt: new Date(fixedNow.getTime() - 120_000),
      waitingForCourierSince: null,
    }

    render(<OfferSummary delivery={delivery} now={fixedNow} nameStyle="full" />)
    expect(screen.getByText('Ana Papadopoulou, 2 min')).toBeInTheDocument()
  })

  it('renders waiting state with "No rider free, 4 min" and data-offer-kind="waiting"', () => {
    const delivery: DeliveryOfferFields = {
      status: EnumDeliveryStatus.ASSIGNING_COURIER,
      courierId: null,
      matchedCourierId: null,
      matchedCourierName: null,
      offeredAt: null,
      waitingForCourierSince: new Date(fixedNow.getTime() - 240_000), // 4 min ago
    }

    render(<OfferSummary delivery={delivery} now={fixedNow} />)

    const element = screen.getByText('No rider free, 4 min')
    expect(element).toBeInTheDocument()

    const containerSpan = element.closest('span[data-offer-kind="waiting"]')
    expect(containerSpan).not.toBeNull()
    expect(containerSpan?.querySelector('svg')).not.toBeNull()
  })
})
