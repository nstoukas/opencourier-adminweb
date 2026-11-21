import type { AmountTotalDto, PartnerChargeLineDto } from '@/backend-admin-sdk'
import { athensDayTime } from '@/utils/athensMonth'

// Spec 0036, Wording table (Greek: the statement and the CSV). The co-op's first Greek strings in
// adminweb; row 47 moves them into its translations.

export const GREEK = {
  statementTitle: 'Κατάσταση χρεώσεων',
  columns: ['Ημερομηνία και ώρα', 'Παραγγελία', 'Αιτία', 'Ποσό'] as const,
  total: 'Σύνολο',
  notATaxDocument: 'Αυτό δεν είναι φορολογικό παραστατικό.',
  deliveryFeeNote: 'Τα έξοδα αποστολής τα πληρώνει ο πελάτης και δεν εμφανίζονται εδώ.',
  undoneBanner: 'Ακυρώθηκε',
  csvHeader:
    'Κατάστημα;Ημερομηνία και ώρα;Παραγγελία;Αιτία;Λεπτά μετά τη συμφωνημένη ώρα;Ποσό;Νόμισμα;Τιμολογήθηκε;Χρέωση;Κωδικός διανομής',
  yes: 'ναι',
  no: 'όχι',
}

const GREEK_MONTHS = [
  'Ιανουάριος',
  'Φεβρουάριος',
  'Μάρτιος',
  'Απρίλιος',
  'Μάιος',
  'Ιούνιος',
  'Ιούλιος',
  'Αύγουστος',
  'Σεπτέμβριος',
  'Οκτώβριος',
  'Νοέμβριος',
  'Δεκέμβριος',
]

// "Νοέμβριος 2026".
export function greekMonthTitle(month: string): string {
  return `${GREEK_MONTHS[Number(month.slice(5, 7)) - 1] ?? month.slice(5, 7)} ${month.slice(0, 4)}`
}

export function greekReason(
  line: Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel' | 'splitWait'>
): string {
  switch (line.reason) {
    case 'CANCELLATION':
      return 'Ακύρωση αφού διανομέας είχε αποδεχτεί την παραγγελία'
    case 'WAITING':
      // Spec 0047: the wait at pickup while dispatch split the order.
      if (line.splitWait) return 'Αναμονή όσο η διανομή χώριζε την παραγγελία'
      return line.waitMinutes != null
        ? `Αναμονή διανομέα, ${line.waitMinutes} ${line.waitMinutes === 1 ? 'λεπτό' : 'λεπτά'} μετά την ώρα που είχε συμφωνηθεί`
        : 'Αναμονή διανομέα μετά την ώρα που είχε συμφωνηθεί'
    case 'REMOVAL':
      return `Απομάκρυνση διανομέα από την παραγγελία: ${line.removalLabel ?? ''}`.trimEnd()
    case 'SPLIT_LEG':
      return 'Επιπλέον διανομέας: η παραγγελία δεν χωρούσε στο μέγεθος που δηλώθηκε'
    default:
      return String(line.reason)
  }
}

// A bill's name in Greek: the invoice number typed, else "Χρέωση 18/11/2026 14:05" (Athens time).
export function greekBillLabel(bill: { reference: string | null; createdAt: string }): string {
  const reference = bill.reference?.trim()
  return reference ? reference : `Χρέωση ${athensDayTime(bill.createdAt)}`
}

// "12,40 €" for the statement: Greek decimal comma, the currency's own sign.
export function formatGreekAmount(cents: number, currencyCode: string): string {
  const major = cents / 100
  try {
    return new Intl.NumberFormat('el-GR', { style: 'currency', currency: currencyCode.trim().toUpperCase() }).format(major)
  } catch {
    return `${formatGreekNumber(cents)} ${currencyCode}`
  }
}

// "1234,50" for the CSV: decimal comma, no thousands separator, no currency sign.
export function formatGreekNumber(cents: number): string {
  return new Intl.NumberFormat('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(
    cents / 100
  )
}

// A total per currency, joined (never added across currencies).
export function greekTotals(totals: AmountTotalDto[]): string {
  return totals.map((total) => formatGreekAmount(total.amount, total.currencyCode)).join(' · ')
}
