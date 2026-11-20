import React from "react";

// Spec 0043 (AC-6, AC-8): an admin's assignment that would put a rider past a full box. The backend
// answers 409 BOX_OVER_CAPACITY with what the rider holds and what the order takes (of 100 units);
// the dialog then shows this warning, and sending again with confirmOverCapacity goes ahead. The
// backend records the confirmed override with the admin's name.
//
// `courierId`: the rider the warning is about (review fix). A 409 for one rider can land after the
// admin picked another; the warning then belongs to no one on screen and confirms nothing.
export type BoxOverCapacity = {
  courierId: string;
  heldUnits: number;
  deliveryUnits: number;
};

// The numbers when `error` is that 409 for `courierId`, else null (any other error is shown as before).
export function boxOverCapacityOf(
  error: unknown,
  courierId: string
): BoxOverCapacity | null {
  const e = error as {
    code?: unknown;
    heldUnits?: unknown;
    deliveryUnits?: unknown;
  } | null;
  if (!e || e.code !== "BOX_OVER_CAPACITY") return null;
  if (typeof e.heldUnits !== "number" || typeof e.deliveryUnits !== "number")
    return null;
  return { courierId, heldUnits: e.heldUnits, deliveryUnits: e.deliveryUnits };
}

// True only when the warning is about the rider now chosen and the admin ticked the box: the one
// state in which the next press may send confirmOverCapacity.
export function overCapacityConfirmed(
  value: BoxOverCapacity | null,
  courierId: string | undefined,
  checked: boolean
): boolean {
  return value !== null && value.courierId === courierId && checked;
}

export const BOX_OVER_CAPACITY_WARNING_ID = "box-over-capacity-warning";

// The warning, and a tick box the admin must tick before the confirm button works (review fix): the
// confirm is a separate deliberate act, so a double press or a held Enter cannot confirm it unread.
export function BoxOverCapacityWarning({
  value,
  checked,
  onCheckedChange,
}: {
  value: BoxOverCapacity | null;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  if (!value) return null;
  const total = value.heldUnits + value.deliveryUnits;
  return (
    // role="alert": a screen reader says it as soon as it appears. The dialog's button points here
    // with aria-describedby, so its new name is read with the reason.
    <div
      id={BOX_OVER_CAPACITY_WARNING_ID}
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
      <label className="mt-2 flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onCheckedChange(event.target.checked)}
        />
        I checked with the rider that this order fits
      </label>
    </div>
  );
}
