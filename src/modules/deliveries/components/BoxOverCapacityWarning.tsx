import React from "react";

// Spec 0043 (AC-6, AC-8): an admin's assignment that would put a rider past a full box. The backend
// answers 409 BOX_OVER_CAPACITY with what the rider holds and what the order takes (of 100 units);
// the dialog then shows this warning, and the same button sent again with confirmOverCapacity goes
// ahead. The backend records the confirmed override with the admin's name.
export type BoxOverCapacity = { heldUnits: number; deliveryUnits: number };

// The two numbers when `error` is that 409, else null (any other error is shown as before).
export function boxOverCapacityOf(error: unknown): BoxOverCapacity | null {
  const e = error as {
    code?: unknown;
    heldUnits?: unknown;
    deliveryUnits?: unknown;
  } | null;
  if (!e || e.code !== "BOX_OVER_CAPACITY") return null;
  if (typeof e.heldUnits !== "number" || typeof e.deliveryUnits !== "number")
    return null;
  return { heldUnits: e.heldUnits, deliveryUnits: e.deliveryUnits };
}

export function BoxOverCapacityWarning({
  value,
}: {
  value: BoxOverCapacity | null;
}) {
  if (!value) return null;
  const total = value.heldUnits + value.deliveryUnits;
  return (
    // role="alert": a screen reader says it as soon as it appears, since focus stays on the button.
    <div
      role="alert"
      className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm"
    >
      <p className="font-medium">This would overfill the rider&apos;s box.</p>
      <p className="mt-1">
        They already hold {value.heldUnits} of 100 box units, and this order
        takes {value.deliveryUnits}: {total} in all. An overstuffed box is
        unsafe to ride with. Go ahead only if you have checked with the rider;
        it is recorded with your name.
      </p>
    </div>
  );
}
