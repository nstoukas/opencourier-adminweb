import { describeOfferExpiry } from './offerExpiry'

describe('describeOfferExpiry (spec 0002, AC-10)', () => {
  it('returns loading message when enabled is null (before setting has loaded)', () => {
    expect(describeOfferExpiry(null, '60')).toBe('Loading the current setting.')
    expect(describeOfferExpiry(null, '')).toBe('Loading the current setting.')
  })

  it('explains Off state when enabled is false', () => {
    const text = describeOfferExpiry(false, '60')
    expect(text).toBe(
      'Off: an offer keeps ringing on the rider’s phone until they answer, and admin shows how long it has waited.'
    )
  })

  it('explains On state with the configured seconds number', () => {
    const text = describeOfferExpiry(true, '45')
    expect(text).toBe(
      'On: an offer nobody answers ends after 45 seconds and goes to the next rider. A missed offer is never counted against the rider.'
    )
    // Value 5: explicit statement that a missed offer is never counted against the rider
    expect(text).toContain('A missed offer is never counted against the rider.')
  })

  it('falls back to "the set number of" when secondsText is empty or whitespace', () => {
    expect(describeOfferExpiry(true, '')).toBe(
      'On: an offer nobody answers ends after the set number of seconds and goes to the next rider. A missed offer is never counted against the rider.'
    )
    expect(describeOfferExpiry(true, '   ')).toBe(
      'On: an offer nobody answers ends after the set number of seconds and goes to the next rider. A missed offer is never counted against the rider.'
    )
  })
})
