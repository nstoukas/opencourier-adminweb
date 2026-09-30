import { formatMoney } from './formatMoney'

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

// Generates a human-readable description string for the configured quote rate per distance unit.
export function describeQuoteRate(
  rate: number,
  currencyCode: string | null | undefined,
  distanceUnit: string | null | undefined,
): string {
  if (!isValidQuoteRate(rate)) {
    return 'Enter a whole number of cents, zero or more.'
  }
  if (rate === 0) {
    return '0 — the distance part of every DeliveryQuote is zero. Riders are then paid only the minimum courier pay floor.'
  }
  const money = formatMoney(rate, currencyCode) ?? String(rate)
  const unit = distanceUnit === 'MILES' ? 'mile' : 'kilometre'
  return `${money} per ${unit} of travel.`
}
