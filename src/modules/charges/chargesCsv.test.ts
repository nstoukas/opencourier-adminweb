import { csvText, buildChargesCsv, downloadCsv, CsvChargeLine } from './chargesCsv'
import { GREEK } from './greek'

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
        billId: 'b-1',
        bill: {
          id: 'b-1',
          reference: 'INV-001',
          createdAt: '2026-12-01T10:00:00Z',
        },
      },
      {
        id: 'c-2',
        partnerId: 'p-2',
        partnerName: '=SUM(A1)',
        createdAt: '2026-11-20T10:00:00Z',
        happenedAt: '2026-11-20T10:00:00Z',
        reason: 'CANCELLATION',
        waitMinutes: null,
        removalLabel: null,
        amount: 0,
        currencyCode: 'EUR',
        deliveryId: 'del-xyz987654321',
        orderReference: null,
        billId: null,
        bill: null,
      },
    ]

    it('starts with BOM character U+FEFF', () => {
      const csv = buildChargesCsv(sampleLines)
      expect(csv.charCodeAt(0)).toBe(0xfeff)
      expect(csv.startsWith('\uFEFF')).toBe(true)
    })

    it('includes exact Greek header from spec Wording table', () => {
      const csv = buildChargesCsv([])
      expect(csv).toBe(`\uFEFF${GREEK.csvHeader}\r\n`)
    })

    it('uses semicolon (;) delimiter and CRLF (\\r\\n) line endings', () => {
      const csv = buildChargesCsv(sampleLines)
      expect(csv).not.toContain('\r\r')
      const lines = csv.split('\r\n')
      expect(lines.length).toBe(4) // BOM+Header, Line 1, Line 2, empty string after trailing CRLF
      expect(lines[3]).toBe('')

      for (const line of [lines[0], lines[1], lines[2]]) {
        expect(line?.includes(';')).toBe(true)
      }
    })

    it('formats amounts with decimal comma and no currency sign', () => {
      const csv = buildChargesCsv(sampleLines)
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
      const csv = buildChargesCsv(sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')

      // 2026-11-30T22:30:00Z UTC -> 2026-12-01 00:30 in Athens
      expect(row1Columns[1]).toBe('"2026-12-01 00:30"')
    })

    it('marks billed as "ναι" with bill label and unbilled as "όχι" with empty bill label', () => {
      const csv = buildChargesCsv(sampleLines)
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
      const csv = buildChargesCsv(sampleLines)
      const lines = csv.split('\r\n')
      const row2Columns = (lines[2] ?? '').split(';')

      // Column 0: Restaurant name '=SUM(A1)' is shielded with leading quote
      expect(row2Columns[0]).toBe("\"'=SUM(A1)\"")
    })

    it('includes wait minutes only for WAITING with minutes', () => {
      const csv = buildChargesCsv(sampleLines)
      const lines = csv.split('\r\n')
      const row1Columns = (lines[1] ?? '').split(';')
      const row2Columns = (lines[2] ?? '').split(';')

      // Column 4: Minutes
      expect(row1Columns[4]).toBe('12')
      expect(row2Columns[4]).toBe('')
    })
  })

  describe('downloadCsv', () => {
    it('creates an anchor, clicks it, and revokes the object URL', () => {
      const originalCreateObjectURL = URL.createObjectURL
      const originalRevokeObjectURL = URL.revokeObjectURL
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:http://localhost/test-uuid')
      const mockRevokeObjectURL = jest.fn()
      URL.createObjectURL = mockCreateObjectURL
      URL.revokeObjectURL = mockRevokeObjectURL

      const appendChildSpy = jest.spyOn(document.body, 'appendChild')
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

      downloadCsv('charges-test.csv', '\uFEFFheader;\r\n')

      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
      expect(appendChildSpy).toHaveBeenCalled()
      expect(clickSpy).toHaveBeenCalledTimes(1)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid')

      URL.createObjectURL = originalCreateObjectURL
      URL.revokeObjectURL = originalRevokeObjectURL
      appendChildSpy.mockRestore()
      clickSpy.mockRestore()
    })
  })
})
