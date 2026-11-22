import type { TFunction } from 'i18next'
import { formatMoney } from '@/i18n/format'
import type { Language } from '@/i18n/language'
import { isValidQuoteRate, parseQuoteRateInput } from './quoteRate'

// The base fee follows the same rule as the quote rate: a whole number of cents, 0 or more,
// and an empty box is not a value. One parser for both means the two fields can't drift apart.
export const parseBaseFeeInput = parseQuoteRateInput

// The line under the base fee box on the co-op settings page, in the reader's language (spec 0054):
// `t` is the function useTranslation gives a component, `language` sets how the amount reads.
export function describeBaseFee(
  t: TFunction,
  language: Language,
  fee: number | null,
  currencyCode: string | null | undefined,
): string {
  if (fee === null || !isValidQuoteRate(fee)) {
    return t('settings.baseFee.invalid')
  }
  if (fee === 0) {
    return t('settings.baseFee.zero')
  }
  return t('settings.baseFee.amount', { money: formatMoney(fee, currencyCode, language) })
}
