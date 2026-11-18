import {
  GREEK,
  greekMonthTitle,
  greekReason,
  greekBillLabel,
  formatGreekAmount,
  formatGreekNumber,
  greekTotals,
} from './greek'

describe('greek (spec 0036, AC-9, AC-10, decision 109.5)', () => {
  describe('GREEK constants', () => {
    it('matches the Wording table strings exactly', () => {
      expect(GREEK.statementTitle).toBe('Κατάσταση χρεώσεων')
      expect(GREEK.columns).toEqual(['Ημερομηνία και ώρα', 'Παραγγελία', 'Αιτία', 'Ποσό'])
      expect(GREEK.total).toBe('Σύνολο')
      expect(GREEK.notATaxDocument).toBe('Αυτό δεν είναι φορολογικό παραστατικό.')
      expect(GREEK.deliveryFeeNote).toBe('Τα έξοδα αποστολής τα πληρώνει ο πελάτης και δεν εμφανίζονται εδώ.')
      expect(GREEK.undoneBanner).toBe('Ακυρώθηκε')
      expect(GREEK.csvHeader).toBe(
        'Κατάστημα;Ημερομηνία και ώρα;Παραγγελία;Αιτία;Λεπτά μετά τη συμφωνημένη ώρα;Ποσό;Νόμισμα;Τιμολογήθηκε;Χρέωση;Κωδικός διανομής'
      )
      expect(GREEK.yes).toBe('ναι')
      expect(GREEK.no).toBe('όχι')
    })
  })

  describe('greekMonthTitle', () => {
    it('returns Greek month name with year: "Νοέμβριος 2026"', () => {
      expect(greekMonthTitle('2026-11')).toBe('Νοέμβριος 2026')
      expect(greekMonthTitle('2026-01')).toBe('Ιανουάριος 2026')
      expect(greekMonthTitle('2026-12')).toBe('Δεκέμβριος 2026')
    })
  })

  describe('greekReason (decision 109.5: singular λεπτό for 1 minute)', () => {
    it('returns Greek cancellation wording for CANCELLATION', () => {
      expect(greekReason({ reason: 'CANCELLATION', waitMinutes: null, removalLabel: null })).toBe(
        'Ακύρωση αφού διανομέας είχε αποδεχτεί την παραγγελία'
      )
    })

    it('returns singular "λεπτό" for exactly 1 minute wait', () => {
      expect(greekReason({ reason: 'WAITING', waitMinutes: 1, removalLabel: null })).toBe(
        'Αναμονή διανομέα, 1 λεπτό μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns plural "λεπτά" for 12 minutes wait', () => {
      expect(greekReason({ reason: 'WAITING', waitMinutes: 12, removalLabel: null })).toBe(
        'Αναμονή διανομέα, 12 λεπτά μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns wait wording without minutes when waitMinutes is null', () => {
      expect(greekReason({ reason: 'WAITING', waitMinutes: null, removalLabel: null })).toBe(
        'Αναμονή διανομέα μετά την ώρα που είχε συμφωνηθεί'
      )
    })

    it('returns removal wording with the label as-is', () => {
      expect(greekReason({ reason: 'REMOVAL', waitMinutes: null, removalLabel: 'Πρόβλημα μηχανής' })).toBe(
        'Απομάκρυνση διανομέα από την παραγγελία: Πρόβλημα μηχανής'
      )
    })

    it('handles removal with null label cleanly', () => {
      expect(greekReason({ reason: 'REMOVAL', waitMinutes: null, removalLabel: null })).toBe(
        'Απομάκρυνση διανομέα από την παραγγελία:'
      )
    })

    it('falls back to String(reason) for unknown reason', () => {
      expect(greekReason({ reason: 'UNKNOWN_REASON' as any, waitMinutes: null, removalLabel: null })).toBe(
        'UNKNOWN_REASON'
      )
    })
  })

  describe('greekBillLabel', () => {
    it('returns reference if present and trimmed', () => {
      expect(greekBillLabel({ reference: 'ΤΠΥ 41', createdAt: '2026-11-18T12:05:00Z' })).toBe('ΤΠΥ 41')
    })

    it('returns "Χρέωση DD/MM/YYYY HH:mm" in Athens time when reference is null or blank', () => {
      // 2026-11-18 12:05:00 UTC = 14:05 Athens time
      expect(greekBillLabel({ reference: null, createdAt: '2026-11-18T12:05:00Z' })).toBe('Χρέωση 18/11/2026 14:05')
      expect(greekBillLabel({ reference: '   ', createdAt: '2026-11-18T12:05:00Z' })).toBe('Χρέωση 18/11/2026 14:05')
    })
  })

  describe('formatGreekAmount and formatGreekNumber', () => {
    it('formatGreekAmount formats with Greek decimal comma and currency sign (e.g. 12,40 €)', () => {
      const formatted = formatGreekAmount(1240, 'EUR')
      // Allow either non-breaking space (\u00A0) or regular space (\u0020)
      expect(formatted).toMatch(/^12,40[\s\u00A0]€$/)
    })

    it('formatGreekAmount handles zero cents', () => {
      const formatted = formatGreekAmount(0, 'EUR')
      expect(formatted).toMatch(/^0,00[\s\u00A0]€$/)
    })

    it('formatGreekAmount falls back safely on bad currency code', () => {
      const formatted = formatGreekAmount(1240, 'BAD_CURRENCY')
      expect(formatted).toBe('12,40 BAD_CURRENCY')
    })

    it('formatGreekNumber formats with decimal comma, 2 decimal places, and no thousands separator or currency sign', () => {
      expect(formatGreekNumber(1240)).toBe('12,40')
      expect(formatGreekNumber(0)).toBe('0,00')
      expect(formatGreekNumber(123450)).toBe('1234,50')
    })
  })

  describe('greekTotals', () => {
    it('formats each currency total and joins with " · "', () => {
      const totals = [
        { currencyCode: 'EUR', amount: 1240 },
        { currencyCode: 'USD', amount: 500 },
      ]
      const result = greekTotals(totals)
      expect(result).toMatch(/12,40[\s\u00A0]€ · /)
    })
  })
})
