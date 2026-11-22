import type { TFunction } from 'i18next'
import type { AmountTotalDto, PartnerChargeTotalsDto } from '@/backend-admin-sdk'
import { formatMoney } from '@/i18n/format'
import type { Language } from '@/i18n/language'

// Money here reads in the language passed last ("3,38 €" in Greek, "€3.38" in English); a page passes
// the reader's language (useFormat().language), the Greek statement passes 'el'.

// One figure per currency, joined with " · " and never added across currencies (spec 0036, AC-4).
export function formatTotals(
  totals: PartnerChargeTotalsDto[],
  key: 'charged' | 'billed' | 'unbilled',
  language: Language
): string {
  if (totals.length === 0) return formatMoney(0, 'EUR', language)
  return totals.map((total) => formatMoney(total[key], total.currencyCode, language)).join(' · ')
}

export function formatAmounts(totals: AmountTotalDto[], language: Language): string {
  return totals.map((total) => formatMoney(total.amount, total.currencyCode, language)).join(' · ')
}

// The line on a restaurant's own page (AC-11), from its current month's lines. Whether a line is
// billed decides the wording, not its amount: a charge of 0 is still an unbilled charge.
export function unbilledThisMonthText(
  t: TFunction,
  lines: { billId: string | null; amount: number; currencyCode: string }[],
  language: Language
): string {
  if (lines.length === 0) return t('charges.unbilledLine.none')
  const unbilled = lines.filter((line) => line.billId === null)
  if (unbilled.length === 0) return t('charges.unbilledLine.noneUnbilled')
  const byCurrency = new Map<string, number>()
  for (const line of unbilled) byCurrency.set(line.currencyCode, (byCurrency.get(line.currencyCode) ?? 0) + line.amount)
  const figures = Array.from(byCurrency.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, amount]) => formatMoney(amount, currencyCode, language))
  return t('charges.unbilledLine.unbilled', { amounts: figures.join(' · ') })
}
