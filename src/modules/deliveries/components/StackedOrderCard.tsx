import React from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../admin-web-components";
import type {
  OfferReasonAdmin,
  StackStopAdmin,
} from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { shortId } from "@/utils/shortId";
import { useFormat } from "@/i18n/useFormat";
import { NODE_MARK, withNode } from "../utils/withNode";

type Props = {
  // The delivery this page shows.
  deliveryId: string;
  // The stack's stops while the pair is with one rider; null once it is not.
  stackStops: StackStopAdmin[] | null | undefined;
  // The offer reasons, for the other order once the stop list is gone (the reason keeps it).
  offerReasons: OfferReasonAdmin[] | undefined;
  // Row 81: what this delivery was offered as adding to a rider's job, when it was an add on.
  addOnExtraKm?: number | null;
  addOnExtraMinutes?: number | null;
};

// The newest reason that paired this delivery with another: a stack's or an add on's (row 81).
function newestPairingReason(offerReasons: OfferReasonAdmin[] | undefined): OfferReasonAdmin | undefined {
  const reasons = (offerReasons ?? []).filter((reason) => reason.kind === "STACK" || reason.kind === "ADD_ON");
  return reasons[reasons.length - 1];
}

// The other delivery a pairing reason names: a stack's partner, or the job an add on was added to.
function partnerOfReason(reason: OfferReasonAdmin | undefined): string | null {
  const partner = reason?.kind === "ADD_ON" ? reason.values.currentDeliveryId : reason?.values.partnerDeliveryId;
  return typeof partner === "string" ? partner : null;
}

// The other delivery in the stop list, while the two are with one rider.
function partnerFromStops({ deliveryId, stackStops }: Props): string | null {
  return stackStops?.find((stop) => stop.deliveryId !== deliveryId)?.deliveryId ?? null;
}

// Review fix (row 81): the reason that explains the pair shown now. The newest pairing reason, but only when
// it names the same other delivery as the stop list: a delivery once offered as an add on and declined, then
// joined later by another rider's add on, would otherwise show its own old offer's title and figures.
function currentPairingReason(props: Props): OfferReasonAdmin | undefined {
  const newest = newestPairingReason(props.offerReasons);
  const fromStops = partnerFromStops(props);
  if (newest && fromStops && partnerOfReason(newest) !== fromStops) return undefined;
  return newest;
}

// The other delivery of the stack: from the stop list, else from the newest STACK reason (or, for an add on,
// the job it was added to).
export function stackPartnerId(props: Props): string | null {
  return partnerFromStops(props) ?? partnerOfReason(newestPairingReason(props.offerReasons));
}

// Spec 0048 (AC-12): a delivery offered together with another one (a stack). Names the other delivery, and
// while the two are still with one rider, the order of their four stops. The reason for the pairing is on
// the offer reasons card below. Row 81: or a delivery offered as an add on, or (review fix) the job an add
// on was added to, which has a pair but no pairing reason of its own: it was offered alone.
export function StackedOrderCard(props: Props) {
  const { deliveryId, stackStops, addOnExtraKm, addOnExtraMinutes } = props;
  // useTranslation gives t, which looks a key up in the reader's language.
  const { t } = useTranslation();
  // Numbers in the reader's language (spec 0054, AC-3).
  const f = useFormat();
  const reason = currentPairingReason(props);
  // Row 81: this delivery came as one more order to a rider already on a job.
  const addOn = reason?.kind === "ADD_ON";
  // Review fix: this delivery was the job; another order was added to it later.
  const joined = reason === undefined;
  const partnerId = joined ? partnerFromStops(props) : stackPartnerId(props);
  const link = (id: string) =>
    id === deliveryId ? (
      <span className="text-xs text-muted-foreground">{t("deliveries.stacked.thisDelivery")}</span>
    ) : (
      <Link href={`/deliveries/${id}`} className="font-mono text-xs underline" title={id}>
        {shortId(id)}
      </Link>
    );
  return (
    <Card data-testid="stacked-order">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          {addOn
            ? t("deliveries.offerReasons.oneMore")
            : joined
              ? t("deliveries.stacked.oneMoreAdded")
              : t("deliveries.offerReasons.twoTogether")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {joined ? (
          <p>
            {withNode(
              t("deliveries.stacked.joined", { partner: NODE_MARK }),
              partnerId ? link(partnerId) : <span className="text-muted-foreground">{t("deliveries.stacked.anotherDelivery")}</span>
            )}
          </p>
        ) : addOn ? (
          <p>
            {withNode(
              t("deliveries.stacked.addOn", {
                partner: NODE_MARK,
                extra:
                  typeof addOnExtraKm === "number" && typeof addOnExtraMinutes === "number"
                    ? t("deliveries.stacked.adding", { km: f.number(addOnExtraKm), minutes: f.number(addOnExtraMinutes) })
                    : "",
              }),
              partnerId ? link(partnerId) : <span className="text-muted-foreground">{t("deliveries.stacked.theirJob")}</span>
            )}
          </p>
        ) : (
          <p>
            {withNode(
              t("deliveries.stacked.together", { partner: NODE_MARK }),
              partnerId ? link(partnerId) : <span className="text-muted-foreground">{t("deliveries.stacked.anotherDelivery")}</span>
            )}
          </p>
        )}
        {stackStops && stackStops.length > 0 ? (
          <ol className="list-decimal space-y-1 pl-5">
            {stackStops.map((stop) => (
              <li key={`${stop.deliveryId}-${stop.stop}`}>
                {stop.stop === "PICKUP" ? t("deliveries.stacked.pickUp") : t("deliveries.stacked.dropOff")} {link(stop.deliveryId)}
              </li>
            ))}
          </ol>
        ) : (
          // agy review of row 80: the stop order is cleared once the two are not both open with one rider,
          // which includes a pair delivered together, so this says only what is known.
          <p className="text-muted-foreground">{t("deliveries.stacked.noStopOrder")}</p>
        )}
      </CardContent>
    </Card>
  );
}
