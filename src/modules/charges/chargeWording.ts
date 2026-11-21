import type { PartnerChargeLineDto } from '@/backend-admin-sdk'
import { athensDayTime } from '@/utils/athensMonth'

// Spec 0036, Wording table (English, admin pages). A money figure beside a restaurant must never
// read as the customer's delivery fee, so no fixed string here says "fee" or "delivery price",
// except the one note that says delivery fees never appear here.
export const DELIVERY_FEE_NOTE = 'Delivery fees are paid by customers and never appear here.'

export function reasonText(
  line: Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel' | 'splitWait'>
): string {
  switch (line.reason) {
    case 'CANCELLATION':
      return 'Cancelled after a rider accepted'
    case 'WAITING':
      // Spec 0047: the wait at pickup while dispatch split the order is not a delay past the ready time.
      if (line.splitWait) return 'Waiting while dispatch split the order'
      return line.waitMinutes != null
        ? `Rider kept waiting, ${line.waitMinutes} min past the agreed ready time`
        : 'Rider kept waiting past the agreed ready time'
    case 'REMOVAL':
      return `Rider taken off the order: ${line.removalLabel ?? ''}`.trimEnd()
    case 'SPLIT_LEG':
      return "Extra rider: the order didn't fit the size it was sent as"
    default:
      return String(line.reason)
  }
}

// The order a line belongs to: its reference, else the last 6 characters of the delivery id.
export function orderLabel(line: Pick<PartnerChargeLineDto, 'orderReference' | 'deliveryId'>): string {
  const reference = line.orderReference?.trim()
  return reference ? reference : line.deliveryId.slice(-6)
}

// On the admin pages: the reference with the short id beside it, because the legs of one order share
// a reference (adminweb AGENTS.md); the short id alone when there is no reference. The statement and
// the CSV keep orderLabel (the CSV has its own delivery id column).
export function adminOrderLabel(line: Pick<PartnerChargeLineDto, 'orderReference' | 'deliveryId'>): string {
  const reference = line.orderReference?.trim()
  const shortId = line.deliveryId.slice(-6)
  return reference ? `${reference} · ${shortId}` : shortId
}

// A bill's name: the invoice number typed, else "Billed 18/11/2026 14:05" (Athens time).
export function billLabel(bill: { reference: string | null; createdAt: string }): string {
  const reference = bill.reference?.trim()
  return reference ? reference : `Billed ${athensDayTime(bill.createdAt)}`
}
