import type { TFunction } from 'i18next'
import type { PartnerChargeLineDto } from '@/backend-admin-sdk'
import { en } from '@/i18n/resources/en'
import { athensDayTime } from '@/utils/athensMonth'

// Spec 0036, Wording table. A money figure beside a restaurant must never read as the customer's
// delivery fee, so no fixed string says "fee" or "delivery price", except the one note that says
// delivery fees never appear here. The words live in src/i18n/resources/{en,el}/charges.ts (spec 0054).

// The note's translation key: pages show t(DELIVERY_FEE_NOTE_KEY), in the reader's language.
export const DELIVERY_FEE_NOTE_KEY = 'charges.deliveryFeeNote'
// The note's English words, which the text scan tests remove before looking for "fee".
export const DELIVERY_FEE_NOTE = en.charges.deliveryFeeNote

// The line's reason in the fields a reason's wording reads.
type ReasonLine = Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel' | 'splitWait'>

// The admin pages' wording, in the reader's language (pass useTranslation's t). A new charge reason
// needs a case here AND in greekReason below.
export function reasonText(t: TFunction, line: ReasonLine): string {
  switch (line.reason) {
    case 'CANCELLATION':
      return t('charges.reason.cancellation')
    case 'WAITING':
      // Spec 0047: the wait at pickup while dispatch split the order is not a delay past the ready time.
      if (line.splitWait) return t('charges.reason.waitingSplit')
      return line.waitMinutes != null
        ? t('charges.reason.waitingMinutes', { count: line.waitMinutes })
        : t('charges.reason.waiting')
    case 'REMOVAL':
      return t('charges.reason.removal', { label: line.removalLabel ?? '' }).trimEnd()
    case 'SPLIT_LEG':
      return t('charges.reason.splitLeg')
    default:
      return String(line.reason)
  }
}

// The restaurant statement's and the CSV's wording, always Greek (spec 0054, cross check 11): pass a
// Greek translator, `i18n.getFixedT('el')`. Covers every reason reasonText covers.
export function greekReason(tGreek: TFunction, line: ReasonLine): string {
  switch (line.reason) {
    case 'CANCELLATION':
      return tGreek('charges.statement.reason.cancellation')
    case 'WAITING':
      // Spec 0047: the wait at pickup while dispatch split the order.
      if (line.splitWait) return tGreek('charges.statement.reason.waitingSplit')
      return line.waitMinutes != null
        ? tGreek('charges.statement.reason.waitingMinutes', { count: line.waitMinutes })
        : tGreek('charges.statement.reason.waiting')
    case 'REMOVAL':
      return tGreek('charges.statement.reason.removal', { label: line.removalLabel ?? '' }).trimEnd()
    case 'SPLIT_LEG':
      return tGreek('charges.statement.reason.splitLeg')
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

// A bill's name: the invoice number typed, else "Billed 18/11/2026 14:05" (Athens time), in the
// reader's language.
export function billLabel(t: TFunction, bill: { reference: string | null; createdAt: string }): string {
  const reference = bill.reference?.trim()
  return reference ? reference : t('charges.billedAt', { when: athensDayTime(bill.createdAt) })
}

// The same on the statement and in the CSV, always Greek: "Χρέωση 18/11/2026 14:05".
export function greekBillLabel(tGreek: TFunction, bill: { reference: string | null; createdAt: string }): string {
  const reference = bill.reference?.trim()
  return reference ? reference : tGreek('charges.statement.billedAt', { when: athensDayTime(bill.createdAt) })
}
