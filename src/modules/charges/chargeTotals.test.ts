import { formatTotals, formatAmounts, unbilledThisMonthText } from './chargeTotals'
import type { AmountTotalDto, PartnerChargeTotalsDto } from '@/backend-admin-sdk'
import { createI18n } from '@/i18n/createI18n'

const tEnglish = createI18n('en').t

describe('chargeTotals (spec 0036, AC-4, AC-11, decision 109.4)', () => {
  describe('formatTotals', () => {
    it('shows one figure per currency joined with " · ", never a sum across currencies', () => {
      const totals: PartnerChargeTotalsDto[] = [
        { currencyCode: 'EUR', charged: 1000, billed: 400, unbilled: 600 },
        { currencyCode: 'USD', charged: 2000, billed: 500, unbilled: 1500 },
      ]

      const charged = formatTotals(totals, 'charged', 'en')
      expect(charged).toBe('€10.00 · US$20.00')

      const billed = formatTotals(totals, 'billed', 'en')
      expect(billed).toBe('€4.00 · US$5.00')

      const unbilled = formatTotals(totals, 'unbilled', 'en')
      expect(unbilled).toBe('€6.00 · US$15.00')
    })

    it('returns €0.00 for empty totals list', () => {
      expect(formatTotals([], 'charged', 'en')).toBe('€0.00')
    })
  })

  describe('formatAmounts', () => {
    it('formats a list of AmountTotalDto joined with " · "', () => {
      const amounts: AmountTotalDto[] = [
        { currencyCode: 'EUR', amount: 1250 },
        { currencyCode: 'GBP', amount: 800 },
      ]
      expect(formatAmounts(amounts, 'en')).toBe('€12.50 · £8.00')
    })
  })

  describe('unbilledThisMonthText', () => {
    it('returns "No charges this month" for an empty list of lines', () => {
      expect(unbilledThisMonthText(tEnglish, [], 'en')).toBe('No charges this month')
    })

    it('returns "No unbilled charges this month" when every line has a billId', () => {
      const lines = [
        { billId: 'bill-1', amount: 500, currencyCode: 'EUR' },
        { billId: 'bill-2', amount: 1000, currencyCode: 'EUR' },
      ]
      expect(unbilledThisMonthText(tEnglish, lines, 'en')).toBe('No unbilled charges this month')
    })

    it('returns "Unbilled charges this month: €12.40" for unbilled lines', () => {
      const lines = [
        { billId: 'bill-1', amount: 500, currencyCode: 'EUR' },
        { billId: null, amount: 1240, currencyCode: 'EUR' },
      ]
      expect(unbilledThisMonthText(tEnglish, lines, 'en')).toBe('Unbilled charges this month: €12.40')
    })

    it('counts an unbilled 0 charge as unbilled (decision 109.4: decided by billId, not amount)', () => {
      // An unbilled 0 charge must NOT say "No unbilled charges this month"
      const lines = [
        { billId: 'bill-1', amount: 500, currencyCode: 'EUR' },
        { billId: null, amount: 0, currencyCode: 'EUR' },
      ]
      expect(unbilledThisMonthText(tEnglish, lines, 'en')).toBe('Unbilled charges this month: €0.00')
    })

    it('joins multiple currencies in alphabetical order with " · "', () => {
      const lines = [
        { billId: null, amount: 1000, currencyCode: 'USD' },
        { billId: null, amount: 500, currencyCode: 'EUR' },
      ]
      expect(unbilledThisMonthText(tEnglish, lines, 'en')).toBe('Unbilled charges this month: €5.00 · US$10.00')
    })
  })
})
