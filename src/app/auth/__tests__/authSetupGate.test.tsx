import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AuthPage from "@/app/auth/page";

/**
 * When the store is unclaimed, /auth must not offer OTP — a code would go to a
 * log file. Setup is the only path, including when a customer session already
 * exists from an earlier mistaken sign-in.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const installState = vi.fn();

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => true,
    api: {
      ...actual.api,
      installState: () => installState(),
    },
  };
});

beforeEach(() => {
  installState.mockReset();
  window.localStorage.clear();
});

afterEach(cleanup);

describe("auth setup gate", () => {
  it("hides OTP and points at setup when the store needs claiming", async () => {
    installState.mockResolvedValue({ needsSetup: true, storeName: null });

    render(<AuthPage />);

    expect(await screen.findByRole("link", { name: /start setup/i })).toBeTruthy();
    expect(screen.queryByLabelText(/mobile number/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /continue/i })).toBeNull();
  });

  it("still shows setup when a customer session already exists", async () => {
    installState.mockResolvedValue({ needsSetup: true, storeName: null });
    window.localStorage.setItem("ezurr_api_token", "tok");
    window.localStorage.setItem(
      "ezurr_auth_session",
      JSON.stringify({
        mobile: "9876543210",
        name: "Rakesh",
        initials: "RA",
        signedInAt: new Date().toISOString(),
        role: "customer",
      }),
    );

    render(<AuthPage />);

    expect(await screen.findByRole("link", { name: /start setup/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /continue to account/i })).toBeTruthy();
    expect(screen.queryByLabelText(/mobile number/i)).toBeNull();
  });

  it("does not flash the OTP form before installState resolves", async () => {
    let resolveState: (value: { needsSetup: boolean; storeName: null }) => void = () => {};
    installState.mockReturnValue(
      new Promise((resolve) => {
        resolveState = resolve;
      }),
    );

    render(<AuthPage />);

    expect(screen.getByText(/checking/i)).toBeTruthy();
    expect(screen.queryByLabelText(/mobile number/i)).toBeNull();

    resolveState({ needsSetup: true, storeName: null });
    expect(await screen.findByRole("link", { name: /start setup/i })).toBeTruthy();
    expect(screen.queryByLabelText(/mobile number/i)).toBeNull();
  });

  it("shows unreachable, not setup, when installState errors", async () => {
    installState.mockRejectedValue(new Error("network"));

    render(<AuthPage />);

    expect(await screen.findByText(/can't reach the store server/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /start setup/i })).toBeNull();
    expect(screen.queryByLabelText(/mobile number/i)).toBeNull();
  });
});
