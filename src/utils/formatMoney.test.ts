import { formatMoney, isUsableCurrencyCode } from './formatMoney'

describe('formatMoney utility', () => {
  describe('isUsableCurrencyCode', () => {
    it('returns true for valid 3-letter currency codes (case-insensitive and trimmed)', () => {
      expect(isUsableCurrencyCode('EUR')).toBe(true)
      expect(isUsableCurrencyCode('eur')).toBe(true)
      expect(isUsableCurrencyCode(' GBP ')).toBe(true)
    })

    it('returns false for missing, empty, or invalid currency codes', () => {
      expect(isUsableCurrencyCode(null)).toBe(false)
      expect(isUsableCurrencyCode(undefined)).toBe(false)
      expect(isUsableCurrencyCode('')).toBe(false)
      expect(isUsableCurrencyCode('  ')).toBe(false)
      expect(isUsableCurrencyCode('EURO')).toBe(false)
      expect(isUsableCurrencyCode('EU')).toBe(false)
      expect(isUsableCurrencyCode('€')).toBe(false)
      expect(isUsableCurrencyCode('1')).toBe(false)
      expect(isUsableCurrencyCode('12')).toBe(false)
    })
  })

  describe('formatMoney currency formatting', () => {
    it('formats 11204 EUR to €112.04', () => {
      expect(formatMoney(11204, 'EUR')).toBe('€112.04')
    })

    it('formats 11204 USD to $112.04', () => {
      expect(formatMoney(11204, 'USD')).toBe('$112.04')
    })

    it('formats 11204 GBP to £112.04', () => {
      expect(formatMoney(11204, 'GBP')).toBe('£112.04')
    })

    it('accepts lowercase currency codes like eur', () => {
      expect(formatMoney(11204, 'eur')).toBe('€112.04')
    })

    it('trims leading/trailing whitespace from currency codes like  EUR ', () => {
      expect(formatMoney(11204, ' EUR ')).toBe('€112.04')
    })

    it('formats 400 EUR to €4.00 for reassignment payout amounts', () => {
      expect(formatMoney(400, 'EUR')).toBe('€4.00')
    })

    it('formats 0 EUR to €0.00 without vanishing or returning empty string', () => {
      expect(formatMoney(0, 'EUR')).toBe('€0.00')
    })

    it('scales amounts by /100 and applies standard thousands grouping (1234567 EUR -> €12,345.67)', () => {
      expect(formatMoney(1234567, 'EUR')).toBe('€12,345.67')
    })

    it('formats negative amounts correctly (-400 EUR -> -€4.00)', () => {
      expect(formatMoney(-400, 'EUR')).toBe('-€4.00')
    })

    it('formats well-formed unknown 3-letter codes using prefix format (11204 XYZ -> XYZ 112.04)', () => {
      expect(formatMoney(11204, 'XYZ')).toBe('XYZ\u00a0112.04')
    })
  })

  describe('formatMoney no-symbol fallback branch', () => {
    it('formats amounts with no currency symbol when currencyCode is missing or invalid', () => {
      // Inputs with unusable codes must return a plain formatted number with no symbol prefix
      expect(formatMoney(11204, null)).toBe('112.04')
      expect(formatMoney(11204, undefined)).toBe('112.04')
      expect(formatMoney(11204, '')).toBe('112.04')
      expect(formatMoney(11204, '   ')).toBe('112.04')
      expect(formatMoney(11204, 'EURO')).toBe('112.04')
      expect(formatMoney(11204, '€')).toBe('112.04')
      expect(formatMoney(11204, '12')).toBe('112.04')
    })

    it('never includes a dollar ($) or euro (€) symbol when falling back to unlabelled numbers', () => {
      const unusableCodes = [null, undefined, '', '   ', 'EURO', '€', '12']
      unusableCodes.forEach((code) => {
        const result = formatMoney(11204, code)
        expect(result).not.toContain('$')
        expect(result).not.toContain('€')
      })
    })

    it('applies thousands grouping on plain fallback branch (1234567 -> 12,345.67)', () => {
      expect(formatMoney(1234567, '')).toBe('12,345.67')
    })
  })

  describe('formatMoney null/invalid amount inputs', () => {
    it('returns null when pennies is null or undefined', () => {
      expect(formatMoney(null, 'EUR')).toBeNull()
      expect(formatMoney(undefined, 'EUR')).toBeNull()
    })

    it('returns null when pennies is NaN or Infinity', () => {
      expect(formatMoney(NaN, 'EUR')).toBeNull()
      expect(formatMoney(Infinity, 'EUR')).toBeNull()
    })
  })
})
