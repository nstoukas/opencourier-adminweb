// Spec 0046 (row 10, AC-6): an order too big for one box goes as several deliveries ("legs") sharing the
// restaurant's order reference, each labelled "Leg 1 of 2". Both labels null for a single delivery.
export function legText(delivery: { legNumber?: number | null; legCount?: number | null }): string | null {
  if (!delivery.legNumber || !delivery.legCount) return null;
  return `Leg ${delivery.legNumber} of ${delivery.legCount}`;
}
