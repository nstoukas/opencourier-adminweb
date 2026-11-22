import {
  isDay,
  addDays,
  daysInRange,
  rangeFromQuery,
  formatDay,
  weekPart,
  formatDuration,
  formatShare,
  TOTALS_MAX_DAYS,
  RIDER_MAX_DAYS,
  CAUSE_KEYS,
  END_KEYS,
  formatKm,
  jobMinutes,
  isUnderAMinute,
} from './timeWorkedFormat'
import type { JobEndLabel } from '../../backend-admin-sdk'
import { createI18n } from '@/i18n/createI18n'
import { showMessage } from '@/i18n/shownMessage'
import { enumLabel } from '@/i18n/enumLabel'

const t = createI18n('en').t

describe('timeWorkedFormat (spec 0040 AC-14, AC-15, AC-18; spec 0042 AC-1, AC-8)', () => {
  describe('isDay', () => {
    it('accepts valid calendar dates in YYYY-MM-DD format', () => {
      expect(isDay('2026-11-20')).toBe(true)
      expect(isDay('2026-02-28')).toBe(true)
      expect(isDay('2024-02-29')).toBe(true) // 2024 is a leap year
    })

    it('refuses 2026-02-30 and non-existent calendar days', () => {
      expect(isDay('2026-02-30')).toBe(false)
      expect(isDay('2026-02-29')).toBe(false) // 2026 is not a leap year
      expect(isDay('2026-04-31')).toBe(false) // April has 30 days
      expect(isDay('2026-13-01')).toBe(false) // Month 13
    })

    it('refuses non-dates, malformed strings, and non-string types', () => {
      expect(isDay('not-a-date')).toBe(false)
      expect(isDay('2026-1-1')).toBe(false)
      expect(isDay('2026/11/20')).toBe(false)
      expect(isDay('')).toBe(false)
      expect(isDay(null)).toBe(false)
      expect(isDay(undefined)).toBe(false)
      expect(isDay(12345)).toBe(false)
      expect(isDay({})).toBe(false)
    })
  })

  describe('addDays and daysInRange on calendar days', () => {
    it('adds and subtracts calendar days correctly crossing month boundaries', () => {
      expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
      expect(addDays('2026-11-20', -6)).toBe('2026-11-14')
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    })

    it('calculates daysInRange inclusive of both endpoints', () => {
      expect(daysInRange('2026-11-20', '2026-11-20')).toBe(1)
      expect(daysInRange('2026-11-14', '2026-11-20')).toBe(7)
      expect(daysInRange('2026-01-01', '2026-01-31')).toBe(31)
      // 92 days: Jan (31) + Feb (28) + Mar (31) + Apr 1..2 (2) = 92 days
      expect(daysInRange('2026-01-01', '2026-04-02')).toBe(92)
    })
  })

  describe('rangeFromQuery', () => {
    const fixedNow = new Date('2026-11-20T12:00:00Z')

    it('returns default fallback range with no problem when from and to are undefined', () => {
      const { range, problem } = rangeFromQuery(undefined, undefined, 92, 28, fixedNow)
      expect(problem).toBeNull()
      expect(range.to).toBe('2026-11-20')
      expect(range.from).toBe(addDays('2026-11-20', -27)) // 28 days inclusive
      expect(daysInRange(range.from, range.to)).toBe(28)
    })

    it('falls back to last N days with a sentence for a malformed day', () => {
      const res1 = rangeFromQuery('bad-date', '2026-11-20', 92, 28, fixedNow)
      expect(res1.problem && showMessage(res1.problem, t)).toBe('The dates must be days written as YYYY-MM-DD.')
      expect(res1.range.to).toBe('2026-11-20')
      expect(daysInRange(res1.range.from, res1.range.to)).toBe(28)

      const res2 = rangeFromQuery('2026-11-20', '2026-02-30', 92, 28, fixedNow)
      expect(res2.problem && showMessage(res2.problem, t)).toBe('The dates must be days written as YYYY-MM-DD.')
      expect(res2.range.to).toBe('2026-11-20')
    })

    it('falls back to last N days with a sentence when from is after to', () => {
      const res = rangeFromQuery('2026-11-25', '2026-11-20', 92, 28, fixedNow)
      expect(res.problem && showMessage(res.problem, t)).toBe('The first day must be on or before the last day.')
      expect(res.range.to).toBe('2026-11-20')
      expect(daysInRange(res.range.from, res.range.to)).toBe(28)
    })

    it('falls back to last N days with a sentence when range exceeds limit', () => {
      const from = '2026-01-01'
      const to = '2026-04-03' // 93 days
      expect(daysInRange(from, to)).toBe(93)

      const res = rangeFromQuery(from, to, 92, 28, fixedNow)
      expect(res.problem && showMessage(res.problem, t)).toBe('A range may cover at most 92 days.')
      expect(res.range.to).toBe('2026-11-20')
      expect(daysInRange(res.range.from, res.range.to)).toBe(28)
    })

    it('accepts exactly 92 days for totals and refuses 93 days (AC-14, AC-18)', () => {
      const from = '2026-01-01'
      const to92 = '2026-04-02' // exactly 92 days
      expect(daysInRange(from, to92)).toBe(TOTALS_MAX_DAYS)

      const accepted = rangeFromQuery(from, to92, TOTALS_MAX_DAYS, 28, fixedNow)
      expect(accepted.problem).toBeNull()
      expect(accepted.range).toEqual({ from, to: to92 })

      const to93 = '2026-04-03' // 93 days
      const rejected = rangeFromQuery(from, to93, TOTALS_MAX_DAYS, 28, fixedNow)
      expect(rejected.problem && showMessage(rejected.problem, t)).toBe('A range may cover at most 92 days.')
      expect(rejected.range.to).toBe('2026-11-20')
    })

    it('accepts exactly 31 days for rider and refuses 32 days (AC-15, AC-18)', () => {
      const from = '2026-01-01'
      const to31 = '2026-01-31' // exactly 31 days
      expect(daysInRange(from, to31)).toBe(RIDER_MAX_DAYS)

      const accepted = rangeFromQuery(from, to31, RIDER_MAX_DAYS, 7, fixedNow)
      expect(accepted.problem).toBeNull()
      expect(accepted.range).toEqual({ from, to: to31 })

      const to32 = '2026-02-01' // 32 days
      const rejected = rangeFromQuery(from, to32, RIDER_MAX_DAYS, 7, fixedNow)
      expect(rejected.problem).not.toBeNull()
      expect(rejected.problem && showMessage(rejected.problem, t)).toBe('A range may cover at most 31 days.')
      expect(rejected.range.to).toBe('2026-11-20')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds into minutes when under one hour', () => {
      expect(formatDuration(0, t)).toBe('0 min')
      expect(formatDuration(59, t)).toBe('0 min')
      expect(formatDuration(60, t)).toBe('1 min')
      expect(formatDuration(48 * 60, t)).toBe('48 min')
      expect(formatDuration(48 * 60 + 45, t)).toBe('48 min')
    })

    it('formats seconds into hours and minutes when one hour or more', () => {
      expect(formatDuration(3600, t)).toBe('1 h 00 min')
      expect(formatDuration(3 * 3600 + 12 * 60, t)).toBe('3 h 12 min')
      expect(formatDuration(2 * 3600 + 5 * 60, t)).toBe('2 h 05 min')
    })

    it('clamps negative values to 0 min', () => {
      expect(formatDuration(-120, t)).toBe('0 min')
    })
  })

  describe('formatShare', () => {
    it('formats percentage correctly as rounded integer', () => {
      expect(formatShare(38, 100)).toBe('38%')
      expect(formatShare(1, 3)).toBe('33%')
      expect(formatShare(2, 3)).toBe('67%')
      expect(formatShare(100, 100)).toBe('100%')
    })

    it('returns em dash "—" with no work (whole === 0)', () => {
      expect(formatShare(0, 0)).toBe('—')
      expect(formatShare(10, 0)).toBe('—')
    })
  })

  describe('formatDay', () => {
    it('formats day with weekday by default, matching previous dayTitle text', () => {
      expect(formatDay('2026-11-19', true, 'en')).toBe('Thu, 19 Nov 2026')
    })

    it('formats day without weekday for weeks, matching previous periodLabel text', () => {
      expect(formatDay('2026-11-19', false, 'en')).toBe('19 Nov 2026')
    })
  })

  describe('weekPart (decision 36.49)', () => {
    it('returns part of the week naming Sat 24 Oct to Sun 25 Oct when cut at start', () => {
      expect(weekPart('2026-10-19', { from: '2026-10-24', to: '2026-11-20' }, t, 'en')).toBe(
        'part of the week: Sat 24 Oct to Sun 25 Oct'
      )
    })

    it('returns null when the week is fully inside the range', () => {
      // 2026-10-26 (Mon) to 2026-11-01 (Sun) fully inside 2026-10-24 to 2026-11-20
      expect(weekPart('2026-10-26', { from: '2026-10-24', to: '2026-11-20' }, t, 'en')).toBeNull()
    })

    it('names both days when cut at both ends', () => {
      // 2026-10-19 Monday week, range from Tue 20 Oct to Fri 23 Oct
      expect(weekPart('2026-10-19', { from: '2026-10-20', to: '2026-10-23' }, t, 'en')).toBe(
        'part of the week: Tue 20 Oct to Fri 23 Oct'
      )
    })

    it('names single day when cut to one day only', () => {
      expect(weekPart('2026-10-19', { from: '2026-10-25', to: '2026-11-20' }, t, 'en')).toBe(
        'part of the week: Sun 25 Oct only'
      )
    })
  })

  describe('domain labels (spec 0040 AC-15; spec 0042 AC-8)', () => {
    it('maps all status codes to human labels', () => {
      expect(enumLabel(t, 'courierStatus', 'ONLINE')).toBe('Online')
      expect(enumLabel(t, 'courierStatus', 'OFFLINE')).toBe('Offline')
      expect(enumLabel(t, 'courierStatus', 'LAST_CALL')).toBe('Last Call')
    })

    it('maps all status change causes to human labels', () => {
      expect(t(CAUSE_KEYS.RIDER)).toBe('by the rider')
      expect(t(CAUSE_KEYS.ADMIN)).toBe('by an admin')
      expect(t(CAUSE_KEYS.CUT_OFF)).toBe('by a password change')
      expect(t(CAUSE_KEYS.LAST_CALL_ACCEPTED)).toBe('on accepting their last job')
      expect(t(CAUSE_KEYS.SYSTEM_START)).toBe('when recording began')
    })

    it('maps every JobEndLabel to human text in END_KEYS (spec 0042 AC-8)', () => {
      const expected: Record<JobEndLabel, string> = {
        CANCELLED_AFTER_PICKUP: 'Cancelled after pickup',
        CANCELLED: 'Cancelled',
        REMOVED: 'Removed',
        HANDED_BACK: 'Handed back',
        REASSIGNED: 'Reassigned',
        FAILED: 'Failed',
        ENDED: 'Ended',
        IN_PROGRESS: 'In progress',
      }
      const keys = Object.keys(expected) as JobEndLabel[]
      expect(Object.keys(END_KEYS)).toHaveLength(keys.length)
      for (const key of keys) {
        expect(t(END_KEYS[key])).toBe(expected[key])
      }
    })
  })

  describe('formatKm (spec 0042 AC-1, AC-3)', () => {
    it('formats km to exactly one decimal with "km" suffix', () => {
      expect(formatKm(0, 'en')).toBe('0.0 km')
      expect(formatKm(1, 'en')).toBe('1.0 km')
      expect(formatKm(1.2, 'en')).toBe('1.2 km')
      expect(formatKm(1.24, 'en')).toBe('1.2 km')
      expect(formatKm(1.25, 'en')).toBe('1.3 km')
      expect(formatKm(2.482, 'en')).toBe('2.5 km')
      expect(formatKm(10.04, 'en')).toBe('10.0 km')
      expect(formatKm(10.06, 'en')).toBe('10.1 km')
    })
  })

  describe('jobMinutes (spec 0042 AC-1, AC-8)', () => {
    it('rounds accept to endedAt to whole minutes as the server rounds them', () => {
      // Exactly 20 minutes (1200 seconds)
      expect(
        jobMinutes({
          acceptedAt: '2026-11-20T10:00:00.000Z',
          endedAt: '2026-11-20T10:20:00.000Z',
        })
      ).toBe(20)

      // 20 min 29 sec -> 20 min (rounds down)
      expect(
        jobMinutes({
          acceptedAt: '2026-11-20T10:00:00.000Z',
          endedAt: '2026-11-20T10:20:29.000Z',
        })
      ).toBe(20)

      // 20 min 30 sec -> 21 min (rounds half up)
      expect(
        jobMinutes({
          acceptedAt: '2026-11-20T10:00:00.000Z',
          endedAt: '2026-11-20T10:20:30.000Z',
        })
      ).toBe(21)

      // Under 30 seconds -> 0 min
      expect(
        jobMinutes({
          acceptedAt: '2026-11-20T10:00:00.000Z',
          endedAt: '2026-11-20T10:00:25.000Z',
        })
      ).toBe(0)

      // 45 seconds -> 1 min
      expect(
        jobMinutes({
          acceptedAt: '2026-11-20T10:00:00.000Z',
          endedAt: '2026-11-20T10:00:45.000Z',
        })
      ).toBe(1)
    })

    it('runs to now when job is still held (endedAt is null)', () => {
      const acceptedAt = '2026-11-20T10:00:00.000Z'
      const customNow = Date.parse('2026-11-20T10:14:40.000Z') // 14 min 40 s -> 15 min

      // Passed explicit now
      expect(jobMinutes({ acceptedAt, endedAt: null }, customNow)).toBe(15)

      // Using default now via Date.now spy
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T10:45:00.000Z'))
      try {
        expect(jobMinutes({ acceptedAt, endedAt: null })).toBe(45)
      } finally {
        dateNowSpy.mockRestore()
      }
    })

    it('never returns a negative number when in progress job acceptedAt is after now (review nit)', () => {
      const customNow = Date.parse('2026-11-20T10:00:00.000Z')

      // Client clock is 5 minutes behind server clock
      expect(
        jobMinutes(
          {
            acceptedAt: '2026-11-20T10:05:00.000Z',
            endedAt: null,
          },
          customNow
        )
      ).toBe(0)

      // Client clock is 1 minute behind server clock
      expect(
        jobMinutes(
          {
            acceptedAt: '2026-11-20T10:01:00.000Z',
            endedAt: null,
          },
          customNow
        )
      ).toBe(0)

      // Client clock is 20 seconds behind server clock
      expect(
        jobMinutes(
          {
            acceptedAt: '2026-11-20T10:00:20.000Z',
            endedAt: null,
          },
          customNow
        )
      ).toBe(0)
    })
  })

  describe('isUnderAMinute (row 122)', () => {
    it('returns true for breaks shorter than 60 seconds (59 s or less)', () => {
      // 0 ms duration (instantaneous pause)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:35:00.000Z',
        })
      ).toBe(true)

      // 30 seconds (30_000 ms)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:10.000Z',
          endedAt: '2026-11-19T23:35:40.000Z',
        })
      ).toBe(true)

      // 45 seconds (45_000 ms, catches threshold moved to < 45_000)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:35:45.000Z',
        })
      ).toBe(true)

      // 59 seconds (59_000 ms, pins the threshold from the lower side)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:35:59.000Z',
        })
      ).toBe(true)

      // 59.999 seconds (59_999 ms)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:35:59.999Z',
        })
      ).toBe(true)
    })

    it('returns false for breaks of exactly 60 seconds (pins threshold strictly < 60_000, not <= 60_000)', () => {
      // Exactly 60 seconds (60_000 ms)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:36:00.000Z',
        })
      ).toBe(false)
    })

    it('returns false for breaks longer than 60 seconds', () => {
      // 60 seconds and 1 ms (60_001 ms)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:36:00.001Z',
        })
      ).toBe(false)

      // 61 seconds (61_000 ms)
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:36:01.000Z',
        })
      ).toBe(false)

      // 5 minutes
      expect(
        isUnderAMinute({
          startedAt: '2026-11-19T23:35:00.000Z',
          endedAt: '2026-11-19T23:40:00.000Z',
        })
      ).toBe(false)
    })
  })
})
