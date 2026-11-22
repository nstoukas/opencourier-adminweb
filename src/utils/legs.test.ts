// Spec 0046 (row 10, AC-6): "Leg 1 of 2" on a leg of a multi leg order, nothing on a single delivery.
import { legText as rawLegText } from './legs'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
const legText = (delivery: Parameters<typeof rawLegText>[0]) => rawLegText(delivery, t)

describe('legText (spec 0046, AC-6)', () => {
  it('reads "Leg 1 of 2" when both labels are set', () => {
    expect(legText({ legNumber: 1, legCount: 2 })).toBe('Leg 1 of 2')
    expect(legText({ legNumber: 4, legCount: 4 })).toBe('Leg 4 of 4')
  })

  it('is null for a single delivery (both labels null)', () => {
    expect(legText({ legNumber: null, legCount: null })).toBeNull()
  })

  it('is null when an older backend sends no labels at all', () => {
    expect(legText({})).toBeNull()
  })

  it('is null when only one label is there', () => {
    expect(legText({ legNumber: 1, legCount: null })).toBeNull()
    expect(legText({ legNumber: null, legCount: 2 })).toBeNull()
  })
})
