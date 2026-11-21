import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../admin-web-components";
import type { OfferReasonAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { formatOptionalDate } from "../../../ui-shared-utils";

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

// The chosen rider's figures in words, per strategy (spec 0044, cross check 10).
export function reasonLines(reason: OfferReasonAdmin): string[] {
  const v = reason.values;
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
              </p>
              {reason.weights ? (
                <p className="text-muted-foreground">
                  Weights: road time {reason.weights.roadTime ?? 0}, pay per
                  hour {reason.weights.earnings ?? 0}, waiting{" "}
                  {reason.weights.waiting ?? 0}
                </p>
              ) : null}
              <ul className="list-disc pl-5">
                {reasonLines(reason).map((line) => (
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
