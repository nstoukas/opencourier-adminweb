import { athensTime as rawAthensTime, athensEnd as rawAthensEnd } from '../dispatch-stop/dispatchStopDisplay'

const athensTime = (iso: string) => rawAthensTime(iso, 'en')
const athensEnd = (from: string, to: string) => rawAthensEnd(from, to, 'en')

describe('Athens timezone formatting invariant (spec 0034, AC-4, spec 0014)', () => {
  const originalTz = process.env.TZ

  afterEach(() => {
    process.env.TZ = originalTz
  })

  // An ISO string in UTC: 2026-11-09 14:30:00 UTC.
  // In November, Greece observes EET (UTC+2).
  // Therefore, 14:30 UTC is always 16:30 in Athens.
  const utcIso = '2026-11-09T14:30:00.000Z'
  const generatedAt = '2026-11-09T14:00:00.000Z'

  const timezonesToTest = [
    'UTC',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Australia/Sydney',
    'Europe/London',
  ]

  timezonesToTest.forEach((tz) => {
    it(`formats athensTime as 16:30 under process.env.TZ=${tz}`, () => {
      process.env.TZ = tz

      // Held wording ready time "HH:mm" must always be in Europe/Athens time
      const formattedTime = athensTime(utcIso)
      expect(formattedTime).toBe('16:30')

      // Held wording template check
      const heldDetail = `Not offered yet, food ready ${formattedTime}`
      expect(heldDetail).toBe('Not offered yet, food ready 16:30')
    })

    it(`formats athensEnd stop time under process.env.TZ=${tz}`, () => {
      process.env.TZ = tz

      const until = athensEnd(generatedAt, utcIso)
      expect(until).toBe('16:30')
    })
  })
})
