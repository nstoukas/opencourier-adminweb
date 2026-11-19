import {
  isDay,
  addDays,
  daysInRange,
  rangeFromQuery,
  formatDuration,
  formatShare,
  TOTALS_MAX_DAYS,
  RIDER_MAX_DAYS,
  STATUS_LABELS,
  CAUSE_LABELS,
  JOB_END_LABELS,
  COMPENSATION_LABELS,
} from './timeWorkedFormat'

describe('timeWorkedFormat (spec 0040, AC-14, AC-15, AC-18)', () => {
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
      expect(res1.problem).toBe('The dates must be days written as YYYY-MM-DD.')
      expect(res1.range.to).toBe('2026-11-20')
      expect(daysInRange(res1.range.from, res1.range.to)).toBe(28)

      const res2 = rangeFromQuery('2026-11-20', '2026-02-30', 92, 28, fixedNow)
      expect(res2.problem).toBe('The dates must be days written as YYYY-MM-DD.')
      expect(res2.range.to).toBe('2026-11-20')
    })

    it('falls back to last N days with a sentence when from is after to', () => {
      const res = rangeFromQuery('2026-11-25', '2026-11-20', 92, 28, fixedNow)
      expect(res.problem).toBe('The first day must be on or before the last day.')
      expect(res.range.to).toBe('2026-11-20')
      expect(daysInRange(res.range.from, res.range.to)).toBe(28)
    })

    it('falls back to last N days with a sentence when range exceeds limit', () => {
      const from = '2026-01-01'
      const to = '2026-04-03' // 93 days
      expect(daysInRange(from, to)).toBe(93)

      const res = rangeFromQuery(from, to, 92, 28, fixedNow)
      expect(res.problem).toBe('A range may cover at most 92 days.')
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
      expect(rejected.problem).toBe('A range may cover at most 92 days.')
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
      expect(rejected.problem).toBe('A range may cover at most 31 days.')
      expect(rejected.range.to).toBe('2026-11-20')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds into minutes when under one hour', () => {
      expect(formatDuration(0)).toBe('0 min')
      expect(formatDuration(59)).toBe('0 min')
      expect(formatDuration(60)).toBe('1 min')
      expect(formatDuration(48 * 60)).toBe('48 min')
      expect(formatDuration(48 * 60 + 45)).toBe('48 min')
    })

    it('formats seconds into hours and minutes when one hour or more', () => {
      expect(formatDuration(3600)).toBe('1 h 00 min')
      expect(formatDuration(3 * 3600 + 12 * 60)).toBe('3 h 12 min')
      expect(formatDuration(2 * 3600 + 5 * 60)).toBe('2 h 05 min')
    })

    it('clamps negative values to 0 min', () => {
      expect(formatDuration(-120)).toBe('0 min')
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

  describe('domain labels', () => {
    it('maps all status codes to human labels', () => {
      expect(STATUS_LABELS.ONLINE).toBe('Online')
      expect(STATUS_LABELS.OFFLINE).toBe('Offline')
      expect(STATUS_LABELS.LAST_CALL).toBe('Last Call')
    })

    it('maps all status change causes to human labels', () => {
      expect(CAUSE_LABELS.RIDER).toBe('by the rider')
      expect(CAUSE_LABELS.ADMIN).toBe('by an admin')
      expect(CAUSE_LABELS.CUT_OFF).toBe('by a password change')
      expect(CAUSE_LABELS.LAST_CALL_ACCEPTED).toBe('on accepting their last job')
      expect(CAUSE_LABELS.SYSTEM_START).toBe('when recording began')
    })

    it('maps job end event types and compensations', () => {
      expect(JOB_END_LABELS.DROPPED_OFF).toBe('delivered')
      expect(JOB_END_LABELS.CANCELED).toBe('cancelled')
      expect(COMPENSATION_LABELS.WAITING).toBe('Waiting')
      expect(COMPENSATION_LABELS.CANCELLATION).toBe('Cancelled job')
    })
  })
})
