import {
  WEEKDAYS,
  clockToMinutes,
  describeSlot as rawDescribeSlot,
  minutesToClock,
  weekdayLabel as rawWeekdayLabel,
} from './shiftSlotDisplay'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
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
})
