import { csvText, buildChargesCsv, downloadCsv, CsvChargeLine } from './chargesCsv'
import { createI18n } from '@/i18n/createI18n'

const tGreek = createI18n('el').getFixedT('el')

const GREEK = {
  csvHeader:
    'Κατάστημα;Ημερομηνία και ώρα;Παραγγελία;Αιτία;Λεπτά μετά τη συμφωνημένη ώρα;Ποσό;Νόμισμα;Τιμολογήθηκε;Χρέωση;Κωδικός διανομής',
  yes: 'ναι',
  no: 'όχι',
}

describe('chargesCsv (spec 0036, AC-10, decision 109.5)', () => {
  describe('csvText', () => {
    it('quotes regular text with double quotes', () => {
      expect(csvText('Nosh')).toBe('"Nosh"')
      expect(csvText('Souvlaki Bar')).toBe('"Souvlaki Bar"')
    })

    it('doubles inner double quotes', () => {
      expect(csvText('Nosh "Volos"')).toBe('"Nosh ""Volos"""')
      expect(csvText('"quoted"')).toBe('"""quoted"""')
    })

    it('guards leading formula characters =, +, -, @ with a leading single quote', () => {
      expect(csvText('=SUM(A1)')).toBe("\"'=SUM(A1)\"")
      expect(csvText('+12345')).toBe("\"'+12345\"")
      expect(csvText('-50')).toBe("\"'-50\"")
      expect(csvText('@mention')).toBe("\"'@mention\"")
    })

    it('guards leading tab and carriage return with a leading single quote (decision 109.5 hardening)', () => {
      expect(csvText('\t=SUM(1,2)')).toBe("\"'\t=SUM(1,2)\"")
      expect(csvText('\r=SUM(1,2)')).toBe("\"'\r=SUM(1,2)\"")
    })

    it('leaves text starting with harmless characters un-escaped with single quote', () => {
      expect(csvText('Plain text')).toBe('"Plain text"')
      expect(csvText('123')).toBe('"123"')
    })
  })

  describe('buildChargesCsv', () => {
    // partnerId rides along as the route sends it; CsvChargeLine itself does not need it.
    const sampleLines: (CsvChargeLine & { partnerId: string })[] = [
      {
        id: 'c-1',
        partnerId: 'p-1',
        partnerName: 'Nosh',
        createdAt: '2026-11-30T22:30:00Z',
        // happenedAt at 2026-11-30 22:30:00 UTC = 2026-12-01 00:30 in Athens time
        happenedAt: '2026-11-30T22:30:00Z',
        reason: 'WAITING',
        waitMinutes: 12,
        removalLabel: null,
        amount: 1240,
        currencyCode: 'EUR',
        deliveryId: 'del-abcdef123456',
        orderReference: 'R32-1',
        billId: 'bill-1',
        bill: {
          id: 'bill-1',
          reference: 'INV-001',
          createdAt: '2026-12-01T10:00:00Z',
        },
      },
      {
        id: 'c-2',
        partnerId: 'p-2',
        partnerName: '=UnsafePartner',
        createdAt: '2026-11-15T10:00:00Z',
        happenedAt: '2026-11-15T10:00:00Z',
        reason: 'CANCELLATION',
        waitMinutes: null,
        removalLabel: null,
        amount: 0,
        currencyCode: 'EUR',
        deliveryId: 'del-123456789012',
        orderReference: null,
        billId: null,
        bill: null,
      },
    ]

    it('starts with BOM character U+FEFF', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      expect(csv.charCodeAt(0)).toBe(0xfeff)
      expect(csv.startsWith('\uFEFF')).toBe(true)
    })

    it('includes exact Greek header from spec Wording table', () => {
      const csv = buildChargesCsv(tGreek, [])
      expect(csv).toBe(`\uFEFF${GREEK.csvHeader}\r\n`)
    })

    it('uses semicolon (;) delimiter and CRLF (\\r\\n) line endings', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      expect(csv).not.toContain('\r\r')
      const lines = csv.split('\r\n')
      expect(lines.length).toBe(4) // BOM+Header, Line 1, Line 2, empty string after trailing CRLF
      expect(lines[3]).toBe('')

      for (const line of [lines[0], lines[1], lines[2]]) {
        expect(line?.includes(';')).toBe(true)
      }
    })

    it('formats amounts with decimal comma and no currency sign', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')
      const row2Columns = (lines[2] ?? '').split(';')

      // Column 5 (0-indexed) is Amount: 12,40 and 0,00
      expect(row1Columns[5]).toBe('12,40')
      expect(row2Columns[5]).toBe('0,00')
      expect(row1Columns[5]).not.toContain('€')
      expect(row2Columns[5]).not.toContain('€')
    })

    it('converts happenedAt time to YYYY-MM-DD HH:mm in Athens time', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')

      // 2026-11-30T22:30:00Z UTC -> 2026-12-01 00:30 in Athens
      expect(row1Columns[1]).toBe('"2026-12-01 00:30"')
    })

    it('marks billed as "ναι" with bill label and unbilled as "όχι" with empty bill label', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')
      const row2Columns = (lines[2] ?? '').split(';')

      // Column 7: Billed (ναι / όχι)
      // Column 8: Bill label
      expect(row1Columns[7]).toBe(`"${GREEK.yes}"`)
      expect(row1Columns[8]).toBe('"INV-001"')

      expect(row2Columns[7]).toBe(`"${GREEK.no}"`)
      expect(row2Columns[8]).toBe('""')
    })

    it('protects formula injection in restaurant name', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row2Columns = (lines[2] ?? '').split(';')

      // Partner name '=UnsafePartner' must be protected
      expect(row2Columns[0]).toBe("\"'=UnsafePartner\"")
    })

    it('includes wait minutes only for WAITING with minutes', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')
      const row2Columns = (lines[2] ?? '').split(';')

      // Column 4: Minutes
      expect(row1Columns[4]).toBe('12')
      expect(row2Columns[4]).toBe('')
    })

    it('includes full delivery ID in the last column (Column 9)', () => {
      const csv = buildChargesCsv(tGreek, sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')

      expect(row1Columns[9]).toBe('"del-abcdef123456"')
    })
  })

  describe('downloadCsv', () => {
    let originalCreateObjectURL: typeof window.URL.createObjectURL
    let originalRevokeObjectURL: typeof window.URL.revokeObjectURL
    let createObjectURLMock: jest.Mock
    let revokeObjectURLMock: jest.Mock

    beforeEach(() => {
      jest.useFakeTimers()
      originalCreateObjectURL = window.URL.createObjectURL
      originalRevokeObjectURL = window.URL.revokeObjectURL
      createObjectURLMock = jest.fn(() => 'blob:mock-url')
      revokeObjectURLMock = jest.fn()
      window.URL.createObjectURL = createObjectURLMock
      window.URL.revokeObjectURL = revokeObjectURLMock
    })

    afterEach(() => {
      jest.useRealTimers()
      window.URL.createObjectURL = originalCreateObjectURL
      window.URL.revokeObjectURL = originalRevokeObjectURL
    })

    it('creates a Blob with text/csv;charset=utf-8 type and triggers link click', () => {
      const appendChildSpy = jest.spyOn(document.body, 'appendChild')
      const removeChildSpy = jest.spyOn(document.body, 'removeChild')
      const clickMock = jest.fn()

      const originalCreateElement = document.createElement.bind(document)
      const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName)
        if (tagName === 'a') {
          element.click = clickMock
        }
        return element
      })

      downloadCsv('test-charges.csv', 'sample csv content')

      expect(createObjectURLMock).toHaveBeenCalledTimes(1)
      const blobPassed = createObjectURLMock.mock.calls[0][0]
      expect(blobPassed).toBeInstanceOf(Blob)
      expect(blobPassed.type).toBe('text/csv;charset=utf-8')

      expect(clickMock).toHaveBeenCalledTimes(1)
      // The object URL is not revoked before 1000 ms (Safari deferred download fix)
      expect(revokeObjectURLMock).not.toHaveBeenCalled()
      jest.advanceTimersByTime(999)
      expect(revokeObjectURLMock).not.toHaveBeenCalled()
      jest.advanceTimersByTime(1)
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url')

      appendChildSpy.mockRestore()
      removeChildSpy.mockRestore()
      createElementSpy.mockRestore()
    })
  })
})
