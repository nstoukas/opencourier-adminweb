import React from "react";
import Link from "next/link";
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

// The other delivery of the stack: from the stop list, else from the newest STACK reason (or, for an add on,
// the job it was added to).
export function stackPartnerId({ deliveryId, stackStops, offerReasons }: Props): string | null {
  const fromStops = stackStops?.find((stop) => stop.deliveryId !== deliveryId)?.deliveryId;
  if (fromStops) return fromStops;
  const newest = newestPairingReason(offerReasons);
  const partner = newest?.kind === "ADD_ON" ? newest.values.currentDeliveryId : newest?.values.partnerDeliveryId;
  return typeof partner === "string" ? partner : null;
}

// Spec 0048 (AC-12): a delivery offered together with another one (a stack). Names the other delivery, and
// while the two are still with one rider, the order of their four stops. The reason for the pairing is on
// the offer reasons card below.
export function StackedOrderCard(props: Props) {
  const { deliveryId, stackStops, addOnExtraKm, addOnExtraMinutes } = props;
  const partnerId = stackPartnerId(props);
  // Row 81: this delivery came as one more order to a rider already on a job.
  const addOn = newestPairingReason(props.offerReasons)?.kind === "ADD_ON";
  const link = (id: string) =>
    id === deliveryId ? (
      <span className="text-xs text-muted-foreground">this delivery</span>
    ) : (
      <Link href={`/deliveries/${id}`} className="font-mono text-xs underline" title={id}>
        {shortId(id)}
      </Link>
    );
  return (
    <Card data-testid="stacked-order">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{addOn ? "One more order on the way" : "Two orders together"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {addOn ? (
          <p>
            Offered to a rider on a job, added to{" "}
            {partnerId ? link(partnerId) : <span className="text-muted-foreground">their job</span>}
            {typeof addOnExtraKm === "number" && typeof addOnExtraMinutes === "number"
              ? `, adding +${addOnExtraKm} km, +${addOnExtraMinutes} min`
              : ""}
            . Each is paid in full from its own quote.
          </p>
        ) : (
          <p>
            Offered together with{" "}
            {partnerId ? link(partnerId) : <span className="text-muted-foreground">another delivery</span>}
            . Each is paid in full from its own quote.
          </p>
        )}
        {stackStops && stackStops.length > 0 ? (
          <ol className="list-decimal space-y-1 pl-5">
            {stackStops.map((stop) => (
              <li key={`${stop.deliveryId}-${stop.stop}`}>
                {stop.stop === "PICKUP" ? "Pick up" : "Drop off"} {link(stop.deliveryId)}
              </li>
            ))}
          </ol>
        ) : (
          // agy review of row 80: the stop order is cleared once the two are not both open with one rider,
          // which includes a pair delivered together, so this says only what is known.
          <p className="text-muted-foreground">
            No stop order now: it is kept only while both orders are open with one rider.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
