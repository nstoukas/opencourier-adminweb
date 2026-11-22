import type { TFunction } from 'i18next'

// The sentence under the Offer expiry switch on Instance configuration (spec 0002, AC-10).
// It says what each choice does to an offer, in the words a representative uses when the
// assembly votes on it, and repeats the promise that a missed offer is never held against a
// rider (value 5). Takes `t` (i18next's lookup function) for the reader's language (spec 0054).
export function describeOfferExpiry(enabled: boolean | null, secondsText: string, t: TFunction): string {
  if (enabled === null) {
    return t('deliveries.offerExpiry.loading')
  }
  if (!enabled) {
    return t('deliveries.offerExpiry.off')
  }
  const seconds = secondsText.trim()
  // Two sentences rather than a word slotted in: Greek builds "after N seconds" and "after the set
  // number of seconds" differently.
  return seconds === ''
    ? t('deliveries.offerExpiry.onSetNumber')
    : t('deliveries.offerExpiry.on', { seconds })
}
