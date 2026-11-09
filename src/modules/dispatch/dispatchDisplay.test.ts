import {
  BUSY_COLOR,
  FREE_COLOR,
  isRedRow,
  minutesSince,
  regionBounds,
  rowHref,
  STALE_AFTER_SECONDS,
  WAITING_COLOR,
} from './dispatchDisplay'
import type { DispatchAttentionRowDto } from '@/backend-admin-sdk'

describe('dispatchDisplay utilities (spec 0034)', () => {
  describe('STALE_AFTER_SECONDS and map colors', () => {
    it('sets STALE_AFTER_SECONDS to 30', () => {
      expect(STALE_AFTER_SECONDS).toBe(30)
    })

    it('exports expected color constants', () => {
      expect(FREE_COLOR).toBe('#2f7d4f')
      expect(BUSY_COLOR).toBe('#2f3237')
      expect(WAITING_COLOR).toBe('#c8453e')
    })
  })

  describe('minutesSince', () => {
    it('calculates whole minutes between ISO string and nowMs', () => {
      const now = new Date('2026-11-09T12:30:00.000Z').getTime()
      // 15 minutes ago
      const iso15 = '2026-11-09T12:15:00.000Z'
      expect(minutesSince(iso15, now)).toBe(15)

      // 45 seconds ago -> 0 whole minutes
      const iso45s = '2026-11-09T12:29:15.000Z'
      expect(minutesSince(iso45s, now)).toBe(0)

      // 61 seconds ago -> 1 whole minute
      const iso61s = '2026-11-09T12:28:59.000Z'
      expect(minutesSince(iso61s, now)).toBe(1)
    })

    it('never returns negative minutes when clocks disagree or clock skew occurs', () => {
      const now = new Date('2026-11-09T12:00:00.000Z').getTime()
      // Timestamp in future
      const futureIso = '2026-11-09T12:05:00.000Z'
      expect(minutesSince(futureIso, now)).toBe(0)
    })
  })

  describe('isRedRow (AC-3)', () => {
    it('returns true for SOS and WAITING_FOR_RIDER (red status)', () => {
      expect(isRedRow('SOS')).toBe(true)
      expect(isRedRow('WAITING_FOR_RIDER')).toBe(true)
    })

    it('returns false for other kinds (yellow status)', () => {
      expect(isRedRow('OFFER_UNANSWERED')).toBe(false)
      expect(isRedRow('RESTAURANT_LATE')).toBe(false)
      expect(isRedRow('RIDER_REPORT')).toBe(false)
      expect(isRedRow('UNREAD_MESSAGE')).toBe(false)
      expect(isRedRow('REMOVAL_REQUEST')).toBe(false)
      expect(isRedRow('UNKNOWN_FUTURE_KIND')).toBe(false)
    })
  })

  describe('rowHref (AC-8, AC-9)', () => {
    const baseRow: DispatchAttentionRowDto = {
      id: 'row-1',
      kind: 'WAITING_FOR_RIDER',
      since: null,
      deliveryId: null,
      sosId: null,
      issueId: null,
      threadId: null,
      status: null,
      courierId: null,
      orderReference: null,
      restaurantName: null,
      riderName: null,
      customerLabel: null,
      detail: 'test',
      held: false,
    }

    it('links to /sos/<sosId> when sosId is present (AC-8)', () => {
      expect(rowHref({ ...baseRow, sosId: 'incident-42' })).toBe('/sos/incident-42')
      // Even if deliveryId also present, sos takes priority
      expect(rowHref({ ...baseRow, sosId: 'incident-42', deliveryId: 'del-99' })).toBe('/sos/incident-42')
    })

    it('links to /deliveries/<deliveryId> when deliveryId is present', () => {
      expect(rowHref({ ...baseRow, deliveryId: 'del-101' })).toBe('/deliveries/del-101')
    })

    it('falls back to /deliveries when neither is present (AC-9 unknown future row)', () => {
      expect(rowHref(baseRow)).toBe('/deliveries')
    })
  })

  describe('regionBounds', () => {
    it('returns null for null, undefined, or empty objects', () => {
      expect(regionBounds(null)).toBeNull()
      expect(regionBounds(undefined)).toBeNull()
      expect(regionBounds({})).toBeNull()
      expect(regionBounds({ coordinates: [] })).toBeNull()
    })

    it('calculates [[minLat, minLng], [maxLat, maxLng]] from GeoJSON coordinates', () => {
      // Note: GeoJSON stores [longitude, latitude]
      const geoJsonPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [22.94, 39.36],
            [22.96, 39.36],
            [22.96, 39.38],
            [22.94, 39.38],
            [22.94, 39.36],
          ],
        ],
      }

      const bounds = regionBounds(geoJsonPolygon)
      expect(bounds).toEqual([
        [39.36, 22.94],
        [39.38, 22.96],
      ])
    })

    it('handles FeatureCollection with nested geometries', () => {
      const featureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [22.91, 39.35],
            },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [22.98, 39.42],
            },
          },
        ],
      }

      const bounds = regionBounds(featureCollection)
      expect(bounds).toEqual([
        [39.35, 22.91],
        [39.42, 22.98],
      ])
    })
  })
})
