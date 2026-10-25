// The sentence under the Offer expiry switch on Instance configuration (spec 0002, AC-10).
// It says what each choice does to an offer, in the words a representative uses when the
// assembly votes on it, and repeats the promise that a missed offer is never held against a
// rider (value 5).
export function describeOfferExpiry(enabled: boolean | null, secondsText: string): string {
  if (enabled === null) {
    return 'Loading the current setting.'
  }
  if (!enabled) {
    return 'Off: an offer keeps ringing on the rider’s phone until they answer, and admin shows how long it has waited.'
  }
  const seconds = secondsText.trim() === '' ? 'the set number of' : secondsText.trim()
  return `On: an offer nobody answers ends after ${seconds} seconds and goes to the next rider. A missed offer is never counted against the rider.`
}
