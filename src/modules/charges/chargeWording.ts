import type { PartnerChargeLineDto } from '@/backend-admin-sdk'
import { athensDayTime } from '@/utils/athensMonth'

// Spec 0036, Wording table (English, admin pages). A money figure beside a restaurant must never
// read as the customer's delivery fee, so no fixed string here says "fee" or "delivery price",
// except the one note that says delivery fees never appear here.
export const DELIVERY_FEE_NOTE = 'Delivery fees are paid by customers and never appear here.'

export function reasonText(line: Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel'>): string {
  switch (line.reason) {
    case 'CANCELLATION':
      return 'Cancelled after a rider accepted'
    case 'WAITING':
      return line.waitMinutes != null
        ? `Rider kept waiting, ${line.waitMinutes} min past the agreed ready time`
        : 'Rider kept waiting past the agreed ready time'
    case 'REMOVAL':
      return `Rider taken off the order: ${line.removalLabel ?? ''}`.trimEnd()
    default:
      return String(line.reason)
  }
}

// The order a line belongs to: its reference, else the last 6 characters of the delivery id.
export function orderLabel(line: Pick<PartnerChargeLineDto, 'orderReference' | 'deliveryId'>): string {
  const reference = line.orderReference?.trim()
  return reference ? reference : line.deliveryId.slice(-6)
}

// A bill's name: the invoice number typed, else "Billed 18/11/2026 14:05" (Athens time).
export function billLabel(bill: { reference: string | null; createdAt: string }): string {
  const reference = bill.reference?.trim()
  return reference ? reference : `Billed ${athensDayTime(bill.createdAt)}`
}
