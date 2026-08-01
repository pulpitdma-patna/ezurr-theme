import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import AdminTodayPage from "@/app/admin/page";
import type { ApiToday } from "@/lib/apiClient";

/**
 * Today has to say when messages have stopped going out.
 *
 * Nothing is sent the instant it happens — every order confirmation, game code
 * and sign-in code waits in a line for something on the server to pick it up.
 * When that stops, the line stops with it, and until now no screen said so: the
 * messages log went on listing them as sent-pending, and the first person to
 * find out was a customer who never got their code. It ran silent for a week on
 * this very shop.
 *
 * It belongs on Today because Today is the screen he opens every morning.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const today = vi.fn();

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => true,
    api: { ...actual.api, today: () => today() },
  };
});

function payload(messagesStuck: ApiToday["messagesStuck"]): ApiToday {
  return {
    since: null,
    newOrders: [],
    waiting: { toPack: 0, toSend: 0, unpaid: 0, lowStock: 0, preorders: 0 },
    money: { today: 0, collectedByCourier: 0, monthToDate: 0 },
    simulating: { messaging: false, payments: false },
    messagesStuck,
  } as unknown as ApiToday;
}

describe("Today says when messages have stopped going out", () => {
  beforeEach(() => {
    today.mockReset();
  });
  afterEach(cleanup);

  it("says nothing at all when messages are moving", async () => {
    today.mockResolvedValue(payload(null));

    render(<AdminTodayPage />);

    await waitFor(() => expect(today).toHaveBeenCalled());
    expect(screen.queryByText(/not going out/i)).toBeNull();
  });

  it("says so, and how many, when they are stuck", async () => {
    today.mockResolvedValue(
      payload({ pending: 9, since: new Date("2026-07-25T04:00:00Z").toISOString() }),
    );

    render(<AdminTodayPage />);

    expect(await screen.findByText(/Messages are not going out/i)).toBeTruthy();
    expect(screen.getByText(/9 messages are/)).toBeTruthy();
  });

  /** One waiting message is still a customer without their code. */
  it("counts in plain words when only one is waiting", async () => {
    today.mockResolvedValue(payload({ pending: 1, since: new Date().toISOString() }));

    render(<AdminTodayPage />);

    expect(await screen.findByText(/1 message is/)).toBeTruthy();
  });

  /**
   * He cannot restart a server from this screen, and telling him to would send
   * him hunting for a button that does not exist. It says who to ask instead.
   */
  it("tells him it is not his to fix", async () => {
    today.mockResolvedValue(payload({ pending: 3, since: new Date().toISOString() }));

    render(<AdminTodayPage />);

    expect(await screen.findByText(/Ask whoever set your shop up/i)).toBeTruthy();
    expect(screen.getByText(/Nothing has been lost/i)).toBeTruthy();
  });
});
