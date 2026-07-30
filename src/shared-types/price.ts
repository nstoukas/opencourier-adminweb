function roundToTwoDecimals(num: number) {
  return Number(num.toFixed(2))
}

/**
 * Converts a price represented as a float (4.31) in "pennies" (431).
 */
export function floatPriceToPennies(floatPrice: number): number {
  return Math.ceil(floatPrice * 100)
}

export function penniesToFloat(pennyPrice: number): number {
  return roundToTwoDecimals(pennyPrice / 100)
}

// A parsePrice() lived here that hardcoded '$'. Formatting belongs in
// src/utils/formatMoney.ts, which uses the record's own currencyCode and omits the
// symbol rather than inventing one. These two converters do no formatting, so they stay.
