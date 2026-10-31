import { formatMoney } from '@/utils/formatMoney'
import { parseQuoteRateInput } from '@/utils/quoteRate'

// The distance the worked example uses, in the instance's own unit (spec 0010, AC-6).
export const EXAMPLE_DISTANCE = 3

export type PricingBreakdown = {
  baseFee: number
  distanceFee: number
  riderPay: number
  coopFee: number
  customerPays: number
}

// The same sums the backend makes for a quote (all in whole cents):
// distance fee = round(distance × rate) (simple-quote-calculation.service.ts),
// rider pay = base fee + distance fee, co-op fee = round(pay × fee% / 100), or 0 when the pay
// or the fee % is 0 or less (delivery-calculation.service.ts, calculateCoopFee),
// customer pays = rider pay + co-op fee. Null while a box does not hold a usable value.
export function pricingBreakdown(
  baseFeeText: string,
  rateText: string,
  feePercentText: string,
  distance: number = EXAMPLE_DISTANCE,
): PricingBreakdown | null {
  const baseFee = parseQuoteRateInput(baseFeeText)
  const rate = parseQuoteRateInput(rateText)
  const feePercent = feePercentText.trim() === '' ? NaN : Number(feePercentText)
  if (baseFee === null || rate === null || !Number.isFinite(feePercent)) return null
  const distanceFee = Math.round(distance * rate)
  const riderPay = baseFee + distanceFee
  const coopFee = riderPay <= 0 || feePercent <= 0 ? 0 : Math.round((riderPay * feePercent) / 100)
  return { baseFee, distanceFee, riderPay, coopFee, customerPays: riderPay + coopFee }
}

type Props = {
  baseFeeText: string
  rateText: string
  feePercentText: string
  currency: string
  distanceUnit: string
}

// The worked example beside the pricing boxes: what one 3 km (or 3 mile) delivery costs with the
// values in the boxes, saved or not. The last line is what the customer pays: delivery is
// charged to the customer, never billed through the restaurant (AGENTS.md, spec 0010 AC-7).
export function PricingExample({ baseFeeText, rateText, feePercentText, currency, distanceUnit }: Props) {
  const breakdown = pricingBreakdown(baseFeeText, rateText, feePercentText)
  const unit = distanceUnit === 'MILES' ? 'mi' : 'km'
  const money = (cents: number) => formatMoney(cents, currency) ?? String(cents)

  return (
    <section
      aria-label="Worked example"
      data-testid="pricing-example"
      className="rounded-lg bg-muted p-4 text-sm"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        A {EXAMPLE_DISTANCE} {unit} delivery
      </p>
      {breakdown === null ? (
        <p className="text-muted-foreground">Fill in the three boxes to see the example.</p>
      ) : (
        <dl className="flex flex-col gap-1">
          <Row label="Base fee" value={money(breakdown.baseFee)} />
          <Row
            label={`${EXAMPLE_DISTANCE} ${unit} × ${money(Number(rateText))}`}
            value={money(breakdown.distanceFee)}
          />
          <Row label="Rider gets" value={money(breakdown.riderPay)} strong />
          <Row label={`Co-op fee ${feePercentText.trim()}%`} value={money(breakdown.coopFee)} />
          <div className="my-1 border-t border-border" />
          <Row label="Customer pays" value={money(breakdown.customerPays)} strong />
        </dl>
      )}
    </section>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}
