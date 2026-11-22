import React from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../admin-web-components";
import type { OfferReasonAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { useFormat, type Formats } from "@/i18n/useFormat";
import { shortId } from "@/utils/shortId";
import { optionalDateTime } from "../utils/optionalDate";

// Spec 0044 (AC-8): why each offer of this delivery went to its rider, as the backend recorded it at the
// offer (OfferReason). Read only. The candidates table shows other riders' figures, which is why it lives
// on this admin page only; riders see their own reasons in the app (spec 0045).
// The helpers below take `t` (i18next's lookup function) and `f` (useFormat()'s formats) so every line
// is in the reader's language (spec 0054).

// A strategy in words; one this copy does not know yet is shown as sent.
function strategyText(strategy: string, t: TFunction): string {
  // defaultValue is what i18next returns when the key does not exist.
  return t(`deliveries.offerReasons.strategy.${strategy}`, { defaultValue: strategy });
}

const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// "4 min 05 s", "26 h 28 min", or "—".
export function durationText(seconds: unknown, t: TFunction): string {
  const s = number(seconds)
  if (s === null) return '—'
  const whole = Math.round(s)
  // An hour or more reads in hours and minutes ("26 h 28 min"); seconds stop mattering then.
  if (whole >= 3600) {
    const hours = Math.floor(whole / 3600)
    return t('deliveries.offerReasons.duration.hoursMinutes', {
      hours,
      minutes: String(Math.floor((whole % 3600) / 60)).padStart(2, '0'),
    })
  }
  const minutes = Math.floor(whole / 60)
  return minutes > 0
    ? t('deliveries.offerReasons.duration.minutesSeconds', { minutes, seconds: String(whole % 60).padStart(2, '0') })
    : t('deliveries.offerReasons.duration.seconds', { seconds: whole })
}

// "€8.40 per hour" ("8,40 € την ώρα"), in euros, the currency the co-op uses everywhere on this page.
export function perHourText(cents: unknown, t: TFunction, f: Formats): string {
  const c = number(cents);
  return c === null ? "—" : t("deliveries.offerReasons.perHour", { amount: f.money(c, "EUR") });
}

// Three decimals, with the reader's decimal mark ("0.512", "0,512").
function scoreText(score: unknown, f: Formats): string {
  const s = number(score);
  if (s === null) return "—";
  const text = s.toFixed(3);
  return f.language === "el" ? text.replace(".", ",") : text;
}

// The chosen rider's figures in words, per strategy (spec 0044, cross check 10). An add on (row 81) was not
// chosen by the matcher's figures, so it has only its own lines (addOnLines); the strategy in its heading is
// the co-op's matcher setting at the time.
export function reasonLines(reason: OfferReasonAdmin, t: TFunction, f: Formats): string[] {
  const v = reason.values;
  if (reason.kind === "ADD_ON") return [];
  switch (reason.strategy) {
    case "FAIRNESS":
      return [
        t(v.roadEstimated ? "deliveries.offerReasons.roadTimeEstimated" : "deliveries.offerReasons.roadTime", {
          duration: durationText(v.roadSeconds, t),
        }),
        v.earningsEqual
          ? t("deliveries.offerReasons.earningsEqual")
          : t(v.earningsAssumed ? "deliveries.offerReasons.payPerHourAssumed" : "deliveries.offerReasons.payPerHour", {
              amount: perHourText(v.centsPerHour, t, f),
            }),
        t("deliveries.offerReasons.waitingSince", { duration: durationText(v.waitingSeconds, t) }),
        // Spec 0049 (AC-3): recorded only while Shifts was on.
        ...(typeof v.onShift === "boolean"
          ? [v.onShift ? t("deliveries.offerReasons.onShift") : t("deliveries.offerReasons.notOnShift")]
          : []),
        t("deliveries.offerReasons.score", {
          score: scoreText(reason.score, f),
          compared: reason.candidateCount,
          inRange: reason.ridersInRange,
        }),
      ];
    case "NEAREST_COURIER": {
      const metres = number(v.straightMetres);
      return [
        t("deliveries.offerReasons.straightLine", { metres: metres === null ? "—" : f.number(metres, 0) }),
        // Review fix: null means the router did not answer for this rider; say so rather than a dash.
        ...(v.roadSeconds === undefined
          ? []
          : v.roadSeconds === null
            ? [t("deliveries.offerReasons.noRoadTime")]
            : [t("deliveries.offerReasons.roadTime", { duration: durationText(v.roadSeconds, t) })]),
      ];
    }
    case "COURIER_SENIORITY":
      return [
        t("deliveries.offerReasons.memberSince", {
          date: optionalDateTime(f, typeof v.memberSince === "string" ? v.memberSince : null),
        }),
      ];
    case "ADMIN":
      // Review fix: the admin's user id, the one thing this reason records beyond the heading.
      return [
        typeof v.adminUserId === "string"
          ? t("deliveries.offerReasons.adminUser", { id: v.adminUserId.slice(-6) })
          : t("deliveries.offerReasons.noAdmin"),
      ];
    case "STATIC":
      return [t("deliveries.offerReasons.staticCourier")];
    default:
      return [];
  }
}

// Spec 0048 (AC-12): what a stack's reason adds to the rider's own figures: the other order offered with
// this one, the order of the four stops, and how much later each customer's food arrives than it would on a
// single trip (the co-op's delay limit). Orders are named by their short id, as everywhere on this page.
export function stackLines(reason: OfferReasonAdmin, t: TFunction): string[] {
  if (reason.kind !== "STACK") return [];
  const v = reason.values;
  const lines: string[] = [];
  if (typeof v.partnerDeliveryId === "string") {
    lines.push(t("deliveries.offerReasons.offeredTogether", { id: shortId(v.partnerDeliveryId) }));
  }
  return [...lines, ...stopAndWaitLines(v, t)];
}

// The order of the four stops and each customer's extra wait, which a stack's reason and an add on's reason
// (row 81) both record in the same shape. Review nit: shared here rather than dressing an add on up as a stack.
function stopAndWaitLines(v: OfferReasonAdmin["values"], t: TFunction): string[] {
  const lines: string[] = [];
  if (Array.isArray(v.sequence)) {
    const stops = v.sequence
      .map((item, index) => {
        const stop = item as { deliveryId?: unknown; stop?: unknown };
        if (typeof stop.deliveryId !== "string") return null;
        return t(stop.stop === "PICKUP" ? "deliveries.offerReasons.stopPickUp" : "deliveries.offerReasons.stopDropOff", {
          number: index + 1,
          id: shortId(stop.deliveryId),
        });
      })
      .filter((text): text is string => text !== null);
    if (stops.length > 0) lines.push(t("deliveries.offerReasons.stops", { stops: stops.join(", ") }));
  }
  if (v.delaySeconds && typeof v.delaySeconds === "object") {
    const delays = Object.entries(v.delaySeconds as Record<string, unknown>).map(
      ([deliveryId, seconds]) => `${shortId(deliveryId)} ${durationText(seconds, t)}`
    );
    if (delays.length > 0) lines.push(t("deliveries.offerReasons.extraWait", { delays: delays.join(", ") }));
  }
  return lines;
}

// Spec 0048 (row 81, AC-12): why an add on went to its rider: the job it was added to, what it added, the
// order of the stops, each customer's extra wait, whether the rider carried food (then it was calm), how
// many riders on a job were compared (the fewest extra minutes won), and whether a free rider was passed over.
export function addOnLines(reason: OfferReasonAdmin, t: TFunction, f: Formats): string[] {
  if (reason.kind !== "ADD_ON") return [];
  const v = reason.values;
  const lines: string[] = [];
  if (typeof v.currentDeliveryId === "string") {
    lines.push(t("deliveries.offerReasons.addedTo", { id: shortId(v.currentDeliveryId) }));
  }
  if (typeof v.extraKm === "number" && typeof v.extraMinutes === "number") {
    lines.push(t("deliveries.offerReasons.adds", { km: f.number(v.extraKm), minutes: f.number(v.extraMinutes) }));
  }
  lines.push(...stopAndWaitLines(v, t));
  if (v.carryingFood === true) {
    lines.push(t("deliveries.offerReasons.carryingFood"));
  }
  if (typeof reason.candidateCount === "number") {
    lines.push(t("deliveries.offerReasons.fewestMinutes", { riders: reason.candidateCount }));
  }
  // Review fix (value 1): why a rider on a job got it rather than a free rider. Recorded from the row 81
  // review on; an older reason has neither value and gets no line.
  if (v.freeRiderFound === true) {
    lines.push(t("deliveries.offerReasons.freeRiderFound"));
  } else if (v.freeRiderFound === false) {
    lines.push(t("deliveries.offerReasons.noFreeRider"));
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
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation();
  // Dates, money and numbers in the reader's language (spec 0054, AC-3).
  const f = useFormat();
  const list = reasons ?? [];
  const name = (id: unknown) =>
    typeof id === "string"
      ? courierNameById.get(id) || t("deliveries.offerReasons.courierFallback", { id: id.slice(-6) })
      : "—";
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {t("deliveries.offerReasons.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {list.length === 0 ? (
          <p className="text-muted-foreground">
            {t("deliveries.offerReasons.empty")}
          </p>
        ) : (
          list.map((reason) => (
            <section
              key={reason.id}
              aria-label={t("deliveries.offerReasons.sectionLabel", {
                name: name(reason.courierId),
                date: optionalDateTime(f, reason.createdAt),
              })}
              className="space-y-2"
            >
              <p className="font-medium">
                {`${optionalDateTime(f, reason.createdAt)} · ${name(reason.courierId)} · ${strategyText(reason.strategy, t)}`}
                {/* Spec 0048: one of two orders offered together. */}
                {reason.kind === "STACK" ? ` · ${t("deliveries.offerReasons.twoTogether")}` : ""}
                {/* Row 81: one more order offered to a rider on a job. */}
                {reason.kind === "ADD_ON" ? ` · ${t("deliveries.offerReasons.oneMore")}` : ""}
              </p>
              {reason.weights ? (
                <p className="text-muted-foreground">
                  {t("deliveries.offerReasons.weights", {
                    road: f.number(reason.weights.roadTime ?? 0, 6),
                    earnings: f.number(reason.weights.earnings ?? 0, 6),
                    waiting: f.number(reason.weights.waiting ?? 0, 6),
                  })}
                  {/* Spec 0049: present only while Shifts was on. */}
                  {reason.weights.shift !== undefined
                    ? t("deliveries.offerReasons.weightShift", { shift: f.number(reason.weights.shift, 6) })
                    : ""}
                </p>
              ) : null}
              <ul className="list-disc pl-5">
                {[...reasonLines(reason, t, f), ...stackLines(reason, t), ...addOnLines(reason, t, f)].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {reason.candidates && reason.candidates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <caption className="sr-only">
                      {t("deliveries.offerReasons.table.caption")}
                    </caption>
                    <thead>
                      <tr className="border-b border-border">
                        <th scope="col" className="py-1 pr-3">
                          {t("deliveries.offerReasons.table.rider")}
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          {t("deliveries.offerReasons.table.roadTime")}
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          {t("deliveries.offerReasons.table.payPerHour")}
                        </th>
                        <th scope="col" className="py-1 pr-3">
                          {t("deliveries.offerReasons.table.waiting")}
                        </th>
                        {hasShiftColumn(reason) ? (
                          <th scope="col" className="py-1 pr-3">
                            {t("deliveries.offerReasons.table.onShift")}
                          </th>
                        ) : null}
                        <th scope="col" className="py-1">
                          {t("deliveries.offerReasons.table.score")}
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
                              ? ` ${t("deliveries.offerReasons.table.offered")}`
                              : ""}
                          </th>
                          <td className="py-1 pr-3">
                            {durationText(candidate.roadSeconds, t)}
                            {candidate.roadEstimated ? ` ${t("deliveries.offerReasons.table.estimated")}` : ""}
                          </td>
                          <td className="py-1 pr-3">
                            {candidate.earningsEqual
                              ? t("deliveries.offerReasons.table.equal")
                              : perHourText(candidate.centsPerHour, t, f)}
                            {candidate.earningsAssumed &&
                            !candidate.earningsEqual
                              ? ` ${t("deliveries.offerReasons.table.coopAverage")}`
                              : ""}
                          </td>
                          <td className="py-1 pr-3">
                            {durationText(candidate.waitingSeconds, t)}
                          </td>
                          {hasShiftColumn(reason) ? (
                            <td className="py-1 pr-3">
                              {candidate.onShift === true ? t("common.yes") : t("common.no")}
                            </td>
                          ) : null}
                          <td className="py-1">{scoreText(candidate.score, f)}</td>
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
