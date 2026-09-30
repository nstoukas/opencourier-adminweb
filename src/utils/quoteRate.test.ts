import { describeQuoteRate, isValidQuoteRate, parseQuoteRateInput } from './quoteRate'

describe('quoteRate utility', () => {
  describe('isValidQuoteRate', () => {
    it('returns true for positive integers and zero', () => {
      // Rates in minor currency units (cents): 150 = €1.50, 0 = no distance component
      expect(isValidQuoteRate(150)).toBe(true)
      expect(isValidQuoteRate(0)).toBe(true)
    })

    it('returns false for non-integers, negative numbers, NaN, or Infinity', () => {
      expect(isValidQuoteRate(1.5)).toBe(false)
      expect(isValidQuoteRate(-1)).toBe(false)
      expect(isValidQuoteRate(NaN)).toBe(false)
      expect(isValidQuoteRate(Infinity)).toBe(false)
    })
  })

  describe('describeQuoteRate', () => {
    it('formats a valid rate per kilometer without dollar sign', () => {
      // 150 cents per km in EUR should describe 1.50 per kilometre
      const description = describeQuoteRate(150, 'EUR', 'KILOMETERS')
      expect(description).toContain('1.50')
      expect(description).toContain('kilometre')
      expect(description).not.toContain('$')
    })

    it('uses mile when distanceUnit is MILES', () => {
      const description = describeQuoteRate(150, 'EUR', 'MILES')
      expect(description).toContain('mile')
      expect(description).not.toContain('kilometre')
    })

    it('falls back to kilometre with no symbol when currency code and unit are missing', () => {
      const description = describeQuoteRate(150, '', '')
      expect(description).toContain('1.50')
      expect(description).not.toContain('€')
      expect(description).not.toContain('$')
      expect(description).toContain('kilometre')
    })

    it('explains that 0 rate means distance component is zero and riders get only base fee', () => {
      const description = describeQuoteRate(0, 'EUR', 'KILOMETERS')
      expect(description).toContain('0: the distance part of every DeliveryQuote is zero')
      expect(description).toContain('base fee')
    })

    it('returns validation prompt for negative rate or non-integer rate', () => {
      const description = describeQuoteRate(-5, 'EUR', 'KILOMETERS')
      expect(description).toBe('Enter a whole number of cents, zero or more.')
    })
  })

  describe('parseQuoteRateInput', () => {
    it('parses valid numeric string inputs into numbers', () => {
      expect(parseQuoteRateInput('150')).toBe(150)
      expect(parseQuoteRateInput('0')).toBe(0)
    })

    it('returns null for empty strings or whitespace (does not coerce to 0)', () => {
      // Number('') returns 0 in JS, so parseQuoteRateInput explicitly guards against empty string
      expect(parseQuoteRateInput('')).toBeNull()
      expect(parseQuoteRateInput('   ')).toBeNull()
    })

    it('returns null for floats, negative or non-numeric inputs', () => {
      expect(parseQuoteRateInput('1.5')).toBeNull()
      expect(parseQuoteRateInput('-1')).toBeNull()
      expect(parseQuoteRateInput('abc')).toBeNull()
    })
  })
})
