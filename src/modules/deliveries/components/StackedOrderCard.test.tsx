// Spec 0048 (AC-12, AC-9): a delivery offered together with another one (a stack).
// Displays the partner order, the four stops in riding order while with one rider,
// and the binding safety rule: each delivery is paid in full from its own quote.
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { StackedOrderCard, stackPartnerId } from './StackedOrderCard'
import type {
  OfferReasonAdmin,
  StackStopAdmin,
} from '../../../backend-admin-sdk/src/models/DeliveryAdminDto'

describe('StackedOrderCard (spec 0048, AC-12, AC-9)', () => {
  const currentDeliveryId = 'del-current-111111'
  const partnerDeliveryId = 'del-partner-222222'

  const sampleStops: StackStopAdmin[] = [
    { deliveryId: currentDeliveryId, stop: 'PICKUP' },
    { deliveryId: partnerDeliveryId, stop: 'PICKUP' },
    { deliveryId: currentDeliveryId, stop: 'DROPOFF' },
    { deliveryId: partnerDeliveryId, stop: 'DROPOFF' },
  ]

  const stackOfferReason: OfferReasonAdmin = {
    id: 'reason-1',
    deliveryEventId: 'evt-1',
    courierId: 'c1',
    strategy: 'FAIRNESS',
    weights: null,
    values: {
      partnerDeliveryId,
      sequence: sampleStops,
      delaySeconds: {
        [currentDeliveryId]: 64,
        [partnerDeliveryId]: 120,
      },
    },
    score: null,
    candidateCount: 1,
    ridersInRange: 1,
    candidates: null,
    kind: 'STACK',
    createdAt: '2026-11-22T10:00:00.000Z',
  }

  describe('Card header and safety rule (AC-9, value 3)', () => {
    it('renders "Two orders together" card header with data-testid="stacked-order"', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[stackOfferReason]}
        />
      )

      const card = screen.getByTestId('stacked-order')
      expect(card).toBeInTheDocument()
      expect(within(card).getByRole('heading', { name: 'Two orders together' })).toBeInTheDocument()
    })

    it('asserts the safety rule: each delivery is paid in full from its own quote', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[stackOfferReason]}
        />
      )

      expect(
        screen.getByText(/Each is paid in full from its own quote\./)
      ).toBeInTheDocument()
    })
  })

  describe('Partner delivery resolution and linking', () => {
    it('links the partner delivery by its short id when found in stackStops', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[]}
        />
      )

      const partnerLinks = screen.getAllByRole('link', { name: '222222' })
      expect(partnerLinks.length).toBeGreaterThan(0)
      partnerLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)
      })
    })

    it('links the partner delivery from the newest STACK offerReason when stackStops is null', () => {
      const olderReason: OfferReasonAdmin = {
        ...stackOfferReason,
        id: 'reason-older',
        values: { partnerDeliveryId: 'del-oldpartner-999999' },
        createdAt: '2026-11-22T09:00:00.000Z',
      }
      const newerReason: OfferReasonAdmin = {
        ...stackOfferReason,
        id: 'reason-newer',
        values: { partnerDeliveryId },
        createdAt: '2026-11-22T10:00:00.000Z',
      }

      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[olderReason, newerReason]}
        />
      )

      const partnerLink = screen.getByRole('link', { name: '222222' })
      expect(partnerLink).toBeInTheDocument()
      expect(partnerLink).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)
      expect(screen.queryByRole('link', { name: '999999' })).toBeNull()
    })

    it('displays "another delivery" when no partner delivery can be resolved', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[]}
        />
      )

      expect(screen.getByText('another delivery')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: '222222' })).toBeNull()
    })
  })

  describe('Stop sequence and rider status', () => {
    it('renders the ordered list of stops when pair is together with one rider', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[stackOfferReason]}
        />
      )

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(4)

      // Stop 1: Pick up this delivery
      expect(listItems[0]).toHaveTextContent('Pick up this delivery')
      expect(within(listItems[0] as HTMLElement).getByText('this delivery')).toBeInTheDocument()
      expect(within(listItems[0] as HTMLElement).queryByRole('link')).toBeNull()

      // Stop 2: Pick up partner delivery
      expect(listItems[1]).toHaveTextContent('Pick up 222222')
      const partnerPickupLink = within(listItems[1] as HTMLElement).getByRole('link')
      expect(partnerPickupLink).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)

      // Stop 3: Drop off this delivery
      expect(listItems[2]).toHaveTextContent('Drop off this delivery')

      // Stop 4: Drop off partner delivery
      expect(listItems[3]).toHaveTextContent('Drop off 222222')
    })

    it('shows "The two are no longer with one rider, so each goes on alone." when stackStops is null or empty', () => {
      const { rerender } = render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[stackOfferReason]}
        />
      )

      expect(
        screen.getByText('The two are no longer with one rider, so each goes on alone.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('list')).toBeNull()

      rerender(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={[]}
          offerReasons={[stackOfferReason]}
        />
      )

      expect(
        screen.getByText('The two are no longer with one rider, so each goes on alone.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('list')).toBeNull()
    })
  })

  describe('stackPartnerId helper unit tests', () => {
    it('extracts partner deliveryId from stackStops', () => {
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: sampleStops,
          offerReasons: undefined,
        })
      ).toBe(partnerDeliveryId)
    })

    it('extracts partner deliveryId from latest STACK reason when stackStops is missing', () => {
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [stackOfferReason],
        })
      ).toBe(partnerDeliveryId)
    })

    it('ignores non-STACK reasons (e.g. SINGLE)', () => {
      const singleReason: OfferReasonAdmin = {
        ...stackOfferReason,
        kind: 'SINGLE',
        values: { partnerDeliveryId: 'should-not-be-used' },
      }
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [singleReason],
        })
      ).toBeNull()
    })

    it('returns null when neither stackStops nor STACK reasons have partnerId', () => {
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [],
        })
      ).toBeNull()
    })
  })
})
