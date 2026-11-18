import type { AmountTotalDto, PartnerChargeTotalsDto } from '@/backend-admin-sdk'
import { formatMoney } from '@/utils/formatMoney'

// One figure per currency, joined with " · " and never added across currencies (spec 0036, AC-4).
export function formatTotals(totals: PartnerChargeTotalsDto[], key: 'charged' | 'billed' | 'unbilled'): string {
  if (totals.length === 0) return formatMoney(0, 'EUR') ?? '0.00'
  return totals.map((total) => formatMoney(total[key], total.currencyCode) ?? '').join(' · ')
}

export function formatAmounts(totals: AmountTotalDto[]): string {
  return totals.map((total) => formatMoney(total.amount, total.currencyCode) ?? '').join(' · ')
}

// The line on a restaurant's own page (AC-11), from its current month's lines. Whether a line is
// billed decides the wording, not its amount: a charge of 0 is still an unbilled charge.
export function unbilledThisMonthText(lines: { billId: string | null; amount: number; currencyCode: string }[]): string {
  if (lines.length === 0) return 'No charges this month'
  const unbilled = lines.filter((line) => line.billId === null)
  if (unbilled.length === 0) return 'No unbilled charges this month'
  const byCurrency = new Map<string, number>()
  for (const line of unbilled) byCurrency.set(line.currencyCode, (byCurrency.get(line.currencyCode) ?? 0) + line.amount)
  const figures = Array.from(byCurrency.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currencyCode, amount]) => formatMoney(amount, currencyCode) ?? '')
  return `Unbilled charges this month: ${figures.join(' · ')}`
}
