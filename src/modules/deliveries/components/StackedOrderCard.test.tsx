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

    it('shows "No stop order now: it is kept only while both orders are open with one rider." when stackStops is null or empty', () => {
      const { rerender } = render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[stackOfferReason]}
        />
      )

      expect(
        screen.getByText('No stop order now: it is kept only while both orders are open with one rider.')
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
        screen.getByText('No stop order now: it is kept only while both orders are open with one rider.')
      ).toBeInTheDocument()
      expect(screen.queryByRole('list')).toBeNull()

      rerender(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={undefined}
          offerReasons={[stackOfferReason]}
        />
      )

      expect(
        screen.getByText('No stop order now: it is kept only while both orders are open with one rider.')
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

    it('extracts partner deliveryId from latest ADD_ON reason using currentDeliveryId (spec 0048, row 81, AC-12)', () => {
      const addOnReason: OfferReasonAdmin = {
        ...stackOfferReason,
        id: 'reason-addon-1',
        kind: 'ADD_ON',
        values: { currentDeliveryId: 'del-job-888888' },
      }
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [addOnReason],
        })
      ).toBe('del-job-888888')
    })

    it('prefers newest pairing reason when both STACK and ADD_ON reasons exist (spec 0048, row 81, AC-12)', () => {
      const olderStackReason: OfferReasonAdmin = {
        ...stackOfferReason,
        id: 'reason-stack-old',
        kind: 'STACK',
        values: { partnerDeliveryId: 'del-partner-old' },
      }
      const newerAddOnReason: OfferReasonAdmin = {
        ...stackOfferReason,
        id: 'reason-addon-new',
        kind: 'ADD_ON',
        values: { currentDeliveryId: 'del-job-new' },
      }
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [olderStackReason, newerAddOnReason],
        })
      ).toBe('del-job-new')
    })

    it('returns null when neither stackStops nor STACK/ADD_ON reasons have partnerId', () => {
      expect(
        stackPartnerId({
          deliveryId: currentDeliveryId,
          stackStops: null,
          offerReasons: [],
        })
      ).toBeNull()
    })
  })

  describe('StackedOrderCard for mid-job add-on offers (spec 0048, row 81, AC-12, AC-9)', () => {
    const jobDeliveryId = 'del-job-777777'
    const addOnStops: StackStopAdmin[] = [
      { deliveryId: currentDeliveryId, stop: 'PICKUP' },
      { deliveryId: jobDeliveryId, stop: 'PICKUP' },
      { deliveryId: currentDeliveryId, stop: 'DROPOFF' },
      { deliveryId: jobDeliveryId, stop: 'DROPOFF' },
    ]
    const addOnOfferReason: OfferReasonAdmin = {
      id: 'reason-addon-card',
      deliveryEventId: 'evt-addon-1',
      courierId: 'c1',
      strategy: 'FAIRNESS',
      weights: null,
      values: {
        currentDeliveryId: jobDeliveryId,
        extraKm: 2.1,
        extraMinutes: 7,
        sequence: addOnStops,
        carryingFood: true,
      },
      score: null,
      candidateCount: 2,
      ridersInRange: 3,
      candidates: null,
      kind: 'ADD_ON',
      createdAt: '2026-11-22T10:00:00.000Z',
    }

    it('renders "One more order on the way" card header with data-testid="stacked-order"', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={addOnStops}
          offerReasons={[addOnOfferReason]}
          addOnExtraKm={2.1}
          addOnExtraMinutes={7}
        />
      )

      const card = screen.getByTestId('stacked-order')
      expect(card).toBeInTheDocument()
      expect(within(card).getByRole('heading', { name: 'One more order on the way' })).toBeInTheDocument()
    })

    it('asserts the safety rule: each delivery is paid in full from its own quote', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={addOnStops}
          offerReasons={[addOnOfferReason]}
          addOnExtraKm={2.1}
          addOnExtraMinutes={7}
        />
      )

      expect(
        screen.getByText(/Each is paid in full from its own quote\./)
      ).toBeInTheDocument()
    })

    it('renders added distance and time and links the job delivery', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[addOnOfferReason]}
          addOnExtraKm={2.1}
          addOnExtraMinutes={7}
        />
      )

      const paragraph = screen.getByText(/Offered to a rider on a job, added to/)
      expect(paragraph).toHaveTextContent(
        'Offered to a rider on a job, added to 777777, adding +2.1 km, +7 min. Each is paid in full from its own quote.'
      )

      const jobLink = screen.getByRole('link', { name: '777777' })
      expect(jobLink).toBeInTheDocument()
      expect(jobLink).toHaveAttribute('href', `/deliveries/${jobDeliveryId}`)
    })

    it('omits added km and min when they are null or undefined', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[addOnOfferReason]}
          addOnExtraKm={null}
          addOnExtraMinutes={null}
        />
      )

      const paragraph = screen.getByText(/Offered to a rider on a job, added to/)
      expect(paragraph).toHaveTextContent(
        'Offered to a rider on a job, added to 777777. Each is paid in full from its own quote.'
      )
      expect(screen.queryByText(/adding \+/)).toBeNull()
    })

    it('renders "their job" when partner job cannot be resolved', () => {
      const addOnNoJobReason: OfferReasonAdmin = {
        ...addOnOfferReason,
        values: {},
      }

      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[addOnNoJobReason]}
        />
      )

      expect(screen.getByText('their job')).toBeInTheDocument()
      expect(screen.getByText('their job')).toHaveClass('text-muted-foreground')
      expect(screen.getByText(/Offered to a rider on a job, added to/)).toHaveTextContent(
        'Offered to a rider on a job, added to their job. Each is paid in full from its own quote.'
      )
    })

    it('renders the ordered list of stops when pair is with rider, and empty notice when stops absent', () => {
      const { rerender } = render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={addOnStops}
          offerReasons={[addOnOfferReason]}
        />
      )

      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(4)
      expect(listItems[0]).toHaveTextContent('Pick up this delivery')
      expect(listItems[1]).toHaveTextContent('Pick up 777777')

      rerender(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[addOnOfferReason]}
        />
      )

      expect(
        screen.getByText('No stop order now: it is kept only while both orders are open with one rider.')
      ).toBeInTheDocument()
    })

    it('reads "One more order on the way" and links the stop list partner when addOn is true with no reasons (spec 0048, row 81, agy review)', () => {
      // In the short window before the OFFERED event writes the reason, or before reasons load,
      // server sets addOn: true. It must render "One more order on the way" and link the partner from stops.
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[]}
          addOn={true}
        />
      )

      const card = screen.getByTestId('stacked-order')
      expect(card).toBeInTheDocument()
      expect(within(card).getByRole('heading', { name: 'One more order on the way' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'One more order added' })).toBeNull()

      // Links partner delivery 222222 from stackStops
      const partnerLinks = screen.getAllByRole('link', { name: '222222' })
      expect(partnerLinks.length).toBeGreaterThan(0)
      partnerLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)
      })

      // Safety rule is asserted
      expect(screen.getByText(/Each is paid in full from its own quote\./)).toBeInTheDocument()
    })

    it('reads "One more order on the way" when addOn is true and offerReasons is undefined (spec 0048, row 81, agy review)', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={undefined}
          addOn={true}
        />
      )

      expect(screen.getByRole('heading', { name: 'One more order on the way' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'One more order added' })).toBeNull()
    })
  })

  describe('The job an add on joined (spec 0048, row 81 review fix)', () => {
    it('renders "One more order added" and links partner when delivery has stackStops but no pairing offerReason', () => {
      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[]}
        />
      )

      const card = screen.getByTestId('stacked-order')
      expect(card).toBeInTheDocument()
      expect(within(card).getByRole('heading', { name: 'One more order added' })).toBeInTheDocument()
      expect(
        screen.getByText(/Offered alone\. Later another order,/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/was added to this job while the rider was on it\. Each is paid in full from its own quote\./)
      ).toBeInTheDocument()

      const partnerLinks = screen.getAllByRole('link', { name: '222222' })
      expect(partnerLinks.length).toBeGreaterThan(0)
      partnerLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)
      })
    })

    it('renders "another delivery" when partner cannot be resolved from stackStops', () => {
      const onlyCurrentDeliveryStops: StackStopAdmin[] = [
        { deliveryId: currentDeliveryId, stop: 'PICKUP' },
        { deliveryId: currentDeliveryId, stop: 'DROPOFF' },
      ]

      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={onlyCurrentDeliveryStops}
          offerReasons={[]}
        />
      )

      expect(screen.getByRole('heading', { name: 'One more order added' })).toBeInTheDocument()
      expect(screen.getByText('another delivery')).toBeInTheDocument()
      expect(screen.getByText('another delivery')).toHaveClass('text-muted-foreground')
    })

    it('ignores stale ADD_ON reason that names a different partner and renders "One more order added" with stops partner', () => {
      // Reason was from an older declined add-on offer with a different delivery
      const staleAddOnReason: OfferReasonAdmin = {
        id: 'reason-stale',
        deliveryEventId: 'evt-stale',
        courierId: 'c1',
        strategy: 'FAIRNESS',
        weights: null,
        values: {
          currentDeliveryId: 'del-old-job-999999',
          extraKm: 1.5,
          extraMinutes: 5,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: 'ADD_ON',
        createdAt: '2026-11-22T08:00:00.000Z',
      }

      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={sampleStops}
          offerReasons={[staleAddOnReason]}
        />
      )

      // Reason partner (del-old-job-999999) does not match stops partner (del-partner-222222)
      // So reason is untrusted -> renders "One more order added" linking 222222
      expect(screen.getByRole('heading', { name: 'One more order added' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'One more order on the way' })).toBeNull()
      expect(screen.queryByText(/del-old-job-999999/)).toBeNull()
      expect(screen.queryByText(/999999/)).toBeNull()
      const partnerLinks = screen.getAllByRole('link', { name: '222222' })
      expect(partnerLinks.length).toBeGreaterThan(0)
      partnerLinks.forEach((link) => {
        expect(link).toHaveAttribute('href', `/deliveries/${partnerDeliveryId}`)
      })
    })

    it('reads "One more order added" and never names X or old figures when pair has no stop list and reasons [ADD_ON naming X, SINGLE] (spec 0048, row 81, agy review)', () => {
      // Delivery was offered as an add-on to job X and declined, then accepted as SINGLE,
      // and later joined by another order. Once both orders are delivered, stackStops is null.
      const declinedAddOnReason: OfferReasonAdmin = {
        id: 'reason-declined-addon',
        deliveryEventId: 'evt-addon-old',
        courierId: 'c1',
        strategy: 'FAIRNESS',
        weights: null,
        values: {
          currentDeliveryId: 'del-job-X-999999',
          extraKm: 3.2,
          extraMinutes: 9,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: 'ADD_ON',
        createdAt: '2026-11-22T08:00:00.000Z',
      }
      const singleOfferReason: OfferReasonAdmin = {
        id: 'reason-single-accepted',
        deliveryEventId: 'evt-single',
        courierId: 'c1',
        strategy: 'FAIRNESS',
        weights: null,
        values: {},
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: 'SINGLE',
        createdAt: '2026-11-22T08:05:00.000Z',
      }

      render(
        <StackedOrderCard
          deliveryId={currentDeliveryId}
          stackStops={null}
          offerReasons={[declinedAddOnReason, singleOfferReason]}
        />
      )

      // The SINGLE offer clears the pair so currentPairingReason is undefined -> renders "One more order added"
      expect(screen.getByRole('heading', { name: 'One more order added' })).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: 'One more order on the way' })).toBeNull()

      // Must never name X (del-job-X-999999 / 999999) nor link to it
      expect(screen.queryByText(/del-job-X-999999/)).toBeNull()
      expect(screen.queryByText(/999999/)).toBeNull()
      expect(screen.queryByRole('link', { name: '999999' })).toBeNull()

      // Must never show old figures from the declined add-on offer (+3.2 km, +9 min)
      expect(screen.queryByText(/3\.2/)).toBeNull()
      expect(screen.queryByText(/9 min/)).toBeNull()
      expect(screen.queryByText(/adding \+/)).toBeNull()

      // With stackStops null and no partner resolvable, says "another delivery"
      expect(screen.getByText('another delivery')).toBeInTheDocument()
      expect(
        screen.getByText(/Offered alone\. Later another order,/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Each is paid in full from its own quote\./)
      ).toBeInTheDocument()
    })
  })
})
