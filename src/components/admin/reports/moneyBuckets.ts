import { formatInr } from "@/data/admin";
import { eachDayInRange } from "@/lib/reports/dateRange";

/**
 * Turning a list of selling days into the bars he actually sees.
 *
 * Two things went wrong when the chart drew the server's rows straight. The
 * server only sends back days that had a sale, so a quiet fortnight with three
 * good days came back as three rows and the chart stood them shoulder to
 * shoulder — it read as if the shop sold something every single day. And on the
 * thirty-day view it drew thirty bars with thirty date labels underneath, which
 * at phone width run off the side and drag the whole page sideways with them.
 *
 * So: put the empty days back, then group them into a number of bars that fits
 * on the phone he keeps behind the counter.
 */

/** One day's takings. `date` is YYYY-MM-DD. */
export type DaySales = {
  date: string;
  revenue: number;
  orders: number;
};

/** One bar on the chart — a day, a week, or a month of those days added up. */
export type SalesBar = {
  /** First day this bar covers, YYYY-MM-DD. */
  start: string;
  /** Last day this bar covers, YYYY-MM-DD, included. */
  end: string;
  /** How many days the bar covers. A short bar means a short stretch, not a bad week. */
  days: number;
  revenue: number;
  orders: number;
  /** What sits under the bar on the chart, e.g. "15 Jul". */
  label: string;
};

export type BarSize = "day" | "week" | "month";

const dayMonth = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const monthOnly = new Intl.DateTimeFormat("en-IN", { month: "short" });
const monthYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit" });

/** Local-time parse. `new Date("2026-07-15")` is UTC and lands a day early in India. */
function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function lastDayOfMonth(key: string): number {
  const date = parseDay(key);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Every day between the two dates, with zero on the days nothing sold.
 *
 * Days the server sent that fall outside the asked-for stretch are dropped: the
 * chart must show the dates he picked and nothing else, or the total under it
 * and the bars above it stop agreeing.
 */
export function fillMissingDays(points: DaySales[], start: string, end: string): DaySales[] {
  const byDate = new Map(points.map((point) => [point.date.slice(0, 10), point]));
  return eachDayInRange(start, end).map((date) => {
    const found = byDate.get(date);
    return {
      date,
      revenue: found?.revenue ?? 0,
      orders: found?.orders ?? 0,
    };
  });
}

/**
 * How much time one bar should cover.
 *
 * The ceiling is the phone, not the maths: past about eight labels the row of
 * dates under the chart is wider than a 375px screen. Eight days or fewer get a
 * bar each; up to nine weeks get a bar a week; anything longer gets a bar a
 * month, which caps a full year at twelve.
 */
export function chooseBarSize(dayCount: number): BarSize {
  if (dayCount <= 8) return "day";
  if (dayCount <= 63) return "week";
  return "month";
}

function makeBar(days: DaySales[], label: string): SalesBar {
  return {
    start: days[0].date,
    end: days[days.length - 1].date,
    days: days.length,
    revenue: days.reduce((sum, day) => sum + day.revenue, 0),
    orders: days.reduce((sum, day) => sum + day.orders, 0),
    label,
  };
}

/**
 * Add the days up into bars.
 *
 * Labels have to stay different from one another: the chart keys its date row
 * by the label text, so two bars reading "Jul" would collide and one of them
 * would vanish. Months therefore carry the year whenever the stretch crosses
 * one.
 */
export function groupDays(days: DaySales[], size: BarSize): SalesBar[] {
  if (days.length === 0) return [];

  if (size === "day") {
    return days.map((day) => makeBar([day], dayMonth.format(parseDay(day.date))));
  }

  if (size === "week") {
    const bars: SalesBar[] = [];
    for (let index = 0; index < days.length; index += 7) {
      const chunk = days.slice(index, index + 7);
      bars.push(makeBar(chunk, dayMonth.format(parseDay(chunk[0].date))));
    }
    return bars;
  }

  const byMonth = new Map<string, DaySales[]>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(day);
    else byMonth.set(key, [day]);
  }
  const spansYears = days[0].date.slice(0, 4) !== days[days.length - 1].date.slice(0, 4);
  const format = spansYears ? monthYear : monthOnly;
  return [...byMonth.values()].map((chunk) =>
    makeBar(chunk, format.format(parseDay(chunk[0].date))),
  );
}

/**
 * The warning to print under the chart when a bar covers less time than its
 * neighbours.
 *
 * Without it a two-day tail bar next to full weeks reads as sales falling off a
 * cliff, and he would go looking for a problem that is only the calendar.
 */
export function partialBarNote(bars: SalesBar[], size: BarSize): string | null {
  if (size === "day" || bars.length === 0) return null;

  if (size === "week") {
    const last = bars[bars.length - 1];
    if (bars.length < 2 || last.days === 7) return null;
    return `The last bar covers only ${last.days} ${last.days === 1 ? "day" : "days"}.`;
  }

  const first = bars[0];
  const last = bars[bars.length - 1];
  const firstPart = Number(first.start.slice(8, 10)) !== 1;
  const lastPart = Number(last.end.slice(8, 10)) !== lastDayOfMonth(last.end);
  if (bars.length === 1) {
    return firstPart || lastPart ? "This bar covers part of a month." : null;
  }
  if (firstPart && lastPart) return "The first and last bars cover part of a month.";
  if (firstPart) return "The first bar covers part of a month.";
  if (lastPart) return "The last bar covers part of a month.";
  return null;
}

/**
 * Totals for a stretch of days.
 *
 * The average is floored, the way the server floors it, so the offline demo and
 * a live shop never show a rupee of difference on the same order book.
 */
export function totalsFromDays(days: DaySales[]) {
  const revenue = days.reduce((sum, day) => sum + day.revenue, 0);
  const orders = days.reduce((sum, day) => sum + day.orders, 0);
  return {
    revenue,
    orders,
    average: orders > 0 ? Math.floor(revenue / orders) : 0,
  };
}

/**
 * The little up/down tag on a card.
 *
 * Returns nothing at all when there is nothing honest to compare — a shop that
 * sold nothing in either stretch should not be told it is "flat", which reads
 * like steady trade.
 */
export function changeBadge(
  current: number,
  previous: number,
): { text: string; positive: boolean | null } | null {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return { text: "New", positive: true };
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent === 0) return { text: "Same", positive: null };
  return { text: `${percent > 0 ? "+" : "-"}${Math.abs(percent)}%`, positive: percent > 0 };
}

/**
 * The line under the takings card, naming the stretch being compared against.
 *
 * A bare "+24%" leaves him doing the arithmetic backwards to find out what it
 * is 24% of, so the earlier figure is printed in full.
 */
export function priorLine(previousRevenue: number, dayCount: number): string {
  const when = dayCount === 1 ? "the day before" : `the ${dayCount} days before`;
  return `${formatInr(previousRevenue)} in ${when}`;
}
