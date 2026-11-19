import {
  REVIEW_TOPIC_TO_HUMAN,
  REVIEW_OUTCOME_TO_HUMAN,
  REVIEW_TABS,
  REVIEW_ANSWER_MAX,
  dueText,
  parseCorrectionCents,
} from './reviewDisplay'

describe('reviewDisplay utils (spec 0038, AC-5, AC-6, AC-7)', () => {
  describe('labels and constants', () => {
    it('maps every topic to honest human words (AC-5)', () => {
      expect(REVIEW_TOPIC_TO_HUMAN.OFFER).toBe('An offer')
      expect(REVIEW_TOPIC_TO_HUMAN.PAY).toBe('Pay')
      expect(REVIEW_TOPIC_TO_HUMAN.OTHER).toBe('Something else')
    })

    it('maps every outcome to honest human words (AC-6)', () => {
      expect(REVIEW_OUTCOME_TO_HUMAN.STANDS).toBe('The decision stands')
      expect(REVIEW_OUTCOME_TO_HUMAN.CHANGED).toBe('Changed and put right')
    })

    it('declares tabs for Open, Answered, and Withdrawn requests (AC-5)', () => {
      expect(REVIEW_TABS).toEqual([
        { value: 'OPEN', label: 'Open' },
        { value: 'ANSWERED', label: 'Answered' },
        { value: 'WITHDRAWN', label: 'Withdrawn' },
      ])
    })

    it('sets REVIEW_ANSWER_MAX to 2000 characters (AC-6)', () => {
      expect(REVIEW_ANSWER_MAX).toBe(2000)
    })
  })

  describe('dueText (AC-5)', () => {
    const baseNow = new Date('2026-11-19T10:00:00Z')

    it('returns "Overdue" when overdue flag from server is true, even if dueAt is in the future', () => {
      const futureDue = '2026-11-20T10:00:00Z'
      expect(dueText(futureDue, true, baseNow)).toBe('Overdue')
    })

    it('returns days left when overdue flag from server is false, even if dueAt is in the past', () => {
      // Proves the page relies on the server flag to decide overdue status, never on its own clock
      const pastDue = '2026-11-18T10:00:00Z'
      expect(dueText(pastDue, false, baseNow)).toBe('1 day left')
    })

    it('rounds whole 24-hour periods up so a deadline 2 hours away reads "1 day left"', () => {
      const twoHoursAhead = '2026-11-19T12:00:00Z'
      expect(dueText(twoHoursAhead, false, baseNow)).toBe('1 day left')

      const exactly24HoursAhead = '2026-11-20T10:00:00Z'
      expect(dueText(exactly24HoursAhead, false, baseNow)).toBe('1 day left')
    })

    it('formats multiple days remaining as "N days left"', () => {
      const twoDaysAhead = '2026-11-21T10:00:00Z'
      expect(dueText(twoDaysAhead, false, baseNow)).toBe('2 days left')

      const twoDaysAndHourAhead = '2026-11-21T11:00:00Z'
      expect(dueText(twoDaysAndHourAhead, false, baseNow)).toBe('3 days left')

      const sevenDaysAhead = '2026-11-26T10:00:00Z'
      expect(dueText(sevenDaysAhead, false, baseNow)).toBe('7 days left')
    })
  })

  describe('parseCorrectionCents (AC-7)', () => {
    it('parses valid euro strings with dot or comma into whole cents', () => {
      expect(parseCorrectionCents('1.50')).toBe(150)
      expect(parseCorrectionCents('1,50')).toBe(150)
      expect(parseCorrectionCents('0.01')).toBe(1)
      expect(parseCorrectionCents('0,01')).toBe(1)
      expect(parseCorrectionCents('50')).toBe(5000)
      expect(parseCorrectionCents('  2.5  ')).toBe(250)
      expect(parseCorrectionCents('12.3')).toBe(1230)
    })

    it('returns null for zero, negative numbers, or invalid decimal formats', () => {
      expect(parseCorrectionCents('0')).toBeNull()
      expect(parseCorrectionCents('0.00')).toBeNull()
      expect(parseCorrectionCents('0,00')).toBeNull()
      expect(parseCorrectionCents('-1')).toBeNull()
      expect(parseCorrectionCents('-1.50')).toBeNull()
      expect(parseCorrectionCents('1.234')).toBeNull()
      expect(parseCorrectionCents('abc')).toBeNull()
      expect(parseCorrectionCents('')).toBeNull()
      expect(parseCorrectionCents('   ')).toBeNull()
    })
  })
})
