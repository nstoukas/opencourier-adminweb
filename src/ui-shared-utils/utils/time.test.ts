import { formatOptionalDate, formatDate, DATE_TIME_FORMAT } from './time'
import dayjs from 'dayjs'

describe('DATE_TIME_FORMAT constant', () => {
  it('is exported as DD/MM/YYYY, HH:mm (day first, 24 hour clock, decision D6)', () => {
    expect(DATE_TIME_FORMAT).toBe('DD/MM/YYYY, HH:mm')
  })
})

describe('formatOptionalDate', () => {
  it('returns em dash for null', () => {
    expect(formatOptionalDate(null)).toBe('—')
  })

  it('returns em dash for undefined', () => {
    expect(formatOptionalDate(undefined)).toBe('—')
  })

  it('returns em dash for new Date(0) (epoch trap)', () => {
    expect(formatOptionalDate(new Date(0))).toBe('—')
  })

  it('returns em dash for invalid date string', () => {
    expect(formatOptionalDate('not-a-date')).toBe('—')
  })

  it('formats a valid future Date object correctly', () => {
    const futureDate = new Date('2028-12-25T15:30:00Z')
    expect(formatOptionalDate(futureDate)).toBe(dayjs(futureDate).format(DATE_TIME_FORMAT))
  })

  it('formats a valid ISO date string correctly', () => {
    const isoString = '2026-07-30T10:00:00Z'
    expect(formatOptionalDate(isoString)).toBe(dayjs(isoString).format(DATE_TIME_FORMAT))
  })

  it('formats an afternoon time with a two digit 24 hour hour (15:30, never 3:30 PM)', () => {
    // Built from a local Date so it does not depend on the machine time zone
    const localAfternoonDate = new Date(2028, 11, 25, 15, 30)
    const formatted = formatOptionalDate(localAfternoonDate)
    expect(formatted).toBe('25/12/2028, 15:30')
    expect(formatted).toContain('15:30')
    expect(formatted).not.toContain('3:30 PM')
  })
})

describe('formatDate', () => {
  it('formats a local Date with day first and 24 hour clock', () => {
    const localAfternoonDate = new Date(2028, 11, 25, 15, 30)
    const formatted = formatDate(localAfternoonDate)
    expect(formatted).toBe('25/12/2028, 15:30')
    expect(formatted).toContain('15:30')
    expect(formatted).not.toContain('3:30 PM')
  })
})
