import {
  deliveryOffer,
  shortRiderName,
  minutesWaiting,
  describeOffer,
  type DeliveryOfferFields,
} from './offer'
import { EnumDeliveryStatus } from '../../../shared-types'

describe('offer utilities (spec 0002, AC-11)', () => {
  const fixedNow = new Date('2026-10-26T12:10:00.000Z')

  describe('shortRiderName', () => {
    it('shortens "First Last" to "First L."', () => {
      expect(shortRiderName('Ana Papadopoulou')).toBe('Ana P.')
      expect(shortRiderName('Kostas Georgiou')).toBe('Kostas G.')
    })

    it('takes the first name and the last name initial for multi-word names', () => {
      expect(shortRiderName('Maria Elena Santos')).toBe('Maria S.')
    })

    it('preserves single-word names unchanged', () => {
      expect(shortRiderName('Madonna')).toBe('Madonna')
      expect(shortRiderName('Plato')).toBe('Plato')
    })

    it('trims leading, trailing and internal multiple whitespaces cleanly', () => {
      expect(shortRiderName('  Nikos   Kazas  ')).toBe('Nikos K.')
      expect(shortRiderName('   SingleName   ')).toBe('SingleName')
      expect(shortRiderName('')).toBe('')
    })
  })

  describe('minutesWaiting', () => {
    it('returns "under 1 min" for elapsed times under 60 seconds (never "0 min")', () => {
      const since10sAgo = new Date(fixedNow.getTime() - 10_000)
      const since59sAgo = new Date(fixedNow.getTime() - 59_000)
      expect(minutesWaiting(since10sAgo, fixedNow)).toBe('under 1 min')
      expect(minutesWaiting(since59sAgo, fixedNow)).toBe('under 1 min')
    })

    it('returns "under 1 min" if server clock is slightly ahead of browser clock (skew)', () => {
      const futureSince = new Date(fixedNow.getTime() + 5_000)
      expect(minutesWaiting(futureSince, fixedNow)).toBe('under 1 min')
    })

    it('rounds down whole minutes elapsed: exactly 1 min, 2 min, etc.', () => {
      const since1MinAgo = new Date(fixedNow.getTime() - 60_000)
      const since2Min30sAgo = new Date(fixedNow.getTime() - 150_000)
      const since4MinAgo = new Date(fixedNow.getTime() - 240_000)

      expect(minutesWaiting(since1MinAgo, fixedNow)).toBe('1 min')
      expect(minutesWaiting(since2Min30sAgo, fixedNow)).toBe('2 min')
      expect(minutesWaiting(since4MinAgo, fixedNow)).toBe('4 min')
    })
  })

  describe('deliveryOffer', () => {
    it('returns "offered" kind with rider name and since date when delivery is ASSIGNING_COURIER with matchedCourierId', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Ana Papadopoulou',
        offeredAt: new Date(fixedNow.getTime() - 120_000),
        waitingForCourierSince: null,
      }

      const offer = deliveryOffer(delivery)
      expect(offer).toEqual({
        kind: 'offered',
        riderName: 'Ana Papadopoulou',
        since: new Date(fixedNow.getTime() - 120_000),
      })
    })

    it('falls back to "Unknown rider" when matchedCourierName is missing or empty string', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: null,
        offeredAt: new Date(fixedNow.getTime() - 30_000),
        waitingForCourierSince: null,
      }

      const offer = deliveryOffer(delivery)
      expect(offer).toEqual({
        kind: 'offered',
        riderName: 'Unknown rider',
        since: new Date(fixedNow.getTime() - 30_000),
      })
    })

    it('handles pre-migration untimed offers with offeredAt: null', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Giorgos P.',
        offeredAt: null,
        waitingForCourierSince: null,
      }

      const offer = deliveryOffer(delivery)
      expect(offer).toEqual({
        kind: 'offered',
        riderName: 'Giorgos P.',
        since: null,
      })
    })

    it('returns "waiting" kind when status is ASSIGNING_COURIER, no matched rider, but waitingForCourierSince is set', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        waitingForCourierSince: new Date(fixedNow.getTime() - 240_000),
      }

      const offer = deliveryOffer(delivery)
      expect(offer).toEqual({
        kind: 'waiting',
        since: new Date(fixedNow.getTime() - 240_000),
      })
    })

    it('returns null when delivery is ASSIGNING_COURIER but neither matched courier nor waitingSince is recorded', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        waitingForCourierSince: null,
      }

      expect(deliveryOffer(delivery)).toBeNull()
    })

    it('returns null when delivery status is not ASSIGNING_COURIER (even if fields are populated)', () => {
      const nonAssigningStatuses = [
        EnumDeliveryStatus.CREATED,
        EnumDeliveryStatus.ACCEPTED,
        EnumDeliveryStatus.DISPATCHED,
        EnumDeliveryStatus.DROPPED_OFF,
        EnumDeliveryStatus.CANCELED,
        EnumDeliveryStatus.FAILED,
      ]

      nonAssigningStatuses.forEach((status) => {
        const delivery: DeliveryOfferFields = {
          // Two enums with the same values (shared-types and the SDK); the cast only joins the types.
          status: status as unknown as DeliveryOfferFields['status'],
          courierId: null,
          matchedCourierId: 'c1',
          matchedCourierName: 'Ana Papadopoulou',
          offeredAt: new Date(),
          waitingForCourierSince: null,
        }
        expect(deliveryOffer(delivery)).toBeNull()
      })
    })

    it('returns null if courierId is already set (rider has accepted the job)', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: 'accepted-courier-id',
        matchedCourierId: 'c1',
        matchedCourierName: 'Ana Papadopoulou',
        offeredAt: new Date(),
        waitingForCourierSince: null,
      }

      expect(deliveryOffer(delivery)).toBeNull()
    })
  })

  describe('describeOffer', () => {
    it('returns "Ana P., 2 min" for an open offer with short nameStyle', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Ana Papadopoulou',
        offeredAt: new Date(fixedNow.getTime() - 120_000),
        waitingForCourierSince: null,
      }

      expect(describeOffer(delivery, fixedNow, 'short')).toBe('Ana P., 2 min')
    })

    it('returns "Ana Papadopoulou, 2 min" for an open offer with full nameStyle', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Ana Papadopoulou',
        offeredAt: new Date(fixedNow.getTime() - 120_000),
        waitingForCourierSince: null,
      }

      expect(describeOffer(delivery, fixedNow, 'full')).toBe('Ana Papadopoulou, 2 min')
    })

    it('returns "under 1 min" for offers opened less than a minute ago', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Ana Papadopoulou',
        offeredAt: new Date(fixedNow.getTime() - 25_000),
        waitingForCourierSince: null,
      }

      expect(describeOffer(delivery, fixedNow, 'short')).toBe('Ana P., under 1 min')
    })

    it('returns only the name without a time for pre-migration offers where offeredAt is null', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: 'c1',
        matchedCourierName: 'Giorgos Papadakis',
        offeredAt: null,
        waitingForCourierSince: null,
      }

      expect(describeOffer(delivery, fixedNow, 'short')).toBe('Giorgos P.')
      expect(describeOffer(delivery, fixedNow, 'full')).toBe('Giorgos Papadakis')
    })

    it('returns "No rider free, 4 min" while waiting with nobody offered', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        waitingForCourierSince: new Date(fixedNow.getTime() - 240_000),
      }

      expect(describeOffer(delivery, fixedNow, 'short')).toBe('No rider free, 4 min')
      expect(describeOffer(delivery, fixedNow, 'full')).toBe('No rider free, 4 min')
    })

    it('returns "No rider free, under 1 min" when waiting just started', () => {
      const delivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ASSIGNING_COURIER,
        courierId: null,
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: null,
        waitingForCourierSince: new Date(fixedNow.getTime() - 15_000),
      }

      expect(describeOffer(delivery, fixedNow)).toBe('No rider free, under 1 min')
    })

    it('returns null for delivered, accepted, or non-assigning deliveries', () => {
      const acceptedDelivery: DeliveryOfferFields = {
        status: EnumDeliveryStatus.ACCEPTED,
        courierId: 'c1',
        matchedCourierId: null,
        matchedCourierName: null,
        offeredAt: new Date(fixedNow.getTime() - 300_000),
        waitingForCourierSince: null,
      }

      expect(describeOffer(acceptedDelivery, fixedNow)).toBeNull()
    })
  })
})
