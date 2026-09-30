import { describeBaseFee, parseBaseFeeInput } from './baseFee'

describe('baseFee utility (AC-4)', () => {
  describe('parseBaseFeeInput', () => {
    it('parses whole cents 0 or more into numbers', () => {
      expect(parseBaseFeeInput('200')).toBe(200)
      expect(parseBaseFeeInput('0')).toBe(0)
      expect(parseBaseFeeInput('50')).toBe(50)
    })

    it('returns null for empty strings or whitespace', () => {
      expect(parseBaseFeeInput('')).toBeNull()
      expect(parseBaseFeeInput('   ')).toBeNull()
    })

    it('returns null for floats, negative numbers, or invalid inputs', () => {
      expect(parseBaseFeeInput('12.5')).toBeNull()
      expect(parseBaseFeeInput('-1')).toBeNull()
      expect(parseBaseFeeInput('-200')).toBeNull()
      expect(parseBaseFeeInput('abc')).toBeNull()
    })
  })

  describe('describeBaseFee', () => {
    it('formats 200 in EUR as "€2.00 per delivery"', () => {
      const description = describeBaseFee(200, 'EUR')
      expect(description).toContain('€2.00 per delivery')
      expect(description).toContain('paid to the rider in full')
    })

    it('handles 0 base fee with warning message for short trips', () => {
      const description = describeBaseFee(0, 'EUR')
      expect(description).toContain('0: no fixed part')
      expect(description).toContain('Riders are paid only the distance part')
    })

    it('returns prompt message for null or negative/invalid fee', () => {
      expect(describeBaseFee(null, 'EUR')).toBe('Enter a whole number of cents, zero or more.')
      expect(describeBaseFee(-1, 'EUR')).toBe('Enter a whole number of cents, zero or more.')
    })
  })
})
