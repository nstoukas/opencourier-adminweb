import type { TFunction } from 'i18next'

// Spec 0046 (row 10, AC-6): an order too big for one box goes as several deliveries ("legs") sharing the
// restaurant's order reference, each labelled "Leg 1 of 2". Both labels null for a single delivery.
// Takes `t` (i18next's lookup function) so the words are the reader's language (spec 0054).
export function legText(
  delivery: { legNumber?: number | null; legCount?: number | null },
  t: TFunction
): string | null {
  if (!delivery.legNumber || !delivery.legCount) return null;
  return t('deliveries.leg.ofCount', { number: delivery.legNumber, count: delivery.legCount });
}
