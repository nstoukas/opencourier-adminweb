import type { PartnerChargeLineDto } from '@/backend-admin-sdk'
import { reasonText } from './chargeWording'
import { buildChargesCsv, type CsvChargeLine } from './chargesCsv'
import { greekReason } from './greek'

// Spec 0047 (AC-10, cross checks 3 and 11): the restaurant's charges for a split show where spec 0036
// shows charges (the admin statements), in English and Greek. A new leg's charge and the split wait each
// have their own words, so a restaurant is never told its food was late when dispatch was splitting it.
describe('split charges on the statement (spec 0047)', () => {
  type Line = Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel' | 'splitWait'>
  const splitLeg: Line = { reason: 'SPLIT_LEG', waitMinutes: null, removalLabel: null }
  const splitWait: Line = { reason: 'WAITING', waitMinutes: 7, removalLabel: null, splitWait: true }
  const delayWait: Line = { reason: 'WAITING', waitMinutes: 7, removalLabel: null, splitWait: false }

  describe('English (the Charges pages)', () => {
    it("words a new leg's charge as an extra rider, never as the code SPLIT_LEG", () => {
      expect(reasonText(splitLeg)).toBe("Extra rider: the order didn't fit the size it was sent as")
      expect(reasonText(splitLeg)).not.toContain('SPLIT_LEG')
    })

    it('words the split wait as "Waiting while dispatch split the order"', () => {
      expect(reasonText(splitWait)).toBe('Waiting while dispatch split the order')
    })

    it('does not call a split wait a delay past the ready time', () => {
      expect(reasonText(splitWait)).not.toContain('ready time')
      expect(reasonText({ ...splitWait, waitMinutes: null })).toBe('Waiting while dispatch split the order')
    })

    it('an ordinary delay wait keeps its own words', () => {
      expect(reasonText(delayWait)).toBe('Rider kept waiting, 7 min past the agreed ready time')
    })

    it('a line from an older server (no splitWait field) reads as an ordinary wait', () => {
      expect(reasonText({ reason: 'WAITING', waitMinutes: 7, removalLabel: null })).toBe(
        'Rider kept waiting, 7 min past the agreed ready time'
      )
    })
  })

  describe('Greek (the statement a restaurant is handed)', () => {
    it("words a new leg's charge in Greek, never as the code", () => {
      expect(greekReason(splitLeg)).toBe('Επιπλέον διανομέας: η παραγγελία δεν χωρούσε στο μέγεθος που δηλώθηκε')
      expect(greekReason(splitLeg)).not.toContain('SPLIT_LEG')
    })

    it('words the split wait in Greek', () => {
      expect(greekReason(splitWait)).toBe('Αναμονή όσο η διανομή χώριζε την παραγγελία')
    })

    it('does not call a split wait a wait past the agreed time', () => {
      expect(greekReason(splitWait)).not.toContain('μετά την ώρα που είχε συμφωνηθεί')
    })

    it('an ordinary delay wait keeps its own Greek words', () => {
      expect(greekReason(delayWait)).toBe('Αναμονή διανομέα, 7 λεπτά μετά την ώρα που είχε συμφωνηθεί')
      expect(greekReason({ reason: 'WAITING', waitMinutes: 7, removalLabel: null })).toBe(
        'Αναμονή διανομέα, 7 λεπτά μετά την ώρα που είχε συμφωνηθεί'
      )
    })
  })

  describe('the CSV', () => {
    const csvLine = (overrides: Partial<CsvChargeLine>): CsvChargeLine =>
      ({
        id: 'charge-1',
        partnerName: 'Volos Test Kitchen',
        createdAt: '2026-11-21T12:10:00Z',
        happenedAt: '2026-11-21T12:10:00Z',
        reason: 'WAITING',
        waitMinutes: null,
        removalLabel: null,
        amount: 356,
        currencyCode: 'EUR',
        deliveryId: 'del-abcdef123456',
        orderReference: 'ORDER-77',
        billId: null,
        bill: null,
        ...overrides,
      } as CsvChargeLine)

    // The fields of the first charge row (the header is row 0).
    const firstRow = (line: CsvChargeLine) => (buildChargesCsv([line]).split('\r\n')[1] ?? '').split(';')

    it("a new leg's row carries the Greek words and the amount the server sent", () => {
      const fields = firstRow(csvLine({ reason: 'SPLIT_LEG', amount: 356 }))

      expect(fields[3]).toBe('"Επιπλέον διανομέας: η παραγγελία δεν χωρούσε στο μέγεθος που δηλώθηκε"')
      expect(fields[5]).toBe('3,56')
      expect(fields.join(';')).not.toContain('SPLIT_LEG')
    })

    it("a split wait's row carries its own Greek words and the amount the server sent", () => {
      const fields = firstRow(csvLine({ reason: 'WAITING', splitWait: true, waitMinutes: 7, amount: 70 }))

      expect(fields[3]).toBe('"Αναμονή όσο η διανομή χώριζε την παραγγελία"')
      expect(fields[5]).toBe('0,70')
    })
  })
})
