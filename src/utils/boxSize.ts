// Spec 0043 (row 9, AC-8): a delivery's box size in words, for the deliveries list and the delivery
// page. The units are the ones the delivery got at creation (of a rider's 100), so they stay right
// after the co-op changes its settings.
const SIZE_WORDS: Record<string, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
};

// "Medium, 50 units", and "Medium, 50 units, assumed" when the restaurant sent no size and the
// co-op's default was used. null when the backend sent no size (an older backend).
export function boxSizeText(delivery: {
  boxSize?: string | null;
  boxUnits?: number | null;
  boxSizeAssumed?: boolean | null;
}): string | null {
  if (!delivery.boxSize) return null;
  const word = SIZE_WORDS[delivery.boxSize] ?? delivery.boxSize;
  const units =
    typeof delivery.boxUnits === "number" ? `, ${delivery.boxUnits} units` : "";
  return `${word}${units}${delivery.boxSizeAssumed ? ", assumed" : ""}`;
}
