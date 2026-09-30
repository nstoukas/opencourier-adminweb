import { formatMoney } from './formatMoney'
import { isValidQuoteRate, parseQuoteRateInput } from './quoteRate'

// The base fee follows the same rule as the quote rate: a whole number of cents, 0 or more,
// and an empty box is not a value. One parser for both means the two fields can't drift apart.
export const parseBaseFeeInput = parseQuoteRateInput

// Generates a human-readable description of the base fee for the Instance configuration page.
export function describeBaseFee(fee: number | null, currencyCode: string | null | undefined): string {
  if (fee === null || !isValidQuoteRate(fee)) {
    return 'Enter a whole number of cents, zero or more.'
  }
  if (fee === 0) {
    return '0: no fixed part. Riders are paid only the distance part, so short trips pay very little.'
  }
  const money = formatMoney(fee, currencyCode) ?? String(fee)
  return `${money} per delivery, paid to the rider in full on top of the distance part.`
}
