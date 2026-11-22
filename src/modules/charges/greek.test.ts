import { el } from '@/i18n/resources/el'
import { monthTitle } from '@/utils/athensMonth'
import { formatMoney } from '@/i18n/format'
import { formatAmounts } from './chargeTotals'
import { greekBillLabel, greekReason } from './chargeWording'
import { csvNumber } from './chargesCsv'
import { createI18n } from '@/i18n/createI18n'

const tGreek = createI18n('el').getFixedT('el')

describe('greek statement and CSV words (spec 0036, AC-9, AC-10, decision 109.5, spec 0054)', () => {
  describe('Greek statement resource constants', () => {
    it('matches the Wording table strings exactly', () => {
      expect(el.charges.statement.title).toBe('Κατάσταση χρεώσεων')
      expect(Object.values(el.charges.statement.columns)).toEqual(['Ημερομηνία και ώρα', 'Παραγγελία', 'Αιτία', 'Ποσό'])
      expect(el.charges.statement.total).toBe('Σύνολο')
      expect(el.charges.statement.notATaxDocument).toBe('Αυτό δεν είναι φορολογικό παραστατικό.')
      expect(el.charges.statement.customerPaysDelivery).toBe(
        'Τα έξοδα αποστολής τα πληρώνει ο πελάτης και δεν εμφανίζονται εδώ.'
      )
      expect(el.charges.statement.undoneBanner).toBe('Ακυρώθηκε')
      const csvHeader = [
        el.charges.statement.csv.restaurant,
        el.charges.statement.csv.when,
        el.charges.statement.csv.order,
        el.charges.statement.csv.reason,
        el.charges.statement.csv.minutesLate,
        el.charges.statement.csv.amount,
        el.charges.statement.csv.currency,
        el.charges.statement.csv.billed,
        el.charges.statement.csv.bill,
        el.charges.statement.csv.deliveryId,
      ].join(';')
      expect(csvHeader).toBe(
        'Κατάστημα;Ημερομηνία και ώρα;Παραγγελία;Αιτία;Λεπτά μετά τη συμφωνημένη ώρα;Ποσό;Νόμισμα;Τιμολογήθηκε;Χρέωση;Κωδικός διανομής'
      )
      expect(el.charges.statement.yes).toBe('ναι')
      expect(el.charges.statement.no).toBe('όχι')
    })
  })

  describe('monthTitle in Greek', () => {
    it('returns Greek month name with year: "Νοέμβριος 2026"', () => {
      expect(monthTitle('2026-11', 'el')).toBe('Νοέμβριος 2026')
      expect(monthTitle('2026-01', 'el')).toBe('Ιανουάριος 2026')
      expect(monthTitle('2026-12', 'el')).toBe('Δεκέμβριος 2026')
    })
  })

  describe('greekReason (decision 109.5: singular λεπτό for 1 minute)', () => {
    it('returns Greek cancellation wording for CANCELLATION', () => {
      expect(greekReason(tGreek, { reason: 'CANCELLATION', waitMinutes: null, removalLabel: null })).toBe(
        'Ακύρωση αφού διανομέας είχε αποδεχτεί την παραγγελία'
      )
    })

    it('returns singular "λεπτό" for exactly 1 minute wait', () => {
      expect(greekReason(tGreek, { reason: 'WAITING', waitMinutes: 1, removalLabel: null })).toBe(
        'Αναμονή διανομέα, 1 λεπτό μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns plural "λεπτά" for 12 minutes wait', () => {
      expect(greekReason(tGreek, { reason: 'WAITING', waitMinutes: 12, removalLabel: null })).toBe(
        'Αναμονή διανομέα, 12 λεπτά μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns wait wording without minutes when waitMinutes is null', () => {
      expect(greekReason(tGreek, { reason: 'WAITING', waitMinutes: null, removalLabel: null })).toBe(
        'Αναμονή διανομέα μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns removal wording with the label as-is', () => {
      expect(greekReason(tGreek, { reason: 'REMOVAL', waitMinutes: null, removalLabel: 'Πρόβλημα μηχανής' })).toBe(
        'Απομάκρυνση διανομέα από την παραγγελία: Πρόβλημα μηχανής'
      )
    })

    it('handles removal with null label cleanly', () => {
      expect(greekReason(tGreek, { reason: 'REMOVAL', waitMinutes: null, removalLabel: null })).toBe(
        'Απομάκρυνση διανομέα από την παραγγελία:'
      )
    })

    it('falls back to String(reason) for unknown reason', () => {
      expect(greekReason(tGreek, { reason: 'UNKNOWN_REASON' as any, waitMinutes: null, removalLabel: null })).toBe(
        'UNKNOWN_REASON'
      )
    })
  })

  describe('greekBillLabel', () => {
    it('returns reference if present and trimmed', () => {
      expect(greekBillLabel(tGreek, { reference: 'ΤΠΥ 41', createdAt: '2026-11-18T12:05:00Z' })).toBe('ΤΠΥ 41')
    })

    it('returns "Χρέωση DD/MM/YYYY HH:mm" in Athens time when reference is null or blank', () => {
      // 2026-11-18 12:05:00 UTC = 14:05 Athens time
      expect(greekBillLabel(tGreek, { reference: null, createdAt: '2026-11-18T12:05:00Z' })).toBe(
        'Χρέωση 18/11/2026 14:05'
      )
      expect(greekBillLabel(tGreek, { reference: '   ', createdAt: '2026-11-18T12:05:00Z' })).toBe(
        'Χρέωση 18/11/2026 14:05'
      )
    })
  })

  describe('formatMoney in Greek and csvNumber', () => {
    it('formatMoney formats with Greek decimal comma and currency sign (e.g. 12,40 €)', () => {
      const formatted = formatMoney(1240, 'EUR', 'el')
      // Allow either non-breaking space (\u00A0) or regular space (\u0020)
      expect(formatted).toMatch(/^12,40[\s\u00A0]€$/)
    })

    it('formatMoney handles zero cents', () => {
      const formatted = formatMoney(0, 'EUR', 'el')
      expect(formatted).toMatch(/^0,00[\s\u00A0]€$/)
    })

    it('formatMoney falls back safely on a bad currency code: the plain Greek number, no guessed symbol', () => {
      expect(formatMoney(1240, 'BAD_CURRENCY', 'el')).toBe('12,40')
    })

    it('csvNumber formats with decimal comma, 2 decimal places, and no thousands separator or currency sign', () => {
      expect(csvNumber(1240)).toBe('12,40')
      expect(csvNumber(0)).toBe('0,00')
      expect(csvNumber(123450)).toBe('1234,50')
    })
  })

  describe('formatAmounts in Greek', () => {
    it('formats each currency total and joins with " · "', () => {
      const totals = [
        { currencyCode: 'EUR', amount: 1240 },
        { currencyCode: 'USD', amount: 500 },
      ]
      const result = formatAmounts(totals, 'el')
      expect(result).toMatch(/12,40[\s\u00A0]€ · /)
    })
  })
})
