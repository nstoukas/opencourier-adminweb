import type { TFunction } from 'i18next'
import { formatMoney } from '@/i18n/format'
import type { Language } from '@/i18n/language'

// Checks if a numeric quote rate is a finite, non-negative integer (in minor currency units/cents).
export function isValidQuoteRate(rate: number): boolean {
  return Number.isFinite(rate) && Number.isInteger(rate) && rate >= 0
}

// Parses string input into a valid quote rate integer or null if empty or invalid.
export function parseQuoteRateInput(text: string): number | null {
  if (text.trim() === '') {
    return null
  }
  const rate = Number(text)
  return isValidQuoteRate(rate) ? rate : null
}

// The line under the rate box on the co-op settings page, in the reader's language (spec 0054):
// `t` is the function useTranslation gives a component, `language` sets how the amount reads.
export function describeQuoteRate(
  t: TFunction,
  language: Language,
  rate: number,
  currencyCode: string | null | undefined,
  distanceUnit: string | null | undefined,
): string {
  if (!isValidQuoteRate(rate)) {
    return t('settings.quoteRate.invalid')
  }
  if (rate === 0) {
    return t('settings.quoteRate.zero')
  }
  const money = formatMoney(rate, currencyCode, language)
  return t(distanceUnit === 'MILES' ? 'settings.quoteRate.amountPerMile' : 'settings.quoteRate.amountPerKilometre', {
    money,
  })
}
