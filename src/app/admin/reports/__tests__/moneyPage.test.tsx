import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminMoneyPage from "@/app/admin/reports/page";

/**
 * The one money screen, pinned where it used to mislead.
 *
 * The screens this replaced could each say something untrue with a straight
 * face: figures for the last thirty days under a heading naming a week in May,
 * a best-seller list covering the shop's whole history sitting under a date
 * picker, and a chart that reads "nothing sold" for as long as the answer takes
 * to arrive. Those are the cases below.
 */

const reportSummary = vi.fn();
const reportSeries = vi.fn();
const reportTopSkus = vi.fn();
const reportGst = vi.fn();
let shopConnected = true;

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => shopConnected,
    api: {
      ...actual.api,
      reportSummary: (window: unknown) => reportSummary(window),
      reportSeries: (window: unknown) => reportSeries(window),
      reportTopSkus: () => reportTopSkus(),
      reportGst: (window: unknown) => reportGst(window),
    },
  };
});

const SUMMARY = {
  days: 7,
  revenue: 50000,
  orders: 20,
  aov: 2500,
  prev_revenue: 40000,
  revenue_delta_pct: 25,
};

beforeEach(() => {
  shopConnected = true;
  reportSummary.mockReset().mockResolvedValue(SUMMARY);
  reportSeries.mockReset().mockResolvedValue([]);
  reportTopSkus.mockReset().mockResolvedValue([]);
  // The GST panel is its own screen-within-a-screen with its own month picker;
  // parked mid-answer here so its figures never collide with the sales ones.
  reportGst.mockReset().mockReturnValue(new Promise(() => {}));
  window.localStorage.clear();
});

afterEach(cleanup);

describe("while the shop is still adding it up", () => {
  it("shows no figure at all rather than a zero he could act on", async () => {
    reportSummary.mockReturnValue(new Promise(() => {}));
    reportSeries.mockReturnValue(new Promise(() => {}));

    render(<AdminMoneyPage />);

    expect((await screen.findAllByText("Adding it up…")).length).toBeGreaterThan(0);
    expect(screen.queryByText("₹0")).toBeNull();
    // "Nothing sold in these dates" is a statement about the shop, not about
    // the network, and it must not appear before the shop has answered.
    expect(screen.queryByText("Nothing sold in these dates")).toBeNull();
  });
});

describe("what came in", () => {
  it("prints the takings, the change, and what it is a change from", async () => {
    render(<AdminMoneyPage />);

    expect(await screen.findByText("₹50,000")).toBeInTheDocument();
    expect(screen.getByText("₹40,000 in the 7 days before")).toBeInTheDocument();
    expect(screen.getByText("+25%")).toBeInTheDocument();
    expect(screen.getByText("₹2,500")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("asks about the dates on screen, not about a number of days", async () => {
    render(<AdminMoneyPage />);

    await waitFor(() => expect(reportSummary).toHaveBeenCalled());
    const asked = reportSummary.mock.calls[0][0] as { from?: string; to?: string; days?: number };
    expect(asked.days).toBeUndefined();
    expect(asked.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(asked.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(reportSeries.mock.calls[0][0]).toEqual(asked);
  });

  it("says the takings are orders accepted, not cash collected", async () => {
    render(<AdminMoneyPage />);

    expect(
      await screen.findByText(/cash-on-delivery orders may still be on its way/i),
    ).toBeInTheDocument();
  });
});

describe("the day-by-day chart", () => {
  it("draws a bar a day for a week", async () => {
    render(<AdminMoneyPage />);

    expect(await screen.findByText("Sales by day")).toBeInTheDocument();
    expect(screen.getByText("Orders by day")).toBeInTheDocument();
  });

  it("groups into weeks over a month, so the dates fit across a phone", async () => {
    render(<AdminMoneyPage />);
    await screen.findByText("Sales by day");

    fireEvent.change(screen.getByLabelText("Dates"), { target: { value: "30d" } });

    expect(await screen.findByText("Sales by week")).toBeInTheDocument();
    // A 30-day stretch leaves a two-day tail, which would read as a collapse.
    expect(await screen.findByText("The last bar covers only 2 days.")).toBeInTheDocument();
  });
});

describe("best sellers", () => {
  it("says out loud that the dates above do not apply to it", async () => {
    reportTopSkus.mockResolvedValue([
      { product_key: "fc26-ps5", qty: 9, revenue: 44000 },
    ]);

    render(<AdminMoneyPage />);

    expect(await screen.findByText("fc26-ps5")).toBeInTheDocument();
    expect(screen.getByText("9 sold")).toBeInTheDocument();
    expect(
      screen.getByText("Everything you have ever sold, not just the dates above."),
    ).toBeInTheDocument();
  });

  it("waits rather than claiming nothing has ever sold", async () => {
    reportTopSkus.mockReturnValue(new Promise(() => {}));

    render(<AdminMoneyPage />);

    await screen.findByText("₹50,000");
    expect(screen.queryByText("Nothing sold yet.")).toBeNull();
  });
});

describe("with no shop connected", () => {
  it("still draws the screen, and says the figures are practice ones", async () => {
    shopConnected = false;

    render(<AdminMoneyPage />);

    expect(
      await screen.findByText(/These are practice figures from a sample shop/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Sales by day")).toBeInTheDocument();
    expect(reportSummary).not.toHaveBeenCalled();
  });
});

describe("when the shop cannot answer", () => {
  it("says so instead of leaving him waiting on a spinner forever", async () => {
    reportSummary.mockRejectedValue(new Error("down"));
    reportSeries.mockRejectedValue(new Error("down"));

    render(<AdminMoneyPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /couldn't reach the store server/i,
    );
    // Not a spinner that never stops, and not an empty chart claiming the shop
    // sold nothing.
    expect((await screen.findAllByText("Nothing to show yet.")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Nothing sold in these dates")).toBeNull();
  });
});
