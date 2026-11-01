import type { DispatchStopAdminDto } from '@/backend-admin-sdk'
import {
  INSTANCE_TIMEZONE,
  REASON_LABELS,
  athensDateTime,
  athensEnd,
  athensTime,
  athensToday,
  effectiveEnd,
  stopOutcome,
} from './dispatchStopDisplay'

describe('dispatchStopDisplay (spec 0014, AC-1, AC-2, AC-8)', () => {
  const baseStop: DispatchStopAdminDto = {
    id: 'stop-test-1',
    reason: 'HEAT',
    startsAt: '2026-07-15T09:00:00Z',
    endsAt: '2026-07-15T15:00:00Z',
    createdByUserId: 'usr-admin-123456',
    createdAt: '2026-07-15T08:00:00Z',
    startedAt: null,
    endedAt: null,
    endedByUserId: null,
    cancelledAt: null,
    cancelledByUserId: null,
    endWorkDoneAt: null,
  }

  describe('timezone handling (Athens time)', () => {
    it('pins INSTANCE_TIMEZONE as Europe/Athens', () => {
      expect(INSTANCE_TIMEZONE).toBe('Europe/Athens')
    })

    it('always passes timeZone: Europe/Athens to Intl.DateTimeFormat so formatting never falls back to machine zone', () => {
      const spy = jest.spyOn(Intl, 'DateTimeFormat')
      athensTime('2026-07-15T09:00:00Z')
      expect(spy).toHaveBeenLastCalledWith(
        'en-GB',
        expect.objectContaining({ timeZone: 'Europe/Athens' })
      )

      athensDateTime('2026-07-15T09:00:00Z')
      expect(spy).toHaveBeenLastCalledWith(
        'en-GB',
        expect.objectContaining({ timeZone: 'Europe/Athens' })
      )

      athensToday(new Date('2026-07-15T09:00:00Z'))
      expect(spy).toHaveBeenLastCalledWith(
        'en-CA',
        expect.objectContaining({ timeZone: 'Europe/Athens' })
      )

      spy.mockRestore()
    })

    it('athensTime and athensDateTime show Athens time whatever the machine zone (summer: UTC+3, winter: UTC+2)', () => {
      // In Athens:
      // July 15 is summer time (EEST, UTC+3): 09:00:00Z is 12:00 Athens time
      // January 15 is winter time (EET, UTC+2): 10:00:00Z is 12:00 Athens time
      const summerUtc = '2026-07-15T09:00:00Z'
      const winterUtc = '2026-01-15T10:00:00Z'

      // Check time formatting
      expect(athensTime(summerUtc)).toBe('12:00')
      expect(athensTime(winterUtc)).toBe('12:00')

      // Check date and time formatting
      expect(athensDateTime(summerUtc)).toBe('Wed 15 Jul, 12:00')
      expect(athensDateTime(winterUtc)).toBe('Thu 15 Jan, 12:00')
    })

    it('athensToday returns Athens current date as YYYY-MM-DD across midnight UTC boundary', () => {
      // 2026-10-31 at 23:30:00 UTC is already 2026-11-01 at 01:30:00 in Athens (UTC+2)
      const lateNightUtc = new Date('2026-10-31T23:30:00.000Z')
      expect(athensToday(lateNightUtc)).toBe('2026-11-01')

      // 2026-10-31 at 21:30:00 UTC is 2026-10-31 at 23:30:00 in Athens (UTC+2)
      const earlierNightUtc = new Date('2026-10-31T21:30:00.000Z')
      expect(athensToday(earlierNightUtc)).toBe('2026-10-31')

      // Default argument uses current system date formatted as YYYY-MM-DD
      expect(athensToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('athensEnd', () => {
    it('returns only time when from and end fall on the same Athens day', () => {
      // Both July 15, 2026 in Athens
      expect(athensEnd('2026-07-15T09:00:00Z', '2026-07-15T15:00:00Z')).toBe('18:00')
    })

    it('returns date and time when end falls on a different Athens day', () => {
      // July 15 vs July 16, 2026 in Athens
      expect(athensEnd('2026-07-15T09:00:00Z', '2026-07-16T15:00:00Z')).toBe('Thu 16 Jul, 18:00')
    })

    describe('cases either side of Athens midnight', () => {
      it('winter (UTC+2, Athens midnight at 22:00 UTC): handles 1 minute before vs 1 minute after midnight', () => {
        // from: Nov 1 at 20:00 UTC = Nov 1 at 22:00 Athens time
        const fromIso = '2026-11-01T20:00:00Z'

        // 1 minute before Athens midnight: 21:59 UTC = 23:59 Athens on Nov 1 (same day)
        const beforeMidnight = '2026-11-01T21:59:00Z'
        expect(athensEnd(fromIso, beforeMidnight)).toBe('23:59')

        // 1 minute after Athens midnight: 22:01 UTC = 00:01 Athens on Nov 2 (next day)
        const afterMidnight = '2026-11-01T22:01:00Z'
        expect(athensEnd(fromIso, afterMidnight)).toBe('Mon 2 Nov, 00:01')
      })

      it('summer (UTC+3, Athens midnight at 21:00 UTC): handles 1 minute before vs 1 minute after midnight', () => {
        // from: Jul 15 at 19:00 UTC = Jul 15 at 22:00 Athens time
        const fromIso = '2026-07-15T19:00:00Z'

        // 1 minute before Athens midnight: 20:59 UTC = 23:59 Athens on Jul 15 (same day)
        const beforeMidnight = '2026-07-15T20:59:00Z'
        expect(athensEnd(fromIso, beforeMidnight)).toBe('23:59')

        // 1 minute after Athens midnight: 21:01 UTC = 00:01 Athens on Jul 16 (next day)
        const afterMidnight = '2026-07-15T21:01:00Z'
        expect(athensEnd(fromIso, afterMidnight)).toBe('Thu 16 Jul, 00:01')
      })

      it('handles UTC midnight boundary where both timestamps are the same day in Athens', () => {
        // 23:30 UTC Nov 1 = 01:30 Athens Nov 2
        // 02:00 UTC Nov 2 = 04:00 Athens Nov 2
        // Different dates in UTC, but identical dates in Athens -> shows time only
        const fromIso = '2026-11-01T23:30:00Z'
        const endIso = '2026-11-02T02:00:00Z'
        expect(athensEnd(fromIso, endIso)).toBe('04:00')
      })
    })
  })

  describe('stopOutcome (AC-8: the record)', () => {
    it('returns "Cancelled <date> by <last 6 of cancelledByUserId>" when cancelledAt and cancelledByUserId are set', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        cancelledAt: '2026-07-15T09:00:00Z',
        cancelledByUserId: 'usr-admin-cancel',
      }
      expect(stopOutcome(stop)).toBe('Cancelled Wed 15 Jul, 12:00 by cancel')
    })

    it('returns "Cancelled <date>" without "by" when cancelledByUserId is missing', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        cancelledAt: '2026-07-15T09:00:00Z',
        cancelledByUserId: null,
      }
      expect(stopOutcome(stop)).toBe('Cancelled Wed 15 Jul, 12:00')
    })

    it('returns "Restarted <date> by <last 6 of endedByUserId>" when endedAt and endedByUserId are set', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        startedAt: '2026-07-15T09:00:00Z',
        endedAt: '2026-07-15T10:30:00Z',
        endedByUserId: 'usr-admin-restart',
      }
      expect(stopOutcome(stop)).toBe('Restarted Wed 15 Jul, 13:30 by estart')
    })

    it('returns "Restarted <date>" without "by" when endedByUserId is missing', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        startedAt: '2026-07-15T09:00:00Z',
        endedAt: '2026-07-15T10:30:00Z',
        endedByUserId: null,
      }
      expect(stopOutcome(stop)).toBe('Restarted Wed 15 Jul, 13:30')
    })

    it('returns "Ended as planned" when endWorkDoneAt is set with no manual end or cancel', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        startedAt: '2026-07-15T09:00:00Z',
        endWorkDoneAt: '2026-07-15T15:00:00Z',
      }
      expect(stopOutcome(stop)).toBe('Ended as planned')
    })

    it('returns "On" when startedAt is set with no end or cancel', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        startedAt: '2026-07-15T09:00:00Z',
      }
      expect(stopOutcome(stop)).toBe('On')
    })

    it('returns "Scheduled" when no start, end or cancel has occurred', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
      }
      expect(stopOutcome(stop)).toBe('Scheduled')
    })
  })

  describe('effectiveEnd', () => {
    it('prefers endedAt over planned endsAt', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        endsAt: '2026-07-15T15:00:00Z',
        endedAt: '2026-07-15T13:00:00Z',
      }
      expect(effectiveEnd(stop)).toBe('2026-07-15T13:00:00Z')
    })

    it('falls back to planned endsAt when endedAt is null', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        endsAt: '2026-07-15T15:00:00Z',
        endedAt: null,
      }
      expect(effectiveEnd(stop)).toBe('2026-07-15T15:00:00Z')
    })

    it('returns null when both endedAt and endsAt are null (until restarted)', () => {
      const stop: DispatchStopAdminDto = {
        ...baseStop,
        endsAt: null,
        endedAt: null,
      }
      expect(effectiveEnd(stop)).toBeNull()
    })
  })

  describe('REASON_LABELS', () => {
    it('maps all enum values to human labels', () => {
      expect(REASON_LABELS.HEAT).toBe('Heat')
      expect(REASON_LABELS.STORM).toBe('Storm')
      expect(REASON_LABELS.OTHER).toBe('Other')
    })
  })
})
