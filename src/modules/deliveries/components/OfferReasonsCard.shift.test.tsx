import React from "react";
import { render, screen, within } from "@testing-library/react";
import { OfferReasonsCard, reasonLines as rawReasonLines } from "./OfferReasonsCard";
import type { OfferReasonAdmin } from "../../../backend-admin-sdk/src/models/DeliveryAdminDto";
import { createI18n } from "../../../i18n/createI18n";
import {
  formatDate,
  formatDateTime,
  formatDateTimeSeconds,
  formatDistance,
  formatMoney,
  formatMonthYear,
  formatNumber,
  formatTime,
  formatTimeSeconds,
  formatWeekdayDate,
} from "../../../i18n/format";
import type { Formats } from "../../../i18n/useFormat";

const i18n = createI18n("en");
const t = i18n.t;
const makeFormats = (language: "en" | "el" = "en"): Formats => ({
  language,
  money: (cents, currency) => formatMoney(cents, currency, language),
  number: (value, max) => formatNumber(value, language, max),
  dateTime: (value) => formatDateTime(value, language),
  dateTimeSeconds: (value) => formatDateTimeSeconds(value, language),
  date: (value) => formatDate(value, language),
  time: (value) => formatTime(value, language),
  timeSeconds: (value) => formatTimeSeconds(value, language),
  monthYear: (value) => formatMonthYear(value, language),
  weekdayDate: (value) => formatWeekdayDate(value, language),
  atTime: (value) => `${formatTime(value, language)}`,
  distance: (value, unit) => formatDistance(value, unit, language),
});
const f = makeFormats("en");
const reasonLines = (reason: OfferReasonAdmin) => rawReasonLines(reason, t, f);

// Spec 0049 (row 79, AC-3): the offer reason records the shift weight and onShift, only while Shifts
// was on. The admin card words them, and shows nothing of shifts for an offer made with Shifts off.
describe("OfferReasonsCard and shifts (spec 0049, AC-3)", () => {
  const courierNames = new Map<string, string>([
    ["c-101", "Dimitris V."],
    ["c-102", "Eleni K."],
  ]);

  const candidate = (courierId: string, extra: Record<string, unknown> = {}) => ({
    courierId,
    roadSeconds: 245,
    roadEstimated: false,
    centsPerHour: 840,
    earningsAssumed: false,
    earningsEqual: false,
    waitingSeconds: 900,
    score: 0.25,
    ...extra,
  });

  // An offer made with Shifts off: spec 0044's reason, with no shift key anywhere.
  const shiftsOff: OfferReasonAdmin = {
    id: "reason-off",
    deliveryEventId: "evt-off",
    courierId: "c-101",
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
    score: 0.25,
    candidateCount: 2,
    ridersInRange: 2,
    candidates: [candidate("c-101"), candidate("c-102", { score: 0.5 })],
    kind: "SINGLE",
    createdAt: "2026-11-20T10:00:00.000Z",
  };

  // The same offer made with Shifts on, weight 100: the offered rider was on a booked shift.
  const shiftsOn: OfferReasonAdmin = {
    ...shiftsOff,
    id: "reason-on",
    deliveryEventId: "evt-on",
    weights: { roadTime: 50, earnings: 30, waiting: 20, shift: 100 },
    values: { ...shiftsOff.values, onShift: true },
    candidates: [
      candidate("c-101", { onShift: true }),
      candidate("c-102", { onShift: false, score: 0.5 }),
    ],
  };

  describe("reasonLines", () => {
    it('says "On a booked shift" when the offered rider was on one', () => {
      expect(reasonLines(shiftsOn)).toContain("On a booked shift");
      expect(reasonLines(shiftsOn)).not.toContain("Not on a booked shift");
    });

    it('says "Not on a booked shift" when Shifts was on and the rider was not', () => {
      const lines = reasonLines({ ...shiftsOn, values: { ...shiftsOn.values, onShift: false } });
      expect(lines).toContain("Not on a booked shift");
      expect(lines).not.toContain("On a booked shift");
    });

    it("says nothing about shifts when the reason has no onShift (Shifts was off)", () => {
      const lines = reasonLines(shiftsOff);
      expect(lines.join(" ")).not.toMatch(/shift/i);
      expect(lines).toHaveLength(4);
    });

    it("adds exactly one line to the four of spec 0044, before the score", () => {
      const lines = reasonLines(shiftsOn);
      expect(lines).toHaveLength(5);
      expect(lines[3]).toBe("On a booked shift");
      expect(lines[4]).toMatch(/^Score /);
    });

    it("a value that is not a yes or no is not worded", () => {
      const lines = reasonLines({ ...shiftsOn, values: { ...shiftsOn.values, onShift: "yes" } });
      expect(lines.join(" ")).not.toMatch(/booked shift/);
    });

    it("another matcher's reason never gets a shift line", () => {
      const lines = reasonLines({
        ...shiftsOn,
        strategy: "NEAREST_COURIER",
        values: { straightMetres: 300, roadSeconds: 100, onShift: true },
      });
      expect(lines.join(" ")).not.toMatch(/booked shift/);
    });
  });

  describe("the card", () => {
    it("Shifts on: the weights line ends with the shift weight", () => {
      render(<OfferReasonsCard reasons={[shiftsOn]} courierNameById={courierNames} />);
      expect(
        screen.getByText("Weights: road time 50, pay per hour 30, waiting 20, booked shift 100")
      ).toBeInTheDocument();
    });

    it("Shifts on at weight 0: the weight is still shown, as 0", () => {
      render(
        <OfferReasonsCard
          reasons={[{ ...shiftsOn, weights: { roadTime: 50, earnings: 30, waiting: 20, shift: 0 } }]}
          courierNameById={courierNames}
        />
      );
      expect(
        screen.getByText("Weights: road time 50, pay per hour 30, waiting 20, booked shift 0")
      ).toBeInTheDocument();
    });

    it("Shifts on: the offered rider's lines say On a booked shift", () => {
      render(<OfferReasonsCard reasons={[shiftsOn]} courierNameById={courierNames} />);
      expect(screen.getByText("On a booked shift")).toBeInTheDocument();
    });

    it("Shifts on: the table has an On a shift column, with Yes or No for each rider compared", () => {
      render(<OfferReasonsCard reasons={[shiftsOn]} courierNameById={courierNames} />);
      const table = screen.getByRole("table");
      const headers = within(table).getAllByRole("columnheader").map((th) => th.textContent);
      expect(headers).toContain("On a shift");
      // Before the score, which stays the last column.
      expect(headers.indexOf("On a shift")).toBe(headers.length - 2);
      expect(headers[headers.length - 1]).toBe("Score");

      const column = headers.indexOf("On a shift");
      const cellOf = (name: RegExp | string) => {
        const row = within(table).getByRole("rowheader", { name }).closest("tr") as HTMLElement;
        return Array.from(row.children)[column]?.textContent;
      };
      expect(cellOf(/Dimitris V\. \(offered\)/)).toBe("Yes");
      expect(cellOf("Eleni K.")).toBe("No");
    });

    it("Shifts off: no shift weight, no shift line and no On a shift column", () => {
      render(<OfferReasonsCard reasons={[shiftsOff]} courierNameById={courierNames} />);
      expect(screen.getByText("Weights: road time 50, pay per hour 30, waiting 20")).toBeInTheDocument();
      expect(screen.queryByText(/booked shift/i)).toBeNull();
      expect(screen.queryByText("On a shift")).toBeNull();
      const table = screen.getByRole("table");
      expect(within(table).queryByText("Yes")).toBeNull();
      expect(within(table).queryByText("No")).toBeNull();
    });

    it("each offer decides for itself: one made with Shifts off beside one made with Shifts on", () => {
      render(<OfferReasonsCard reasons={[shiftsOff, shiftsOn]} courierNameById={courierNames} />);
      const tables = screen.getAllByRole("table");
      expect(tables).toHaveLength(2);
      const withColumn = tables.filter((table) => within(table).queryByText("On a shift") !== null);
      expect(withColumn).toHaveLength(1);
      expect(screen.getAllByText(/, booked shift 100$/)).toHaveLength(1);
    });

    it("every row of a table with the column has the same number of cells as its header", () => {
      render(<OfferReasonsCard reasons={[shiftsOn]} courierNameById={courierNames} />);
      const table = screen.getByRole("table");
      const [head, ...body] = within(table).getAllByRole("row");
      expect(head?.children.length).toBeGreaterThan(0);
      for (const row of body) {
        expect(row.children.length).toBe(head?.children.length);
      }
    });
  });
});
