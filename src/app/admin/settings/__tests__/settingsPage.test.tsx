import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const replace = vi.fn();
let params = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => params,
}));

const apiEnabled = vi.fn(() => false);

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    isApiEnabled: () => apiEnabled(),
    api: {
      ...actual.api,
      // Left unresolved on purpose: this suite is about which panel is on
      // screen, and a background sync landing mid-assertion would be testing
      // the shell's fetch instead.
      adminSettings: vi.fn(() => new Promise(() => {})),
      updateAdminSettings: vi.fn(() => new Promise(() => {})),
    },
  };
});

import AdminSettingsPage from "@/app/admin/settings/page";

beforeEach(() => {
  params = new URLSearchParams();
  replace.mockClear();
  apiEnabled.mockReturnValue(false);
});
afterEach(cleanup);

describe("Shop settings", () => {
  it("opens on Shop details and mounts that tab only", () => {
    render(<AdminSettingsPage />);

    // One panel at a time is the whole reason the tabs exist: thirty controls
    // on one scroll is the complaint this screen was rebuilt for.
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.getByRole("tabpanel").id).toBe("settings-panel-store");
  });

  it("opens the tab a link asked for", () => {
    // The bill screen links here as ?tab=tax when a GST number is missing.
    params = new URLSearchParams("tab=tax");
    render(<AdminSettingsPage />);

    expect(screen.getByRole("tabpanel").id).toBe("settings-panel-tax");
  });

  it("switches tabs and writes the tab into the address, so a refresh stays put", () => {
    render(<AdminSettingsPage />);

    fireEvent.click(screen.getAllByRole("tab", { name: "Checkout" })[0]);

    expect(screen.getByRole("tabpanel").id).toBe("settings-panel-checkout");
    expect(replace).toHaveBeenCalledWith("/admin/settings?tab=checkout", { scroll: false });
  });

  it("offers Start over only on the practice shop", () => {
    render(<AdminSettingsPage />);
    expect(screen.getAllByRole("tab", { name: "Start over" }).length).toBeGreaterThan(0);

    cleanup();
    apiEnabled.mockReturnValue(true);
    render(<AdminSettingsPage />);
    // On a real shop there is nothing to restore, so the tab does not exist
    // rather than opening on an explanation of why it is empty.
    expect(screen.queryAllByRole("tab", { name: "Start over" })).toHaveLength(0);
  });

  it("says where the changes are being kept on a practice shop", () => {
    render(<AdminSettingsPage />);
    expect(screen.getAllByText(/Kept in this browser only/i).length).toBeGreaterThan(0);
  });
});
