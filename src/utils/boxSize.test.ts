import { boxSizeText as rawBoxSizeText } from './boxSize'
import { createI18n } from '@/i18n/createI18n'

const t = createI18n('en').t
const boxSizeText = (delivery: Parameters<typeof rawBoxSizeText>[0]) => rawBoxSizeText(delivery, t)

describe('boxSizeText (spec 0043, AC-8)', () => {
  it('formats size and units without assumed when boxSizeAssumed is false', () => {
    // "Medium, 50 units" when size and units are present
    const result = boxSizeText({
      boxSize: 'MEDIUM',
      boxUnits: 50,
      boxSizeAssumed: false,
    })
    expect(result).toBe('Medium, 50 units')
  })

  it('appends ", assumed" only when boxSizeAssumed is true', () => {
    const assumed = boxSizeText({
      boxSize: 'MEDIUM',
      boxUnits: 50,
      boxSizeAssumed: true,
    })
    expect(assumed).toBe('Medium, 50 units, assumed')

    const smallAssumed = boxSizeText({
      boxSize: 'SMALL',
      boxUnits: 30,
      boxSizeAssumed: true,
    })
    expect(smallAssumed).toBe('Small, 30 units, assumed')

    const largeExplicit = boxSizeText({
      boxSize: 'LARGE',
      boxUnits: 100,
      boxSizeAssumed: false,
    })
    expect(largeExplicit).toBe('Large, 100 units')
  })

  it('returns null when delivery has no boxSize', () => {
    expect(boxSizeText({})).toBeNull()
    expect(boxSizeText({ boxSize: null })).toBeNull()
    expect(boxSizeText({ boxSize: undefined })).toBeNull()
    expect(boxSizeText({ boxSize: '' })).toBeNull()
  })

  it('formats size cleanly without units when boxUnits is missing', () => {
    expect(boxSizeText({ boxSize: 'MEDIUM' })).toBe('Medium')
    expect(boxSizeText({ boxSize: 'MEDIUM', boxSizeAssumed: true })).toBe('Medium, assumed')
  })

  it('falls back to raw boxSize if size is not in predefined word map', () => {
    expect(boxSizeText({ boxSize: 'EXTRA_LARGE', boxUnits: 120 })).toBe('EXTRA_LARGE, 120 units')
  })
})
