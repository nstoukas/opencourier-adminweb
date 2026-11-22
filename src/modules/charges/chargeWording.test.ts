import fs from 'fs'
import path from 'path'
import {
  DELIVERY_FEE_NOTE,
  reasonText,
  orderLabel,
  adminOrderLabel,
  billLabel,
} from './chargeWording'
import type { PartnerChargeLineDto } from '@/backend-admin-sdk'
import { createI18n } from '@/i18n/createI18n'

const tEnglish = createI18n('en').t

describe('chargeWording (spec 0036, AC-3)', () => {
  describe('DELIVERY_FEE_NOTE', () => {
    it('matches the exact required wording from spec 0036', () => {
      expect(DELIVERY_FEE_NOTE).toBe('Delivery fees are paid by customers and never appear here.')
    })
  })

  describe('reasonText', () => {
    it('returns "Cancelled after a rider accepted" for CANCELLATION', () => {
      expect(reasonText(tEnglish, { reason: 'CANCELLATION', waitMinutes: null, removalLabel: null })).toBe(
        'Cancelled after a rider accepted'
      )
    })

    it('returns "Rider kept waiting, N min past the agreed ready time" for WAITING with minutes', () => {
      expect(reasonText(tEnglish, { reason: 'WAITING', waitMinutes: 12, removalLabel: null })).toBe(
        'Rider kept waiting, 12 min past the agreed ready time'
      )
      expect(reasonText(tEnglish, { reason: 'WAITING', waitMinutes: 1, removalLabel: null })).toBe(
        'Rider kept waiting, 1 min past the agreed ready time'
      )
    })

    it('returns "Rider kept waiting past the agreed ready time" for WAITING without minutes (null)', () => {
      expect(reasonText(tEnglish, { reason: 'WAITING', waitMinutes: null, removalLabel: null })).toBe(
        'Rider kept waiting past the agreed ready time'
      )
    })

    it('returns "Rider taken off the order: <label>" for REMOVAL with label', () => {
      expect(
        reasonText(tEnglish, { reason: 'REMOVAL', waitMinutes: null, removalLabel: 'Moped breakdown' })
      ).toBe('Rider taken off the order: Moped breakdown')
    })

    it('handles REMOVAL with null label without trailing space', () => {
      expect(reasonText(tEnglish, { reason: 'REMOVAL', waitMinutes: null, removalLabel: null })).toBe(
        'Rider taken off the order:'
      )
    })

    it('falls back to String(reason) for an unknown reason', () => {
      expect(reasonText(tEnglish, { reason: 'SOMETHING_ELSE' as any, waitMinutes: null, removalLabel: null })).toBe(
        'SOMETHING_ELSE'
      )
    })
  })

  describe('orderLabel and adminOrderLabel (decision 109.5)', () => {
    const lineWithRef = {
      orderReference: 'R32-1',
      deliveryId: 'del-abcdef123456',
    }
    const lineWithoutRef = {
      orderReference: null,
      deliveryId: 'del-abcdef123456',
    }
    const lineWithBlankRef = {
      orderReference: '   ',
      deliveryId: 'del-abcdef123456',
    }

    it('orderLabel returns orderReference when present, else last 6 characters of deliveryId', () => {
      expect(orderLabel(lineWithRef)).toBe('R32-1')
      expect(orderLabel(lineWithoutRef)).toBe('123456')
      expect(orderLabel(lineWithBlankRef)).toBe('123456')
    })

    it('adminOrderLabel returns "reference · shortId" when reference present, else shortId alone', () => {
      expect(adminOrderLabel(lineWithRef)).toBe('R32-1 · 123456')
      expect(adminOrderLabel(lineWithoutRef)).toBe('123456')
      expect(adminOrderLabel(lineWithBlankRef)).toBe('123456')
    })
  })

  describe('billLabel', () => {
    it('returns the reference when present and non-empty', () => {
      expect(billLabel(tEnglish, { reference: 'INV-42', createdAt: '2026-11-18T12:05:00Z' })).toBe('INV-42')
      expect(billLabel(tEnglish, { reference: '  ΤΠΥ 99  ', createdAt: '2026-11-18T12:05:00Z' })).toBe('ΤΠΥ 99')
    })

    it('returns "Billed DD/MM/YYYY HH:mm" in Athens time when reference is null or blank', () => {
      // 2026-11-18 12:05:00 UTC = 14:05 Athens time
      expect(billLabel(tEnglish, { reference: null, createdAt: '2026-11-18T12:05:00Z' })).toBe('Billed 18/11/2026 14:05')
      expect(billLabel(tEnglish, { reference: '   ', createdAt: '2026-11-18T12:05:00Z' })).toBe('Billed 18/11/2026 14:05')
    })
  })

  describe('AC-3 wording scan: no "fee" or "delivery price" in fixed English strings', () => {
    it('ensures no fixed reason string contains "fee" or "delivery price"', () => {
      const sampleReasons: Pick<PartnerChargeLineDto, 'reason' | 'waitMinutes' | 'removalLabel'>[] = [
        { reason: 'CANCELLATION', waitMinutes: null, removalLabel: null },
        { reason: 'WAITING', waitMinutes: 10, removalLabel: null },
        { reason: 'WAITING', waitMinutes: null, removalLabel: null },
        { reason: 'REMOVAL', waitMinutes: null, removalLabel: 'Incident' },
      ]

      for (const sample of sampleReasons) {
        const text = reasonText(tEnglish, sample)
        expect(text).not.toMatch(/\bfee\b/i)
        expect(text).not.toMatch(/delivery price/i)
      }
    })

    it('scans chargeWording.ts source file for "fee" and "delivery price", allowing only DELIVERY_FEE_NOTE', () => {
      const filePath = path.resolve(__dirname, 'chargeWording.ts')
      const source = fs.readFileSync(filePath, 'utf-8')

      // Split lines, ignoring comments (lines starting with //)
      const lines = source.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          continue
        }
        if (trimmed.includes('DELIVERY_FEE_NOTE =')) {
          continue
        }
        // No other code line may mention "fee" or "delivery price"
        expect(trimmed).not.toMatch(/\bfee\b/i)
        expect(trimmed).not.toMatch(/delivery price/i)
      }
    })
  })

  describe('no "fee" in charges UI strings (spec 0036, AC-3 constraint)', () => {
    it('ensures no charges component or wording file mentions "fee" outside DELIVERY_FEE_NOTE', () => {
      const chargesDir = path.resolve(__dirname)
      const files = fs.readdirSync(chargesDir)

      const feeRegex = /\bfee\b|\bfees\b/i

      for (const file of files) {
        // Skip test files, types, and CSV logic where column names might differ
        if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue

        const filePath = path.join(chargesDir, file)
        const stat = fs.statSync(filePath)
        if (!stat.isFile()) continue

        let content = fs.readFileSync(filePath, 'utf-8')

        // Remove the exact allowed DELIVERY_FEE_NOTE constant definition and comments
        content = content.replace(/DELIVERY_FEE_NOTE\s*=\s*['"`].*?['"`]/g, '')
        // Strip block and line comments to avoid false alarms in documentation comments
        content = content.replace(/\/\*[\s\S]*?\*\//g, '')
        content = content.replace(/\/\/.*/g, '')

        const matches = content.match(feeRegex)
        expect(matches).toBeNull()
      }
    })
  })

  describe('no "fee" in the English charges words (spec 0054 moved the strings to src/i18n/resources/en/charges.ts)', () => {
    it('only deliveryFeeNote may say "fee" or "delivery price"', () => {
      const filePath = path.resolve(__dirname, '../../i18n/resources/en/charges.ts')
      const source = fs.readFileSync(filePath, 'utf-8')
      for (const line of source.split('\n')) {
        const trimmed = line.trim()
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue
        if (trimmed.startsWith('deliveryFeeNote:')) continue
        expect(trimmed).not.toMatch(/\bfee\b|\bfees\b/i)
        expect(trimmed).not.toMatch(/delivery price/i)
      }
    })
  })
})
