import type { TFunction } from 'i18next'

// Spec 0043 (row 9, AC-8): a delivery's box size in words, for the deliveries list and the delivery
// page. The units are the ones the delivery got at creation (of a rider's 100), so they stay right
// after the co-op changes its settings.

// "Medium, 50 units", and "Medium, 50 units, assumed" when the restaurant sent no size and the
// co-op's default was used. null when the backend sent no size (an older backend).
// Takes `t` (i18next's lookup function) so the words are the reader's language (spec 0054).
export function boxSizeText(
  delivery: {
    boxSize?: string | null;
    boxUnits?: number | null;
    boxSizeAssumed?: boolean | null;
  },
  t: TFunction
): string | null {
  if (!delivery.boxSize) return null;
  // A size this copy does not know yet is shown as sent.
  const word = t(`deliveries.boxSize.${delivery.boxSize}`, { defaultValue: delivery.boxSize });
  const units =
    typeof delivery.boxUnits === "number"
      ? t('deliveries.boxSize.units', { units: delivery.boxUnits })
      : "";
  return `${word}${units}${delivery.boxSizeAssumed ? t('deliveries.boxSize.assumed') : ""}`;
}
