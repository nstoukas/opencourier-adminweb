// Grouping/decimals for the case where we have no usable currency code.
// Same 'en-US' locale as the currency branch, so 1234567 formats as 12,345.67 either way.
// Uses browser-native Intl.NumberFormat for standard number formatting.
const plainAmountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** True only for a trimmed 3-ASCII-letter code such as "EUR" — what Intl can accept. */
export function isUsableCurrencyCode(code: string | null | undefined): boolean {
  // Regex test checks that string consists of exactly 3 ASCII alphabetical characters.
  return typeof code === 'string' && /^[A-Za-z]{3}$/.test(code.trim())
}

/**
 * Formats an integer amount in minor units (cents) using the currency the record
 * itself carries. Returns null when there is no amount, so callers can pick their
 * own placeholder (the delivery page uses '—').
 *
 * With a usable code:  formatMoney(11204, 'EUR') -> '€112.04'
 * Without one:         formatMoney(11204, '')    -> '112.04'   (no symbol, never '$')
 */
export function formatMoney(
  pennies: number | null | undefined,
  currencyCode: string | null | undefined,
): string | null {
  // Loose equality check (== null) catches both null and undefined input values.
  if (pennies == null) {
    return null
  }

  // Guard against non-finite values like NaN or Infinity.
  if (!Number.isFinite(pennies)) {
    return null
  }

  // Currency amounts are stored as integer minor units (cents), so divide by 100 to get major units.
  const major = pennies / 100

  if (isUsableCurrencyCode(currencyCode)) {
    try {
      // Formats currency string according to en-US locale rules and ISO currency code.
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode!.trim().toUpperCase(),
      }).format(major)
    } catch {
      // Fall through to plain amount formatter if Intl.NumberFormat throws a RangeError.
    }
  }

  return plainAmountFormatter.format(major)
}
