import {
  WEEKDAYS,
  clockToMinutes,
  describeOfflineShift,
  describeSlot as rawDescribeSlot,
  minutesToClock,
  weekdayLabel as rawWeekdayLabel,
} from './shiftSlotDisplay'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
const tEl = createI18n('el').t
const weekdayLabel = (weekday: number) => rawWeekdayLabel(weekday, t, 'en')
const describeSlot = (slot: any) => rawDescribeSlot(slot, t, 'en')

// Spec 0026 (row 77): how slot times and days read in admin, and how a typed time becomes minutes.
describe('shiftSlotDisplay (spec 0026)', () => {
  describe('minutesToClock', () => {
    it.each([
      [0, '00:00'],
      [1, '00:01'],
      [59, '00:59'],
      [60, '01:00'],
      [545, '09:05'],
      [1140, '19:00'],
      [1439, '23:59'],
      [1440, '24:00'],
    ])('%i minutes reads %s', (minutes, clock) => {
      expect(minutesToClock(minutes)).toBe(clock)
    })
  })

  describe('clockToMinutes', () => {
    it.each([
      ['00:00', 0],
      ['00:01', 1],
      ['09:05', 545],
      ['19:00', 1140],
      ['23:59', 1439],
      [' 19:00 ', 1140],
    ])('%p is %i minutes, in either box', (text, minutes) => {
      expect(clockToMinutes(text, false)).toBe(minutes)
      expect(clockToMinutes(text, true)).toBe(minutes)
    })

    it('"24:00" is 1440 only where midnight is allowed (the End box)', () => {
      expect(clockToMinutes('24:00', true)).toBe(1440)
      expect(clockToMinutes('24:00', false)).toBeNull()
    })

    it.each(['7:00', '24:01', '25:00', '19:60', '19:5', '1900', '19.00', 'seven', '', '  ', '-1:00', '19:00:00'])(
      'refuses %p (null) in both boxes',
      (text) => {
        expect(clockToMinutes(text, false)).toBeNull()
        expect(clockToMinutes(text, true)).toBeNull()
      }
    )

    it('round-trips every whole minute of the day through minutesToClock', () => {
      for (let minutes = 0; minutes < 1440; minutes++) {
        expect(clockToMinutes(minutesToClock(minutes), false)).toBe(minutes)
      }
      expect(clockToMinutes(minutesToClock(1440), true)).toBe(1440)
    })
  })

  describe('weekdays', () => {
    it('WEEKDAYS is ISO, Monday first: 1 Monday to 7 Sunday', () => {
      expect(WEEKDAYS).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    it('weekdayLabel names each ISO day, and an unknown one as "Day N"', () => {
      expect(weekdayLabel(1)).toBe('Monday')
      expect(weekdayLabel(5)).toBe('Friday')
      expect(weekdayLabel(7)).toBe('Sunday')
      expect(weekdayLabel(0)).toBe('Day 0')
      expect(weekdayLabel(8)).toBe('Day 8')
    })
  })

  describe('describeSlot', () => {
    it('reads "Friday 19:00 to 23:00, 6 riders"', () => {
      expect(describeSlot({ weekday: 5, startMinute: 1140, endMinute: 1380, riderCap: 6 })).toBe(
        'Friday 19:00 to 23:00, 6 riders'
      )
    })

    it('says "1 rider" for a cap of one, and 24:00 for a midnight end', () => {
      expect(describeSlot({ weekday: 7, startMinute: 1320, endMinute: 1440, riderCap: 1 })).toBe(
        'Sunday 22:00 to 24:00, 1 rider'
      )
    })

    it('reads a Monday early slot', () => {
      expect(describeSlot({ weekday: 1, startMinute: 0, endMinute: 120, riderCap: 50 })).toBe(
        'Monday 00:00 to 02:00, 50 riders'
      )
    })
  })

  // Row 124 (decisions 124.4, 124.7, 124.8): Offline shift description from ISO start/end
  describe('describeOfflineShift (row 124)', () => {
    it('words winter shift in Athens time with 24:00 midnight rule in English and Greek', () => {
      const event = {
        shiftDate: '2026-11-20',
        shiftStartsAt: '2026-11-20T18:00:00.000Z', // 20:00 Athens (UTC+2)
        shiftEndsAt: '2026-11-20T22:00:00.000Z', // 00:00 Athens next day -> 24:00
        shiftText: 'Fri 20 Nov, 20:00 to 24:00',
      }
      expect(describeOfflineShift(event, t, 'en')).toBe('Fri 20/11, 20:00 to 24:00')
      expect(describeOfflineShift(event, tEl, 'el')).toBe('Παρ 20/11, 20:00 έως 24:00')
    })

    it('words winter shift ending at 23:59 Athens in English and Greek', () => {
      const event = {
        shiftDate: '2026-11-20',
        shiftStartsAt: '2026-11-20T18:00:00.000Z',
        shiftEndsAt: '2026-11-20T21:59:00.000Z',
        shiftText: 'Fri 20 Nov, 20:00 to 23:59',
      }
      expect(describeOfflineShift(event, t, 'en')).toBe('Fri 20/11, 20:00 to 23:59')
      expect(describeOfflineShift(event, tEl, 'el')).toBe('Παρ 20/11, 20:00 έως 23:59')
    })

    it('words summer shift in Athens time (UTC+3) with 24:00 midnight rule', () => {
      const event = {
        shiftDate: '2026-07-17',
        shiftStartsAt: '2026-07-17T17:00:00.000Z', // 20:00 Athens
        shiftEndsAt: '2026-07-17T21:00:00.000Z', // 24:00 Athens
        shiftText: 'Fri 17 Jul, 20:00 to 24:00',
      }
      expect(describeOfflineShift(event, t, 'en')).toBe('Fri 17/07, 20:00 to 24:00')
      expect(describeOfflineShift(event, tEl, 'el')).toBe('Παρ 17/07, 20:00 έως 24:00')
    })

    it('words DST transition shifts correctly (before DST end in Oct and DST start in Mar)', () => {
      // Night before DST ends: Sat 24 Oct 2026 (UTC+3)
      const dstEnd = {
        shiftDate: '2026-10-24',
        shiftStartsAt: '2026-10-24T17:00:00.000Z',
        shiftEndsAt: '2026-10-24T21:00:00.000Z',
        shiftText: 'Sat 24 Oct, 20:00 to 24:00',
      }
      expect(describeOfflineShift(dstEnd, t, 'en')).toBe('Sat 24/10, 20:00 to 24:00')
      expect(describeOfflineShift(dstEnd, tEl, 'el')).toBe('Σάβ 24/10, 20:00 έως 24:00')

      // Night before DST starts: Sat 28 Mar 2026 (UTC+2)
      const dstStart = {
        shiftDate: '2026-03-28',
        shiftStartsAt: '2026-03-28T18:00:00.000Z',
        shiftEndsAt: '2026-03-28T22:00:00.000Z',
        shiftText: 'Sat 28 Mar, 20:00 to 24:00',
      }
      expect(describeOfflineShift(dstStart, t, 'en')).toBe('Sat 28/03, 20:00 to 24:00')
      expect(describeOfflineShift(dstStart, tEl, 'el')).toBe('Σάβ 28/03, 20:00 έως 24:00')
    })

    it('words shift starting at Athens midnight and shift ending after midnight (e.g. 00:30)', () => {
      const midnightStart = {
        shiftDate: '2026-11-21',
        shiftStartsAt: '2026-11-20T22:00:00.000Z', // 00:00 Athens
        shiftEndsAt: '2026-11-21T02:00:00.000Z', // 04:00 Athens
        shiftText: 'Sat 21 Nov, 00:00 to 04:00',
      }
      expect(describeOfflineShift(midnightStart, t, 'en')).toBe('Sat 21/11, 00:00 to 04:00')
      expect(describeOfflineShift(midnightStart, tEl, 'el')).toBe('Σάβ 21/11, 00:00 έως 04:00')

      const afterMidnightEnd = {
        shiftDate: '2026-11-20',
        shiftStartsAt: '2026-11-20T18:00:00.000Z',
        shiftEndsAt: '2026-11-20T22:30:00.000Z', // 00:30 Athens
        shiftText: 'Fri 20 Nov, 20:00 to 00:30',
      }
      expect(describeOfflineShift(afterMidnightEnd, t, 'en')).toBe('Fri 20/11, 20:00 to 00:30')
      expect(describeOfflineShift(afterMidnightEnd, tEl, 'el')).toBe('Παρ 20/11, 20:00 έως 00:30')
    })

    it('falls back to server shiftText when either date is missing, empty, or invalid', () => {
      const fallbackText = 'Fri 20 Nov, 20:00 to 23:59'
      const base = { shiftDate: '2026-11-20', shiftText: fallbackText }

      expect(describeOfflineShift({ ...base, shiftStartsAt: undefined, shiftEndsAt: '2026-11-20T22:00:00.000Z' }, t, 'en')).toBe(fallbackText)
      expect(describeOfflineShift({ ...base, shiftStartsAt: '2026-11-20T18:00:00.000Z', shiftEndsAt: undefined }, t, 'en')).toBe(fallbackText)
      expect(describeOfflineShift({ ...base, shiftStartsAt: '', shiftEndsAt: '2026-11-20T22:00:00.000Z' }, t, 'en')).toBe(fallbackText)
      expect(describeOfflineShift({ ...base, shiftStartsAt: 'invalid-date', shiftEndsAt: '2026-11-20T22:00:00.000Z' }, t, 'en')).toBe(fallbackText)
      expect(describeOfflineShift({ ...base, shiftStartsAt: '2026-11-20T18:00:00.000Z', shiftEndsAt: 'not-a-date' }, t, 'en')).toBe(fallbackText)
    })
  })
})
