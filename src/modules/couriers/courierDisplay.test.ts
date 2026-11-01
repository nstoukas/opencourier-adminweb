import { courierName, deliverySettingLabel, memberSince } from './courierDisplay'

describe('courierDisplay helpers (spec 0012, AC-1, AC-2, cross-check precisions)', () => {
  describe('deliverySettingLabel', () => {
    it('maps AUTO_ACCEPT to "Auto accept"', () => {
      expect(deliverySettingLabel('AUTO_ACCEPT')).toBe('Auto accept')
    })

    it('maps MANUAL to "Manual"', () => {
      expect(deliverySettingLabel('MANUAL')).toBe('Manual')
    })

    it('maps AUTO_REJECT to "Auto reject"', () => {
      expect(deliverySettingLabel('AUTO_REJECT')).toBe('Auto reject')
    })

    it('maps NONE to "Not set" (renamed from "None")', () => {
      expect(deliverySettingLabel('NONE')).toBe('Not set')
    })

    it('shows unknown server value as sent', () => {
      expect(deliverySettingLabel('BATCHED_ONLY' as any)).toBe('BATCHED_ONLY')
    })
  })

  describe('memberSince', () => {
    it('formats createdAt as "MMMM YYYY" in browser time zone', () => {
      const date = new Date('2026-07-15T12:00:00.000Z')
      expect(memberSince(date)).toBe('July 2026')
    })

    it('formats earlier join dates as "MMMM YYYY"', () => {
      const date = new Date('2025-03-01T00:00:00.000Z')
      expect(memberSince(date)).toBe('March 2025')
    })
  })

  describe('courierName', () => {
    it('combines firstName and lastName', () => {
      expect(courierName({ firstName: 'Nikos', lastName: 'Pappas' })).toBe('Nikos Pappas')
    })

    it('trims when only firstName is present', () => {
      expect(courierName({ firstName: 'Nikos', lastName: '' })).toBe('Nikos')
    })

    it('trims when only lastName is present', () => {
      expect(courierName({ firstName: '', lastName: 'Pappas' })).toBe('Pappas')
    })

    it('falls back to "Courier" when both parts are empty or whitespace', () => {
      expect(courierName({ firstName: '', lastName: '' })).toBe('Courier')
      expect(courierName({ firstName: '   ', lastName: '  ' })).toBe('Courier')
    })
  })
})
