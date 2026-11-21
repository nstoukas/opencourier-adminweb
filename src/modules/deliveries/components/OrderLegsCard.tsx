import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "../../../admin-web-components";
import type { OrderLegAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { shortId } from "@/utils/shortId";

type Props = {
  // The delivery this page shows.
  deliveryId: string;
  legCount: number;
  legs: OrderLegAdmin[];
  missingLegNumbers: number[];
};

// Spec 0046 (AC-6, cross check 5): the legs of the order this delivery belongs to (same restaurant and order
// reference), each with its status and rider, and the legs the restaurant never sent, so a lost leg is seen.
export function OrderLegsCard({ deliveryId, legCount, legs, missingLegNumbers }: Props) {
  return (
    <Card data-testid="order-legs">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Order in {legCount} legs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <ul className="space-y-2">
          {legs.map((leg) => (
            <li key={leg.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium">
                Leg {leg.legNumber} of {legCount}
              </span>
              <StatusBadge status={leg.status} />
              <span className="text-muted-foreground">{leg.courierName || "No rider yet"}</span>
              {leg.id === deliveryId ? (
                <span className="text-xs text-muted-foreground">This delivery</span>
              ) : (
                <Link href={`/deliveries/${leg.id}`} className="font-mono text-xs underline">
                  {shortId(leg.id)}
                </Link>
              )}
            </li>
          ))}
        </ul>
        {missingLegNumbers.length > 0 ? (
          <p className="text-destructive">
            {missingLegNumbers.map((number) => `Leg ${number} of ${legCount}`).join(", ")}{" "}
            {missingLegNumbers.length === 1 ? "was" : "were"} never created.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
