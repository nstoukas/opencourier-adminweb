import { formatOptionalDate } from './time'
import dayjs from 'dayjs'

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
    expect(formatOptionalDate(futureDate)).toBe(dayjs(futureDate).format('MMMM D, YYYY h:mm A'))
  })

  it('formats a valid ISO date string correctly', () => {
    const isoString = '2026-07-30T10:00:00Z'
    expect(formatOptionalDate(isoString)).toBe(dayjs(isoString).format('MMMM D, YYYY h:mm A'))
  })
})
