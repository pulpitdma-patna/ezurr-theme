import { describe, expect, it } from "vitest";
import {
  changeBadge,
  chooseBarSize,
  fillMissingDays,
  groupDays,
  partialBarNote,
  priorLine,
  totalsFromDays,
  type DaySales,
} from "@/components/admin/reports/moneyBuckets";

/**
 * The money screen's arithmetic, tested where the owner would be misled.
 *
 * Every case below is a way the chart could tell him something that is not
 * true: a quiet fortnight drawn as a busy one, a short tail week drawn as a
 * collapse, or a total that does not match the bars sitting above it.
 */

describe("putting the empty days back", () => {
  it("draws a day the shop sold nothing, instead of closing the gap", () => {
    const sparse: DaySales[] = [
      { date: "2026-07-01", revenue: 5000, orders: 2 },
      { date: "2026-07-05", revenue: 3000, orders: 1 },
    ];

    const filled = fillMissingDays(sparse, "2026-07-01", "2026-07-05");

    expect(filled.map((day) => day.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
    expect(filled.map((day) => day.revenue)).toEqual([5000, 0, 0, 0, 3000]);
    expect(filled.map((day) => day.orders)).toEqual([2, 0, 0, 0, 1]);
  });

  it("ignores days outside the dates he picked", () => {
    const filled = fillMissingDays(
      [
        { date: "2026-06-30", revenue: 9999, orders: 9 },
        { date: "2026-07-02", revenue: 100, orders: 1 },
        { date: "2026-07-09", revenue: 8888, orders: 8 },
      ],
      "2026-07-01",
      "2026-07-03",
    );

    expect(filled).toHaveLength(3);
    expect(totalsFromDays(filled).revenue).toBe(100);
  });

  it("accepts a full timestamp where the server sends one", () => {
    const filled = fillMissingDays(
      [{ date: "2026-07-02T00:00:00.000Z", revenue: 700, orders: 1 }],
      "2026-07-01",
      "2026-07-02",
    );

    expect(filled[1]).toEqual({ date: "2026-07-02", revenue: 700, orders: 1 });
  });
});

describe("how much time one bar covers", () => {
  it("gives a week or more of days a bar each", () => {
    expect(chooseBarSize(1)).toBe("day");
    expect(chooseBarSize(7)).toBe("day");
    expect(chooseBarSize(8)).toBe("day");
  });

  it("switches to weeks before the date row outgrows a phone", () => {
    expect(chooseBarSize(9)).toBe("week");
    expect(chooseBarSize(30)).toBe("week");
    expect(chooseBarSize(63)).toBe("week");
  });

  it("switches to months so a year is twelve bars, not three hundred", () => {
    expect(chooseBarSize(64)).toBe("month");
    expect(chooseBarSize(365)).toBe("month");
  });
});

function daysBetween(start: string, end: string, revenuePerDay = 100): DaySales[] {
  return fillMissingDays([], start, end).map((day) => ({
    ...day,
    revenue: revenuePerDay,
    orders: 1,
  }));
}

describe("adding the days up into bars", () => {
  it("keeps every rupee when it groups by week", () => {
    const days = daysBetween("2026-07-01", "2026-07-30");
    const bars = groupDays(days, "week");

    expect(bars).toHaveLength(5);
    expect(bars.map((bar) => bar.days)).toEqual([7, 7, 7, 7, 2]);
    expect(bars.reduce((sum, bar) => sum + bar.revenue, 0)).toBe(
      totalsFromDays(days).revenue,
    );
    expect(bars[0]).toMatchObject({ start: "2026-07-01", end: "2026-07-07", orders: 7 });
    expect(bars[4]).toMatchObject({ start: "2026-07-29", end: "2026-07-30", orders: 2 });
  });

  it("keeps every rupee when it groups by month", () => {
    const days = daysBetween("2026-05-15", "2026-08-10");
    const bars = groupDays(days, "month");

    expect(bars.map((bar) => bar.label)).toEqual(["May", "Jun", "Jul", "Aug"]);
    expect(bars.map((bar) => bar.days)).toEqual([17, 30, 31, 10]);
    expect(bars.reduce((sum, bar) => sum + bar.revenue, 0)).toBe(
      totalsFromDays(days).revenue,
    );
  });

  it("labels days and weeks with a date he can find on a calendar", () => {
    expect(groupDays(daysBetween("2026-07-01", "2026-07-03"), "day").map((b) => b.label)).toEqual([
      "1 Jul",
      "2 Jul",
      "3 Jul",
    ]);
    expect(groupDays(daysBetween("2026-07-01", "2026-07-14"), "week").map((b) => b.label)).toEqual([
      "1 Jul",
      "8 Jul",
    ]);
  });

  it("carries the year on month labels once the stretch crosses one", () => {
    // Two Julys labelled "Jul" would collide in the chart's date row and one
    // bar's label would disappear.
    const bars = groupDays(daysBetween("2025-12-01", "2026-01-31"), "month");
    expect(bars.map((bar) => bar.label)).toEqual(["Dec 25", "Jan 26"]);
    expect(new Set(bars.map((bar) => bar.label)).size).toBe(bars.length);
  });

  it("returns nothing for no days rather than one empty bar", () => {
    expect(groupDays([], "week")).toEqual([]);
  });
});

describe("warning that a bar covers less time than its neighbours", () => {
  it("says so when the last week is a stub", () => {
    const bars = groupDays(daysBetween("2026-07-01", "2026-07-30"), "week");
    expect(partialBarNote(bars, "week")).toBe("The last bar covers only 2 days.");
  });

  it("says nothing when every week is a full week", () => {
    const bars = groupDays(daysBetween("2026-07-01", "2026-07-28"), "week");
    expect(partialBarNote(bars, "week")).toBeNull();
  });

  it("counts a single leftover day in the singular", () => {
    const bars = groupDays(daysBetween("2026-07-01", "2026-07-15"), "week");
    expect(partialBarNote(bars, "week")).toBe("The last bar covers only 1 day.");
  });

  it("names part-months at both ends", () => {
    const bars = groupDays(daysBetween("2026-05-15", "2026-08-10"), "month");
    expect(partialBarNote(bars, "month")).toBe(
      "The first and last bars cover part of a month.",
    );
  });

  it("says nothing for whole months", () => {
    const bars = groupDays(daysBetween("2026-06-01", "2026-07-31"), "month");
    expect(partialBarNote(bars, "month")).toBeNull();
  });

  it("says nothing when each bar is one day, because none of them is short", () => {
    const bars = groupDays(daysBetween("2026-07-01", "2026-07-05"), "day");
    expect(partialBarNote(bars, "day")).toBeNull();
  });
});

describe("totals", () => {
  it("floors the average the way the server floors it", () => {
    const totals = totalsFromDays([
      { date: "2026-07-01", revenue: 1000, orders: 3 },
      { date: "2026-07-02", revenue: 0, orders: 0 },
    ]);
    expect(totals).toEqual({ revenue: 1000, orders: 3, average: 333 });
  });

  it("does not divide by zero on a day nothing sold", () => {
    expect(totalsFromDays([{ date: "2026-07-01", revenue: 0, orders: 0 }]).average).toBe(0);
  });
});

describe("the up/down tag", () => {
  it("shows the change against the stretch before", () => {
    expect(changeBadge(12500, 10000)).toEqual({ text: "+25%", positive: true });
    expect(changeBadge(8000, 10000)).toEqual({ text: "-20%", positive: false });
    expect(changeBadge(10000, 10000)).toEqual({ text: "Same", positive: null });
  });

  it("says nothing at all when there is nothing to compare", () => {
    // "Flat" on a shop that sold nothing twice reads like steady trade.
    expect(changeBadge(0, 0)).toBeNull();
  });

  it("calls a first sale new rather than dividing by nothing", () => {
    expect(changeBadge(5000, 0)).toEqual({ text: "New", positive: true });
  });
});

describe("naming the stretch being compared against", () => {
  it("prints the earlier figure in full so the percentage means something", () => {
    expect(priorLine(98000, 7)).toBe("₹98,000 in the 7 days before");
  });

  it("reads properly for a single day", () => {
    expect(priorLine(4200, 1)).toBe("₹4,200 in the day before");
  });
});
