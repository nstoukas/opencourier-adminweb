import { courierName, deliverySettingLabel, memberSince } from './courierDisplay'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t

describe('courierDisplay helpers (spec 0012, AC-1, AC-2, cross-check precisions)', () => {
  describe('deliverySettingLabel', () => {
    it('maps AUTO_ACCEPT to "Auto accept"', () => {
      expect(deliverySettingLabel('AUTO_ACCEPT', t)).toBe('Auto accept')
    })

    it('maps MANUAL to "Manual"', () => {
      expect(deliverySettingLabel('MANUAL', t)).toBe('Manual')
    })

    it('maps AUTO_REJECT to "Auto reject"', () => {
      expect(deliverySettingLabel('AUTO_REJECT', t)).toBe('Auto reject')
    })

    it('maps NONE to "Not set" (renamed from "None")', () => {
      expect(deliverySettingLabel('NONE', t)).toBe('Not set')
    })

    it('shows unknown server value as sent', () => {
      expect(deliverySettingLabel('BATCHED_ONLY' as any, t)).toBe('BATCHED_ONLY')
    })
  })

  describe('memberSince', () => {
    it('formats createdAt as "MMMM YYYY" in browser time zone', () => {
      const date = new Date('2026-07-15T12:00:00.000Z')
      expect(memberSince(date, 'en')).toBe('July 2026')
    })

    it('formats earlier join dates as "MMMM YYYY"', () => {
      const date = new Date('2025-03-01T12:00:00.000Z')
      expect(memberSince(date, 'en')).toBe('March 2025')
    })
  })

  describe('courierName', () => {
    it('combines firstName and lastName', () => {
      expect(courierName({ firstName: 'Nikos', lastName: 'Pappas' }, t)).toBe('Nikos Pappas')
    })

    it('trims when only firstName is present', () => {
      expect(courierName({ firstName: 'Nikos', lastName: '' }, t)).toBe('Nikos')
    })

    it('trims when only lastName is present', () => {
      expect(courierName({ firstName: '', lastName: 'Pappas' }, t)).toBe('Pappas')
    })

    it('falls back to "Courier" when both parts are empty or whitespace', () => {
      expect(courierName({ firstName: '', lastName: '' }, t)).toBe('Courier')
      expect(courierName({ firstName: '   ', lastName: '  ' }, t)).toBe('Courier')
    })
  })
})
