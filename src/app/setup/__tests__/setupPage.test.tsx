import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import SetupPage from "@/app/setup/page";

/**
 * The wizard's job is to be reachable exactly once.
 *
 * A store used to ship with an owner already seeded on a hardcoded mobile
 * number, so this page is what replaced that: the only place an administrator
 * can be created without already being one. The behaviour worth pinning is
 * therefore what it does when the store is NOT claimable, and that a successful
 * claim really signs the owner in — because an OTP cannot, on a fresh install.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const installState = vi.fn();
const installComplete = vi.fn();
const setApiToken = vi.fn();

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => true,
    setApiToken: (t: string | null) => setApiToken(t),
    api: {
      ...actual.api,
      installState: () => installState(),
      installComplete: (p: unknown) => installComplete(p),
    },
  };
});

const UNCLAIMED = {
  needsSetup: true,
  storeName: null,
  ready: { database: true, schema: true, content: true },
  requiresClaimToken: false,
  simulating: [
    { name: "payments (Razorpay)", variable: "RAZORPAY_DRIVER" },
    { name: "messaging (MSG91)", variable: "MSG91_DRIVER" },
  ],
};

beforeEach(() => {
  push.mockReset();
  installState.mockReset();
  installComplete.mockReset();
  setApiToken.mockReset();
  window.localStorage.clear();
});

afterEach(cleanup);

async function fillAndSubmit() {
  fireEvent.change(screen.getByPlaceholderText("Pulpit Games"), {
    target: { value: "Pulpit Games" },
  });
  fireEvent.change(screen.getByPlaceholderText("Rakesh"), { target: { value: "Rakesh" } });
  fireEvent.change(screen.getByPlaceholderText("9876543210"), {
    target: { value: "9876543210" },
  });
  fireEvent.click(screen.getByRole("button", { name: /create my owner account/i }));
}

describe("setup wizard", () => {
  it("refuses to offer setup for a store that already has an owner", async () => {
    installState.mockResolvedValue({ needsSetup: false, storeName: "Pulpit Games" });

    render(<SetupPage />);

    expect(await screen.findByText(/already set up/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /create my owner account/i })).toBeNull();
  });

  /**
   * The owner should learn that payments are simulated HERE, not from the first
   * customer whose money never arrived.
   */
  it("names what is still in practice mode before setup is finished", async () => {
    installState.mockResolvedValue(UNCLAIMED);

    render(<SetupPage />);

    expect(await screen.findByText(/payments \(Razorpay\)/)).toBeTruthy();
    expect(screen.getByText("RAZORPAY_DRIVER=live")).toBeTruthy();
    expect(screen.getByText("MSG91_DRIVER=live")).toBeTruthy();
  });

  it("signs the owner in directly on success, because no OTP could reach them", async () => {
    installState.mockResolvedValue(UNCLAIMED);
    installComplete.mockResolvedValue({
      token: "tok-123",
      user: { id: 1, name: "Rakesh", mobile: "9876543210", role: "admin", staffRole: "owner" },
    });

    render(<SetupPage />);
    await screen.findByRole("button", { name: /create my owner account/i });
    await fillAndSubmit();

    await waitFor(() => expect(setApiToken).toHaveBeenCalledWith("tok-123"));
    expect(push).toHaveBeenCalledWith("/admin");
    expect(JSON.parse(window.localStorage.getItem("ezurr_auth_session") ?? "{}").role).toBe(
      "admin",
    );
  });

  it("shows a bad mobile number without calling the server", async () => {
    installState.mockResolvedValue(UNCLAIMED);

    render(<SetupPage />);
    await screen.findByRole("button", { name: /create my owner account/i });
    fireEvent.change(screen.getByPlaceholderText("Pulpit Games"), {
      target: { value: "Pulpit Games" },
    });
    fireEvent.change(screen.getByPlaceholderText("Rakesh"), { target: { value: "Rakesh" } });
    fireEvent.change(screen.getByPlaceholderText("9876543210"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: /create my owner account/i }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(installComplete).not.toHaveBeenCalled();
  });

  /** The server's refusal is more specific than anything this page could invent. */
  it("repeats the server's own reason when a claim is refused", async () => {
    const { ApiError } = await import("@/lib/apiClient");
    installState.mockResolvedValue(UNCLAIMED);
    installComplete.mockRejectedValue(
      new ApiError("conflict", 409, {
        message: "This store already has orders, so it cannot be set up as new.",
      }),
    );

    render(<SetupPage />);
    await screen.findByRole("button", { name: /create my owner account/i });
    await fillAndSubmit();

    expect(await screen.findByText(/already has orders/i)).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
