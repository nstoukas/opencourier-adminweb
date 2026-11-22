import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../admin-web-components";
import type { OfferReasonAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { formatOptionalDate } from "../../../ui-shared-utils";
import { shortId } from "@/utils/shortId";

// Spec 0044 (AC-8): why each offer of this delivery went to its rider, as the backend recorded it at the
// offer (OfferReason). Read only. The candidates table shows other riders' figures, which is why it lives
// on this admin page only; riders see their own reasons in the app (spec 0045).

const STRATEGY_WORDS: Record<string, string> = {
  FAIRNESS: "Fairness (co-op weights)",
  NEAREST_COURIER: "Nearest free courier",
  COURIER_SENIORITY: "Most senior courier",
  STATIC: "Fixed courier (testing)",
  ADMIN: "Chosen by an admin",
};

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// "4 min 05 s", "26 h 28 min", or "—".
export function durationText(seconds: unknown): string {
  const s = number(seconds)
  if (s === null) return '—'
  const whole = Math.round(s)
  // An hour or more reads in hours and minutes ("26 h 28 min"); seconds stop mattering then.
  if (whole >= 3600) {
    const hours = Math.floor(whole / 3600)
    return `${hours} h ${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')} min`
  }
  const minutes = Math.floor(whole / 60)
  return minutes > 0 ? `${minutes} min ${String(whole % 60).padStart(2, '0')} s` : `${whole} s`
}

// "€8.40 per hour", with the euro sign the co-op uses everywhere on this page.
export function perHourText(cents: unknown): string {
  const c = number(cents);
  return c === null ? "—" : `€${(c / 100).toFixed(2)} per hour`;
}

function scoreText(score: unknown): string {
  const s = number(score);
  return s === null ? "—" : s.toFixed(3);
}

// The chosen rider's figures in words, per strategy (spec 0044, cross check 10). An add on (row 81) was not
// chosen by the matcher's figures, so it has only its own lines (addOnLines); the strategy in its heading is
// the co-op's matcher setting at the time.
export function reasonLines(reason: OfferReasonAdmin): string[] {
  const v = reason.values;
  if (reason.kind === "ADD_ON") return [];
  switch (reason.strategy) {
    case "FAIRNESS":
      return [
        `Road time ${durationText(v.roadSeconds)}${
          v.roadEstimated ? " (estimated, the router did not answer)" : ""
        }`,
        v.earningsEqual
          ? "Pay per hour today: counted equal for everyone (nobody had the minimum time online)"
          : `Pay per hour today ${perHourText(v.centsPerHour)}${
              v.earningsAssumed
                ? " (the co-op average, under the minimum time online)"
                : ""
            }`,
        `Waiting since the last job, or since going Online ${durationText(v.waitingSeconds)}`,
        // Spec 0049 (AC-3): recorded only while Shifts was on.
        ...(typeof v.onShift === "boolean"
          ? [v.onShift ? "On a booked shift" : "Not on a booked shift"]
          : []),
        `Score ${scoreText(reason.score)}, lowest of ${
          reason.candidateCount
        } compared (${reason.ridersInRange} in range)`,
      ];
    case "NEAREST_COURIER":
      return [
        `${number(v.straightMetres) ?? "—"} m in a straight line`,
        // Review fix: null means the router did not answer for this rider; say so rather than a dash.
        ...(v.roadSeconds === undefined
          ? []
          : v.roadSeconds === null
            ? ["No road time (the router did not answer)"]
            : [`Road time ${durationText(v.roadSeconds)}`]),
      ];
    case "COURIER_SENIORITY":
      return [
        `Member since ${formatOptionalDate(
          typeof v.memberSince === "string" ? v.memberSince : null
        )}`,
      ];
    case "ADMIN":
      // Review fix: the admin's user id, the one thing this reason records beyond the heading.
      return [
        typeof v.adminUserId === "string"
          ? `Admin user ${v.adminUserId.slice(-6)}`
          : "No admin recorded",
      ];
    case "STATIC":
      return ["The fixed courier set for testing"];
    default:
      return [];
  }
}

// Spec 0048 (AC-12): what a stack's reason adds to the rider's own figures: the other order offered with
// this one, the order of the four stops, and how much later each customer's food arrives than it would on a
// single trip (the co-op's delay limit). Orders are named by their short id, as everywhere on this page.
export function stackLines(reason: OfferReasonAdmin): string[] {
  if (reason.kind !== "STACK") return [];
  const v = reason.values;
  const lines: string[] = [];
  if (typeof v.partnerDeliveryId === "string") {
    lines.push(`Offered together with delivery ${shortId(v.partnerDeliveryId)}`);
  }
  return [...lines, ...stopAndWaitLines(v)];
}

// The order of the four stops and each customer's extra wait, which a stack's reason and an add on's reason
// (row 81) both record in the same shape. Review nit: shared here rather than dressing an add on up as a stack.
function stopAndWaitLines(v: OfferReasonAdmin["values"]): string[] {
  const lines: string[] = [];
  if (Array.isArray(v.sequence)) {
    const stops = v.sequence
      .map((item, index) => {
        const stop = item as { deliveryId?: unknown; stop?: unknown };
        if (typeof stop.deliveryId !== "string") return null;
        return `${index + 1} ${stop.stop === "PICKUP" ? "pick up" : "drop off"} ${shortId(stop.deliveryId)}`;
      })
      .filter((text): text is string => text !== null);
    if (stops.length > 0) lines.push(`Stops: ${stops.join(", ")}`);
  }
  if (v.delaySeconds && typeof v.delaySeconds === "object") {
    const delays = Object.entries(v.delaySeconds as Record<string, unknown>).map(
      ([deliveryId, seconds]) => `${shortId(deliveryId)} ${durationText(seconds)}`
    );
    if (delays.length > 0) lines.push(`Each customer's extra wait over a single trip: ${delays.join(", ")}`);
  }
  return lines;
}

// Spec 0048 (row 81, AC-12): why an add on went to its rider: the job it was added to, what it added, the
// order of the stops, each customer's extra wait, whether the rider carried food (then it was calm), how
// many riders on a job were compared (the fewest extra minutes won), and whether a free rider was passed over.
export function addOnLines(reason: OfferReasonAdmin): string[] {
  if (reason.kind !== "ADD_ON") return [];
  const v = reason.values;
  const lines: string[] = [];
  if (typeof v.currentDeliveryId === "string") {
    lines.push(`Added to the rider's job, delivery ${shortId(v.currentDeliveryId)}`);
  }
  if (typeof v.extraKm === "number" && typeof v.extraMinutes === "number") {
    lines.push(`Adds +${v.extraKm} km, +${v.extraMinutes} min to that job`);
  }
  lines.push(...stopAndWaitLines(v));
  if (v.carryingFood === true) {
    lines.push("The rider was carrying food: twice the time to answer, never an insistent ring");
  }
  if (typeof reason.candidateCount === "number") {
    lines.push(`Fewest extra minutes of ${reason.candidateCount} riders on a job compared`);
  }
  // Review fix (value 1): why a rider on a job got it rather than a free rider. Recorded from the row 81
  // review on; an older reason has neither value and gets no line.
  if (v.freeRiderFound === true) {
    lines.push(
      'A free rider was found, but the co-op\'s policy was "Whenever the two orders fit", so the add on went first'
    );
  } else if (v.freeRiderFound === false) {
    lines.push("No free rider was found for this order");
  }
  return lines;
}

// Spec 0049: the On a shift column shows only for offers made while Shifts was on.
function hasShiftColumn(reason: OfferReasonAdmin): boolean {
  return (reason.candidates ?? []).some((candidate) => typeof candidate.onShift === "boolean");
}

export function OfferReasonsCard({
  reasons,
  courierNameById,
}: {
  reasons: OfferReasonAdmin[] | undefined;
  courierNameById: Map<string, string>;
}) {
  const list = reasons ?? [];
  const name = (id: unknown) =>
    typeof id === "string"
      ? courierNameById.get(id) || `Courier ${id.slice(-6)}`
      : "—";
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Why each offer went to its rider
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {list.length === 0 ? (
          <p className="text-muted-foreground">
            No offer has a recorded reason yet.
          </p>
        ) : (
          list.map((reason) => (
            <section
              key={reason.id}
              aria-label={`Offer to ${name(reason.courierId)}, ${formatOptionalDate(reason.createdAt)}`}
              className="space-y-2"
            >
              <p className="font-medium">
                {formatOptionalDate(reason.createdAt)} ·{" "}
                {name(reason.courierId)} ·{" "}
                {STRATEGY_WORDS[reason.strategy] ?? reason.strategy}
                {/* Spec 0048: one of two orders offered together. */}
                {reason.kind === "STACK" ? " · Two orders together" : ""}
                {/* Row 81: one more order offered to a rider on a job. */}
                {reason.kind === "ADD_ON" ? " · One more order on the way" : ""}
              </p>
              {reason.weights ? (
                <p className="text-muted-foreground">
                  Weights: road time {reason.weights.roadTime ?? 0}, pay per
                  hour {reason.weights.earnings ?? 0}, waiting{" "}
                  {reason.weights.waiting ?? 0}
                  {/* Spec 0049: present only while Shifts was on. */}
                  {reason.weights.shift !== undefined
                    ? `, booked shift ${reason.weights.shift}`
                    : ""}
                </p>
              ) : null}
              <ul className="list-disc pl-5">
                {[...reasonLines(reason), ...stackLines(reason), ...addOnLines(reason)].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {reason.candidates && reason.candidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">
                      Riders compared for this offer, lowest score first
                    </caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="py-1 pr-3">
                          Rider
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          Road time
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          Pay per hour today
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          Waiting
                        </th>
                        {hasShiftColumn(reason) ? (
                          <th scope="col" className="py-1 pr-3">
                            On a shift
                          </th>
                        ) : null}
                        <th scope="col" className="py-1">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reason.candidates.map((candidate) => (
                        <tr
                          key={String(candidate.courierId)}
                          className="border-b border-border last:border-b-0"
                        >
                          <th scope="row" className="py-1 pr-3 font-normal">
                            {name(candidate.courierId)}
                            {candidate.courierId === reason.courierId
                              ? " (offered)"
                              : ""}
                          </th>
                          <td className="py-1 pr-3">
                            {durationText(candidate.roadSeconds)}
                            {candidate.roadEstimated ? " (estimated)" : ""}
                          </td>
                          <td className="py-1 pr-3">
                            {candidate.earningsEqual
                              ? "equal"
                              : perHourText(candidate.centsPerHour)}
                            {candidate.earningsAssumed &&
                            !candidate.earningsEqual
                              ? " (co-op average)"
                              : ""}
                          </td>
                          <td className="py-1 pr-3">
                            {durationText(candidate.waitingSeconds)}
                          </td>
                          {hasShiftColumn(reason) ? (
                            <td className="py-1 pr-3">
                              {candidate.onShift === true ? "Yes" : "No"}
                            </td>
                          ) : null}
                          <td className="py-1">{scoreText(candidate.score)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}
