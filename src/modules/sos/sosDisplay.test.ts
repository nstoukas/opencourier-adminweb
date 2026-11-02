import {
  bannerText,
  closedByName,
  riderEnd,
  SOS_NOTE_MAX,
  SOS_OUTCOMES,
  SOS_OUTCOME_LABELS,
  STATE_LABELS,
  timeAgo,
} from './sosDisplay'
import type { SosIncidentAdminDto } from '@/backend-admin-sdk'

describe('sosDisplay (spec 0022, AC-8, AC-9, AC-10)', () => {
  const baseIncident: SosIncidentAdminDto = {
    id: 'sos-1',
    state: 'ACTIVE',
    courier: { id: 'c-1', firstName: 'Kostas', lastName: 'Papadopoulos' },
    deliveryId: null,
    startedAt: '2026-11-03T10:00:00.000Z',
    createdAt: '2026-11-03T10:00:00.000Z',
    safeAt: null,
    falseAlarmAt: null,
    closedAt: null,
    closedBy: null,
    outcome: null,
    note: null,
    pointsDeletedAt: null,
  }

  describe('timeAgo (AC-8)', () => {
    const startIso = '2026-11-03T10:00:00.000Z'
    const startTime = new Date(startIso).getTime()

    it('returns "just now" for under 1 min', () => {
      const now = new Date(startTime + 30 * 1000) // 30 seconds
      expect(timeAgo(startIso, now)).toBe('just now')
    })

    it('returns "4 min ago" for 4 minutes', () => {
      const now = new Date(startTime + 4 * 60 * 1000)
      expect(timeAgo(startIso, now)).toBe('4 min ago')
    })

    it('returns "2 h ago" for exactly 2 hours (rest is 0)', () => {
      const now = new Date(startTime + 2 * 60 * 60 * 1000)
      expect(timeAgo(startIso, now)).toBe('2 h ago')
    })

    it('returns "2 h 5 min ago" for 2 hours and 5 minutes', () => {
      const now = new Date(startTime + (2 * 60 + 5) * 60 * 1000)
      expect(timeAgo(startIso, now)).toBe('2 h 5 min ago')
    })
  })

  describe('bannerText (AC-8)', () => {
    it('returns "SOS: <first> <last>, <time ago>" when state is ACTIVE', () => {
      const now = new Date(new Date(baseIncident.startedAt).getTime() + 4 * 60 * 1000)
      expect(bannerText(baseIncident, now)).toBe('SOS: Kostas Papadopoulos, 4 min ago')
    })

    it('returns "<name> marked safe, awaiting close" when state is AWAITING_CLOSE and safeAt is set', () => {
      const incident: SosIncidentAdminDto = {
        ...baseIncident,
        state: 'AWAITING_CLOSE',
        safeAt: '2026-11-03T10:10:00.000Z',
      }
      const now = new Date()
      expect(bannerText(incident, now)).toBe('Kostas Papadopoulos marked safe, awaiting close')
    })

    it('returns "<name> marked false alarm, awaiting close" when state is AWAITING_CLOSE and falseAlarmAt is set', () => {
      const incident: SosIncidentAdminDto = {
        ...baseIncident,
        state: 'AWAITING_CLOSE',
        falseAlarmAt: '2026-11-03T10:08:00.000Z',
      }
      const now = new Date()
      expect(bannerText(incident, now)).toBe('Kostas Papadopoulos marked false alarm, awaiting close')
    })
  })

  describe('riderEnd', () => {
    it('returns "Safe at <Athens time>" when safeAt is set', () => {
      const incident: SosIncidentAdminDto = {
        ...baseIncident,
        safeAt: '2026-11-03T10:00:00.000Z', // 12:00 Athens time in winter (+2)
      }
      const endText = riderEnd(incident)
      expect(endText).toContain('Safe at')
      expect(endText).toContain('12:00')
    })

    it('returns "False alarm at <Athens time>" when falseAlarmAt is set', () => {
      const incident: SosIncidentAdminDto = {
        ...baseIncident,
        falseAlarmAt: '2026-11-03T10:00:00.000Z',
      }
      const endText = riderEnd(incident)
      expect(endText).toContain('False alarm at')
      expect(endText).toContain('12:00')
    })

    it('returns null when neither is set', () => {
      expect(riderEnd(baseIncident)).toBeNull()
    })
  })

  describe('closedByName', () => {
    it('returns username if present', () => {
      expect(
        closedByName({
          ...baseIncident,
          closedBy: { id: 'u-1', username: 'admin_maria', email: 'maria@example.com' },
        }),
      ).toBe('admin_maria')
    })

    it('falls back to email if username is null', () => {
      expect(
        closedByName({
          ...baseIncident,
          closedBy: { id: 'u-1', username: null, email: 'maria@example.com' },
        }),
      ).toBe('maria@example.com')
    })

    it('falls back to "an admin" if both are null', () => {
      expect(
        closedByName({
          ...baseIncident,
          closedBy: { id: 'u-1', username: null, email: null },
        }),
      ).toBe('an admin')
    })

    it('returns null if closedBy is null', () => {
      expect(closedByName(baseIncident)).toBeNull()
    })
  })

  describe('outcomes and labels order (AC-10)', () => {
    it('defines SOS_OUTCOMES in exact order: Rider safe, Help arrived, False alarm, Other', () => {
      expect(SOS_OUTCOMES).toEqual(['RIDER_SAFE', 'HELP_ARRIVED', 'FALSE_ALARM', 'OTHER'])
    })

    it('maps outcome enum values to human labels', () => {
      expect(SOS_OUTCOME_LABELS.RIDER_SAFE).toBe('Rider safe')
      expect(SOS_OUTCOME_LABELS.HELP_ARRIVED).toBe('Help arrived')
      expect(SOS_OUTCOME_LABELS.FALSE_ALARM).toBe('False alarm')
      expect(SOS_OUTCOME_LABELS.OTHER).toBe('Other')
    })

    it('defines SOS_NOTE_MAX as 500', () => {
      expect(SOS_NOTE_MAX).toBe(500)
    })

    it('maps state labels', () => {
      expect(STATE_LABELS.ACTIVE).toBe('Active')
      expect(STATE_LABELS.AWAITING_CLOSE).toBe('Awaiting close')
      expect(STATE_LABELS.CLOSED).toBe('Closed')
    })
  })
})
