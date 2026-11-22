import type { TFunction } from 'i18next'
import type { en } from './resources/en'

// The groups in resources/en/enums.ts ('deliveryStatus', 'removalRequestStatus', ...). `keyof typeof`
// turns the object's keys into a union type, so a misspelt group is a type error.
export type EnumGroup = keyof typeof en.enums

/**
 * A backend enum value as words in the reader's language (spec 0054): `enumLabel(t, 'deliveryStatus',
 * 'PICKED_UP')` reads "Παραλήφθηκε" or "Picked Up". A value the backend added after this copy (no key
 * yet) is shown as it came, as the old `*_TO_HUMAN` maps did with `?? value`.
 */
export function enumLabel(t: TFunction, group: EnumGroup, value: string | null | undefined): string {
  if (!value) return '—'
  // defaultValue is what i18next returns when the key does not exist.
  return t(`enums.${group}.${value}`, { defaultValue: value })
}
