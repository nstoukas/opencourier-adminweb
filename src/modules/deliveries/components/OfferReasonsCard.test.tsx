import React from "react";
import { render, screen } from "@testing-library/react";
import {
  OfferReasonsCard,
  durationText,
  perHourText,
  reasonLines,
  stackLines,
  addOnLines,
} from "./OfferReasonsCard";
import type { OfferReasonAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { formatOptionalDate } from "../../../ui-shared-utils";

describe("OfferReasonsCard and formatting helpers (spec 0044, AC-6, AC-8)", () => {
  describe("durationText", () => {
    it("formats seconds under one minute as seconds only", () => {
      expect(durationText(0)).toBe("0 s");
      expect(durationText(45)).toBe("45 s");
      expect(durationText(59)).toBe("59 s");
    });

    it("formats times between 1 minute and 59 minutes as minutes and seconds with padding", () => {
      expect(durationText(60)).toBe("1 min 00 s");
      expect(durationText(245)).toBe("4 min 05 s");
      expect(durationText(3599)).toBe("59 min 59 s");
    });

    it("formats times of one hour or more in hours and minutes", () => {
      expect(durationText(3600)).toBe("1 h 00 min");
      // 26 hours, 28 minutes = 26 * 3600 + 28 * 60 = 93600 + 1680 = 95280 seconds
      expect(durationText(95280)).toBe("26 h 28 min");
      expect(durationText(7260)).toBe("2 h 01 min");
    });

    it("returns an em-dash for null, undefined, or non-finite numbers", () => {
      expect(durationText(null)).toBe("—");
      expect(durationText(undefined)).toBe("—");
      expect(durationText(NaN)).toBe("—");
      expect(durationText(Infinity)).toBe("—");
      expect(durationText("not a number")).toBe("—");
    });
  });

  describe("perHourText", () => {
    it("formats cents into euros per hour with two decimal places", () => {
      expect(perHourText(840)).toBe("€8.40 per hour");
      expect(perHourText(0)).toBe("€0.00 per hour");
      expect(perHourText(1250)).toBe("€12.50 per hour");
    });

    it("returns an em-dash for null, undefined, or non-finite numbers", () => {
      expect(perHourText(null)).toBe("—");
      expect(perHourText(undefined)).toBe("—");
      expect(perHourText(NaN)).toBe("—");
      expect(perHourText("abc")).toBe("—");
    });
  });

  describe("reasonLines", () => {
    const baseFairnessReason: OfferReasonAdmin = {
      id: "reason-1",
      deliveryEventId: "evt-1",
      courierId: "c-1",
      strategy: "FAIRNESS",
      weights: { roadTime: 50, earnings: 30, waiting: 20 },
      values: {
        roadSeconds: 245,
        roadEstimated: false,
        centsPerHour: 840,
        earningsAssumed: false,
        earningsEqual: false,
        waitingSeconds: 900,
      },
      score: 0.123,
      candidateCount: 5,
      ridersInRange: 8,
      candidates: [],
      kind: "SINGLE",
      createdAt: "2026-11-20T10:00:00.000Z",
    };

    it("produces standard 4 lines for a FAIRNESS reason", () => {
      const lines = reasonLines(baseFairnessReason);
      expect(lines).toHaveLength(4);
      expect(lines[0]).toBe("Road time 4 min 05 s");
      expect(lines[1]).toBe("Pay per hour today €8.40 per hour");
      expect(lines[2]).toBe("Waiting since the last job, or since going Online 15 min 00 s");
      expect(lines[3]).toBe("Score 0.123, lowest of 5 compared (8 in range)");
    });

    it("notes estimated road time when roadEstimated is true", () => {
      const reason: OfferReasonAdmin = {
        ...baseFairnessReason,
        values: {
          ...baseFairnessReason.values,
          roadEstimated: true,
        },
      };
      const lines = reasonLines(reason);
      expect(lines[0]).toBe(
        "Road time 4 min 05 s (estimated, the router did not answer)"
      );
    });

    it("notes assumed earnings (co-op average) when earningsAssumed is true", () => {
      const reason: OfferReasonAdmin = {
        ...baseFairnessReason,
        values: {
          ...baseFairnessReason.values,
          earningsAssumed: true,
        },
      };
      const lines = reasonLines(reason);
      expect(lines[1]).toBe(
        "Pay per hour today €8.40 per hour (the co-op average, under the minimum time online)"
      );
    });

    it("notes counted equal when earningsEqual is true", () => {
      const reason: OfferReasonAdmin = {
        ...baseFairnessReason,
        values: {
          ...baseFairnessReason.values,
          earningsEqual: true,
        },
      };
      const lines = reasonLines(reason);
      expect(lines[1]).toBe(
        "Pay per hour today: counted equal for everyone (nobody had the minimum time online)"
      );
    });

    it("produces straight line and road time for NEAREST_COURIER", () => {
      const nearestReason: OfferReasonAdmin = {
        id: "reason-2",
        deliveryEventId: "evt-2",
        courierId: "c-1",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 450,
          roadSeconds: 150,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(nearestReason);
      expect(lines).toEqual([
        "450 m in a straight line",
        "Road time 2 min 30 s",
      ]);
    });

    it("produces straight line only for NEAREST_COURIER when roadSeconds is omitted", () => {
      const nearestWithoutRoad: OfferReasonAdmin = {
        id: "reason-2b",
        deliveryEventId: "evt-2b",
        courierId: "c-1",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 600,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(nearestWithoutRoad);
      expect(lines).toEqual(["600 m in a straight line"]);
    });

    it('produces "No road time (the router did not answer)" for NEAREST_COURIER when roadSeconds is null', () => {
      const nearestNullRoad: OfferReasonAdmin = {
        id: "reason-2-null",
        deliveryEventId: "evt-2-null",
        courierId: "c-1",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 450,
          roadSeconds: null,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(nearestNullRoad);
      expect(lines).toEqual([
        "450 m in a straight line",
        "No road time (the router did not answer)",
      ]);
    });

    it("produces member since date for COURIER_SENIORITY", () => {
      const seniorityReason: OfferReasonAdmin = {
        id: "reason-3",
        deliveryEventId: "evt-3",
        courierId: "c-1",
        strategy: "COURIER_SENIORITY",
        weights: null,
        values: {
          memberSince: "2025-06-15T00:00:00.000Z",
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(seniorityReason);
      expect(lines[0]).toMatch(/Member since /);
    });

    it('produces "Admin user" with the last six characters of adminUserId for ADMIN', () => {
      const adminReason: OfferReasonAdmin = {
        id: "reason-4",
        deliveryEventId: "evt-4",
        courierId: "c-1",
        strategy: "ADMIN",
        weights: null,
        values: {
          adminUserId: "usr-admin-1",
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(adminReason);
      expect(lines).toEqual(["Admin user dmin-1"]);
    });

    it('produces "No admin recorded" for ADMIN when there is none', () => {
      const adminReasonNoUser: OfferReasonAdmin = {
        id: "reason-4-no-admin",
        deliveryEventId: "evt-4b",
        courierId: "c-1",
        strategy: "ADMIN",
        weights: null,
        values: {},
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      const lines = reasonLines(adminReasonNoUser);
      expect(lines).toEqual(["No admin recorded"]);
    });

    it('produces "The fixed courier set for testing" for STATIC', () => {
      const staticReason: OfferReasonAdmin = {
        id: "reason-static",
        deliveryEventId: "evt-static",
        courierId: "c-1",
        strategy: "STATIC",
        weights: null,
        values: {},
        score: null,
        candidateCount: 0,
        ridersInRange: 0,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(reasonLines(staticReason)).toEqual([
        "The fixed courier set for testing",
      ]);
    });

    it("produces empty array for an unknown strategy", () => {
      const unknownReason: OfferReasonAdmin = {
        id: "reason-unknown",
        deliveryEventId: "evt-u",
        courierId: "c-1",
        strategy: "SOMETHING_ELSE",
        weights: null,
        values: {},
        score: null,
        candidateCount: 0,
        ridersInRange: 0,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(reasonLines(unknownReason)).toEqual([]);
    });
  });

  describe("OfferReasonsCard component rendering", () => {
    const courierNames = new Map<string, string>([
      ["c-101", "Dimitris V."],
      ["c-102", "Eleni K."],
    ]);

    it("renders empty sentence when reasons is undefined or empty", () => {
      const { rerender } = render(
        <OfferReasonsCard reasons={undefined} courierNameById={courierNames} />
      );
      expect(
        screen.getByText("Why each offer went to its rider")
      ).toBeInTheDocument();
      expect(
        screen.getByText("No offer has a recorded reason yet.")
      ).toBeInTheDocument();

      rerender(
        <OfferReasonsCard reasons={[]} courierNameById={courierNames} />
      );
      expect(
        screen.getByText("No offer has a recorded reason yet.")
      ).toBeInTheDocument();
    });

    it("renders FAIRNESS offer reason with matcher words, weights, values, and candidate table with offered rider marked", () => {
      const fairnessReason: OfferReasonAdmin = {
        id: "reason-f1",
        deliveryEventId: "evt-f1",
        courierId: "c-101",
        strategy: "FAIRNESS",
        weights: { roadTime: 50, earnings: 30, waiting: 20 },
        values: {
          roadSeconds: 245,
          roadEstimated: true,
          centsPerHour: 840,
          earningsAssumed: true,
          earningsEqual: false,
          waitingSeconds: 900,
        },
        score: 0.123,
        candidateCount: 2,
        ridersInRange: 3,
        candidates: [
          {
            courierId: "c-101",
            roadSeconds: 245,
            roadEstimated: true,
            centsPerHour: 840,
            earningsAssumed: true,
            earningsEqual: false,
            waitingSeconds: 900,
            score: 0.123,
          },
          {
            courierId: "c-102",
            roadSeconds: 300,
            roadEstimated: false,
            centsPerHour: 1100,
            earningsAssumed: false,
            earningsEqual: false,
            waitingSeconds: 600,
            score: 0.245,
          },
        ],
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[fairnessReason]}
          courierNameById={courierNames}
        />
      );

      // Strategy words and courier name in header
      expect(
        screen.getByText(/Dimitris V\. · Fairness \(co-op weights\)/)
      ).toBeInTheDocument();

      // Weights line
      expect(
        screen.getByText("Weights: road time 50, pay per hour 30, waiting 20")
      ).toBeInTheDocument();

      // Values in list items
      expect(
        screen.getByText(
          "Road time 4 min 05 s (estimated, the router did not answer)"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Pay per hour today €8.40 per hour (the co-op average, under the minimum time online)"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Waiting since the last job, or since going Online 15 min 00 s"
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Score 0.123, lowest of 2 compared (3 in range)")
      ).toBeInTheDocument();

      // Candidates table
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
      expect(
        screen.getByText("Riders compared for this offer, lowest score first")
      ).toBeInTheDocument();

      // Offered candidate marked and rider cells are row headers (th scope="row")
      const offeredHeader = screen.getByRole("rowheader", {
        name: /Dimitris V\. \(offered\)/,
      });
      expect(offeredHeader).toBeInTheDocument();
      expect(offeredHeader.tagName.toLowerCase()).toBe("th");
      expect(offeredHeader).toHaveAttribute("scope", "row");

      const otherHeader = screen.getByRole("rowheader", {
        name: "Eleni K.",
      });
      expect(otherHeader).toBeInTheDocument();
      expect(otherHeader.tagName.toLowerCase()).toBe("th");
      expect(otherHeader).toHaveAttribute("scope", "row");

      // Spelled out flags on candidate table, not (est.) or (avg.)
      expect(screen.getByText("4 min 05 s (estimated)")).toBeInTheDocument();
      expect(screen.getByText("€8.40 per hour (co-op average)")).toBeInTheDocument();
      expect(screen.getByText("€11.00 per hour")).toBeInTheDocument();
      expect(screen.queryByText(/4 min 05 s \(est\.\)/)).toBeNull();
      expect(screen.queryByText(/€8\.40 per hour \(avg\.\)/)).toBeNull();
    });

    it('renders candidate table with "equal" when candidate earningsEqual is true', () => {
      const equalReason: OfferReasonAdmin = {
        id: "reason-eq",
        deliveryEventId: "evt-eq",
        courierId: "c-101",
        strategy: "FAIRNESS",
        weights: { roadTime: 50, earnings: 30, waiting: 20 },
        values: {
          roadSeconds: 120,
          roadEstimated: false,
          centsPerHour: 0,
          earningsAssumed: false,
          earningsEqual: true,
          waitingSeconds: 300,
        },
        score: 0.1,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: [
          {
            courierId: "c-101",
            roadSeconds: 120,
            roadEstimated: false,
            centsPerHour: 0,
            earningsAssumed: false,
            earningsEqual: true,
            waitingSeconds: 300,
            score: 0.1,
          },
        ],
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[equalReason]}
          courierNameById={courierNames}
        />
      );
      expect(screen.getByText("equal")).toBeInTheDocument();
    });

    it('renders ADMIN reason with "Chosen by an admin" showing admin user id', () => {
      const adminReason: OfferReasonAdmin = {
        id: "reason-adm",
        deliveryEventId: "evt-adm",
        courierId: "c-101",
        strategy: "ADMIN",
        weights: null,
        values: { adminUserId: "usr-admin-1" },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T11:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[adminReason]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Chosen by an admin/)).toBeInTheDocument();
      expect(screen.getByText("Admin user dmin-1")).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it('renders ADMIN reason showing "No admin recorded" when adminUserId is absent', () => {
      const adminReasonNoUser: OfferReasonAdmin = {
        id: "reason-adm-nouser",
        deliveryEventId: "evt-adm-nouser",
        courierId: "c-101",
        strategy: "ADMIN",
        weights: null,
        values: {},
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T11:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[adminReasonNoUser]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Chosen by an admin/)).toBeInTheDocument();
      expect(screen.getByText("No admin recorded")).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it('renders STATIC reason showing "The fixed courier set for testing"', () => {
      const staticReason: OfferReasonAdmin = {
        id: "reason-static-render",
        deliveryEventId: "evt-static-render",
        courierId: "c-101",
        strategy: "STATIC",
        weights: null,
        values: {},
        score: null,
        candidateCount: 0,
        ridersInRange: 0,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[staticReason]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Fixed courier \(testing\)/)).toBeInTheDocument();
      expect(
        screen.getByText("The fixed courier set for testing")
      ).toBeInTheDocument();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("renders NEAREST reason with metres and road time", () => {
      const nearestReason: OfferReasonAdmin = {
        id: "reason-nr",
        deliveryEventId: "evt-nr",
        courierId: "c-102",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 350,
          roadSeconds: 180,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T11:30:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[nearestReason]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Nearest free courier/)).toBeInTheDocument();
      expect(screen.getByText("350 m in a straight line")).toBeInTheDocument();
      expect(screen.getByText("Road time 3 min 00 s")).toBeInTheDocument();
    });

    it('renders NEAREST reason with roadSeconds null showing router did not answer', () => {
      const nearestNullRoad: OfferReasonAdmin = {
        id: "reason-nr-null-render",
        deliveryEventId: "evt-nr-null-render",
        courierId: "c-102",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 350,
          roadSeconds: null,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T11:30:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[nearestNullRoad]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Nearest free courier/)).toBeInTheDocument();
      expect(screen.getByText("350 m in a straight line")).toBeInTheDocument();
      expect(
        screen.getByText("No road time (the router did not answer)")
      ).toBeInTheDocument();
    });

    it("renders NEAREST reason with no roadSeconds key showing no road line", () => {
      const nearestNoRoadKey: OfferReasonAdmin = {
        id: "reason-nr-nokey-render",
        deliveryEventId: "evt-nr-nokey-render",
        courierId: "c-102",
        strategy: "NEAREST_COURIER",
        weights: null,
        values: {
          straightMetres: 500,
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T11:30:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[nearestNoRoadKey]}
          courierNameById={courierNames}
        />
      );

      expect(screen.getByText(/Nearest free courier/)).toBeInTheDocument();
      expect(screen.getByText("500 m in a straight line")).toBeInTheDocument();
      expect(screen.queryByText(/road time/i)).toBeNull();
      expect(screen.queryByText(/No road time/i)).toBeNull();
    });

    it("gives two sections with different accessible names when two offers go to the same rider (the time is in the name)", () => {
      const firstOffer: OfferReasonAdmin = {
        id: "reason-offer-1",
        deliveryEventId: "evt-offer-1",
        courierId: "c-101",
        strategy: "FAIRNESS",
        weights: { roadTime: 50, earnings: 30, waiting: 20 },
        values: {
          roadSeconds: 120,
          centsPerHour: 800,
          waitingSeconds: 300,
        },
        score: 0.1,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      const secondOffer: OfferReasonAdmin = {
        id: "reason-offer-2",
        deliveryEventId: "evt-offer-2",
        courierId: "c-101",
        strategy: "FAIRNESS",
        weights: { roadTime: 50, earnings: 30, waiting: 20 },
        values: {
          roadSeconds: 140,
          centsPerHour: 800,
          waitingSeconds: 600,
        },
        score: 0.15,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:15:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[firstOffer, secondOffer]}
          courierNameById={courierNames}
        />
      );

      const firstTime = formatOptionalDate(firstOffer.createdAt);
      const secondTime = formatOptionalDate(secondOffer.createdAt);
      expect(firstTime).not.toBe(secondTime);

      const firstSection = screen.getByRole("region", {
        name: `Offer to Dimitris V., ${firstTime}`,
      });
      const secondSection = screen.getByRole("region", {
        name: `Offer to Dimitris V., ${secondTime}`,
      });

      expect(firstSection).toBeInTheDocument();
      expect(secondSection).toBeInTheDocument();
      expect(firstSection).not.toBe(secondSection);
    });
  });

  describe("stackLines helper (spec 0048, AC-12)", () => {
    it("returns empty array when reason.kind is not STACK", () => {
      const singleReason: OfferReasonAdmin = {
        id: "reason-single",
        deliveryEventId: "evt-single",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: { partnerDeliveryId: "del-partner-99" },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "SINGLE",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(stackLines(singleReason)).toEqual([]);
    });

    it("extracts partnerDeliveryId, sequence stops, and delaySeconds when kind is STACK", () => {
      const stackReason: OfferReasonAdmin = {
        id: "reason-stack",
        deliveryEventId: "evt-stack",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {
          partnerDeliveryId: "delivery-partner-222222",
          sequence: [
            { deliveryId: "delivery-this-111111", stop: "PICKUP" },
            { deliveryId: "delivery-partner-222222", stop: "PICKUP" },
            { deliveryId: "delivery-this-111111", stop: "DROPOFF" },
            { deliveryId: "delivery-partner-222222", stop: "DROPOFF" },
          ],
          delaySeconds: {
            "delivery-this-111111": 64,
            "delivery-partner-222222": 130,
          },
        },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "STACK",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      const lines = stackLines(stackReason);
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe("Offered together with delivery 222222");
      expect(lines[1]).toBe(
        "Stops: 1 pick up 111111, 2 pick up 222222, 3 drop off 111111, 4 drop off 222222"
      );
      expect(lines[2]).toBe(
        "Each customer's extra wait over a single trip: 111111 1 min 04 s, 222222 2 min 10 s"
      );
    });

    it("gracefully omits missing or malformed values", () => {
      const emptyValuesReason: OfferReasonAdmin = {
        id: "reason-empty",
        deliveryEventId: "evt-empty",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {},
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "STACK",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(stackLines(emptyValuesReason)).toEqual([]);

      const malformedReason: OfferReasonAdmin = {
        ...emptyValuesReason,
        values: {
          partnerDeliveryId: 12345, // not a string
          sequence: [{ notDeliveryId: true }], // invalid stop items
          delaySeconds: "not-an-object",
        },
      };
      expect(stackLines(malformedReason)).toEqual([]);
    });
  });

  describe("OfferReasonsCard rendering of STACK reason (spec 0048, AC-12)", () => {
    it("renders ' · Two orders together' in header and shows stack lines in list", () => {
      const courierNames = new Map([["c-1", "Alex Rider"]]);
      const stackReason: OfferReasonAdmin = {
        id: "reason-stack-render",
        deliveryEventId: "evt-stack-render",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {
          roadSeconds: 120,
          centsPerHour: 800,
          waitingSeconds: 300,
          partnerDeliveryId: "del-partner-444444",
          sequence: [
            { deliveryId: "del-this-333333", stop: "PICKUP" },
            { deliveryId: "del-partner-444444", stop: "PICKUP" },
          ],
          delaySeconds: {
            "del-this-333333": 45,
          },
        },
        score: 0.1,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "STACK",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[stackReason]}
          courierNameById={courierNames}
        />
      );

      // Header indicates stack offer
      expect(screen.getByText(/· Two orders together/)).toBeInTheDocument();

      // Stack lines rendered in list
      expect(screen.getByText("Offered together with delivery 444444")).toBeInTheDocument();
      expect(screen.getByText("Stops: 1 pick up 333333, 2 pick up 444444")).toBeInTheDocument();
      expect(
        screen.getByText("Each customer's extra wait over a single trip: 333333 45 s")
      ).toBeInTheDocument();
    });
  });

  describe("reasonLines with ADD_ON kind (spec 0048, row 81, AC-12)", () => {
    it("returns empty array for ADD_ON kind so matcher figures are not shown", () => {
      const addOnReason: OfferReasonAdmin = {
        id: "reason-addon-lines",
        deliveryEventId: "evt-addon",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: { roadTime: 50, earnings: 30, waiting: 20 },
        values: {
          roadSeconds: 120,
          centsPerHour: 800,
          currentDeliveryId: "del-job-111111",
        },
        score: 0.1,
        candidateCount: 2,
        ridersInRange: 3,
        candidates: null,
        kind: "ADD_ON",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(reasonLines(addOnReason)).toEqual([]);
    });
  });

  describe("addOnLines helper (spec 0048, row 81, AC-12)", () => {
    it("returns empty array when reason.kind is not ADD_ON", () => {
      const stackReason: OfferReasonAdmin = {
        id: "reason-st",
        deliveryEventId: "evt-st",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: { currentDeliveryId: "del-job-111" },
        score: null,
        candidateCount: 1,
        ridersInRange: 1,
        candidates: null,
        kind: "STACK",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(addOnLines(stackReason)).toEqual([]);

      const singleReason: OfferReasonAdmin = {
        ...stackReason,
        kind: "SINGLE",
      };
      expect(addOnLines(singleReason)).toEqual([]);
    });

    it("formats full add-on reason lines including job id, added km/min, stops, extra waits, calm food delivery notice, and candidate count", () => {
      const addOnReason: OfferReasonAdmin = {
        id: "reason-addon-full",
        deliveryEventId: "evt-addon-full",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {
          currentDeliveryId: "del-job-999999",
          extraKm: 1.8,
          extraMinutes: 6,
          sequence: [
            { deliveryId: "del-job-999999", stop: "PICKUP" },
            { deliveryId: "del-addon-888888", stop: "PICKUP" },
            { deliveryId: "del-job-999999", stop: "DROPOFF" },
            { deliveryId: "del-addon-888888", stop: "DROPOFF" },
          ],
          delaySeconds: {
            "del-job-999999": 90,
            "del-addon-888888": 150,
          },
          carryingFood: true,
        },
        score: null,
        candidateCount: 4,
        ridersInRange: 5,
        candidates: null,
        kind: "ADD_ON",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      const lines = addOnLines(addOnReason);
      expect(lines).toEqual([
        "Added to the rider's job, delivery 999999",
        "Adds +1.8 km, +6 min to that job",
        "Stops: 1 pick up 999999, 2 pick up 888888, 3 drop off 999999, 4 drop off 888888",
        "Each customer's extra wait over a single trip: 999999 1 min 30 s, 888888 2 min 30 s",
        "The rider was carrying food: twice the time to answer, never an insistent ring",
        "Fewest extra minutes of 4 riders on a job compared",
      ]);
    });

    it("omits optional lines when corresponding fields are absent or falsy", () => {
      const minimalAddOnReason: OfferReasonAdmin = {
        id: "reason-addon-min",
        deliveryEventId: "evt-addon-min",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {},
        score: null,
        candidateCount: undefined as any,
        ridersInRange: 0,
        candidates: null,
        kind: "ADD_ON",
        createdAt: "2026-11-20T10:00:00.000Z",
      };
      expect(addOnLines(minimalAddOnReason)).toEqual([]);

      const notCarryingFoodReason: OfferReasonAdmin = {
        ...minimalAddOnReason,
        values: {
          currentDeliveryId: "del-job-111111",
          carryingFood: false,
        },
      };
      expect(addOnLines(notCarryingFoodReason)).toEqual([
        "Added to the rider's job, delivery 111111",
      ]);
    });
  });

  describe("OfferReasonsCard rendering of ADD_ON reason (spec 0048, row 81, AC-12)", () => {
    it("renders ' · One more order on the way' in header and shows add-on lines in list", () => {
      const courierNames = new Map([["c-1", "Yannis M."]]);
      const addOnReason: OfferReasonAdmin = {
        id: "reason-addon-render",
        deliveryEventId: "evt-addon-render",
        courierId: "c-1",
        strategy: "FAIRNESS",
        weights: null,
        values: {
          currentDeliveryId: "del-job-123456",
          extraKm: 0.5,
          extraMinutes: 2,
          sequence: [
            { deliveryId: "del-job-123456", stop: "PICKUP" },
            { deliveryId: "del-addon-654321", stop: "PICKUP" },
          ],
          delaySeconds: {
            "del-job-123456": 30,
          },
          carryingFood: true,
        },
        score: null,
        candidateCount: 3,
        ridersInRange: 4,
        candidates: null,
        kind: "ADD_ON",
        createdAt: "2026-11-20T10:00:00.000Z",
      };

      render(
        <OfferReasonsCard
          reasons={[addOnReason]}
          courierNameById={courierNames}
        />
      );

      // Header indicates add-on offer
      expect(screen.getByText(/Yannis M\. · Fairness \(co-op weights\) · One more order on the way/)).toBeInTheDocument();

      // Add-on lines rendered in list
      expect(screen.getByText("Added to the rider's job, delivery 123456")).toBeInTheDocument();
      expect(screen.getByText("Adds +0.5 km, +2 min to that job")).toBeInTheDocument();
      expect(screen.getByText("Stops: 1 pick up 123456, 2 pick up 654321")).toBeInTheDocument();
      expect(screen.getByText("Each customer's extra wait over a single trip: 123456 30 s")).toBeInTheDocument();
      expect(
        screen.getByText("The rider was carrying food: twice the time to answer, never an insistent ring")
      ).toBeInTheDocument();
      expect(screen.getByText("Fewest extra minutes of 3 riders on a job compared")).toBeInTheDocument();

      // Candidate table is not rendered
      expect(screen.queryByRole("table")).toBeNull();
    });
  });
});
