import {
  currentAthensMonth,
  shiftMonth,
  isMonth,
  monthTitle,
  athensDayTime,
  athensIsoMinute,
} from './athensMonth'

describe('athensMonth (spec 0036, AC-1, AC-2)', () => {
  describe('currentAthensMonth', () => {
    it('returns 2026-12 for 2026-11-30T22:30:00Z because Athens is already in December (UTC+2)', () => {
      const date = new Date('2026-11-30T22:30:00Z')
      expect(currentAthensMonth(date)).toBe('2026-12')
    })

    it('returns 2026-11 for 2026-11-30T21:59:00Z because Athens is still in November', () => {
      const date = new Date('2026-11-30T21:59:00Z')
      expect(currentAthensMonth(date)).toBe('2026-11')
    })

    it('returns 2026-08 for 2026-07-31T21:30:00Z because Athens is in EEST (UTC+3) and already August', () => {
      const date = new Date('2026-07-31T21:30:00Z')
      expect(currentAthensMonth(date)).toBe('2026-08')
    })

    it('handles DST edges correctly in spring and autumn', () => {
      // Spring transition: 31 March 2026 (Athens is UTC+3 in summer)
      expect(currentAthensMonth(new Date('2026-03-31T20:59:00Z'))).toBe('2026-03')
      expect(currentAthensMonth(new Date('2026-03-31T21:00:00Z'))).toBe('2026-04')

      // Autumn transition: 31 October 2026 (Athens moves back to UTC+2)
      expect(currentAthensMonth(new Date('2026-10-31T21:59:59Z'))).toBe('2026-10')
      expect(currentAthensMonth(new Date('2026-10-31T22:00:00Z'))).toBe('2026-11')
    })

    it('defaults to the current date when no argument is given', () => {
      const result = currentAthensMonth()
      expect(isMonth(result)).toBe(true)
    })
  })

  describe('shiftMonth', () => {
    it('steps back across a year end: shiftMonth("2026-01", -1) is "2025-12"', () => {
      expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    })

    it('steps forward across a year end: shiftMonth("2026-12", 1) is "2027-01"', () => {
      expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    })

    it('handles stepping within the same year', () => {
      expect(shiftMonth('2026-06', 0)).toBe('2026-06')
      expect(shiftMonth('2026-06', 2)).toBe('2026-08')
      expect(shiftMonth('2026-06', -2)).toBe('2026-04')
    })
  })

  describe('isMonth', () => {
    it('accepts valid YYYY-MM strings from 1970 onwards', () => {
      expect(isMonth('2026-11')).toBe(true)
      expect(isMonth('1970-01')).toBe(true)
      expect(isMonth('2030-12')).toBe(true)
    })

    it('refuses invalid month numbers: "2026-13", "2026-00"', () => {
      expect(isMonth('2026-13')).toBe(false)
      expect(isMonth('2026-00')).toBe(false)
    })

    it('refuses malformed formats: "26-11", "2026-1", "2026/11"', () => {
      expect(isMonth('26-11')).toBe(false)
      expect(isMonth('2026-1')).toBe(false)
      expect(isMonth('2026/11')).toBe(false)
    })

    it('refuses years before 1970: "1969-12"', () => {
      expect(isMonth('1969-12')).toBe(false)
    })

    it('refuses non-string inputs: null, undefined, numbers, arrays', () => {
      expect(isMonth(null)).toBe(false)
      expect(isMonth(undefined)).toBe(false)
      expect(isMonth(202611)).toBe(false)
      expect(isMonth(['2026-11'])).toBe(false)
    })
  })

  describe('monthTitle', () => {
    it('formats month as English month and year: "November 2026"', () => {
      expect(monthTitle('2026-11')).toBe('November 2026')
      expect(monthTitle('2025-01')).toBe('January 2025')
    })
  })

  describe('athensDayTime and athensIsoMinute', () => {
    it('prints 00:00 at Athens midnight, not 24:00', () => {
      // 2026-11-30 22:00:00 UTC = 2026-12-01 00:00:00 in Athens (UTC+2)
      const midnightUtc = '2026-11-30T22:00:00Z'
      expect(athensDayTime(midnightUtc)).toBe('01/12/2026 00:00')
      expect(athensIsoMinute(midnightUtc)).toBe('2026-12-01 00:00')
    })

    it('formats daylight instant into Athens time components', () => {
      // 2026-11-18 12:05:00 UTC = 2026-11-18 14:05:00 in Athens (UTC+2)
      const iso = '2026-11-18T12:05:00Z'
      expect(athensDayTime(iso)).toBe('18/11/2026 14:05')
      expect(athensIsoMinute(iso)).toBe('2026-11-18 14:05')
    })
  })
})
