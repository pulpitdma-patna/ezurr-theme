import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { UpdatePanel } from "@/components/admin/UpdatePanel";

/**
 * The button that replaced a dead end.
 *
 * This panel used to tell him an update had not finished and then ask him to
 * get somebody to run `php artisan ezurr:update`. He has never used a terminal
 * and has nobody to ask, so his shop stayed on the old release — including the
 * releases fixing whatever he was complaining about.
 *
 * What is pinned here is the honesty of each state: it never claims a copy was
 * saved when none was, never leaves a spinner running for ever, and never puts
 * a command or a reason code in front of him.
 */

const systemUpdate = vi.fn();
const applySystemUpdate = vi.fn();

vi.mock("@/lib/apiClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/apiClient")>();
  return {
    ...actual,
    api: {
      ...actual.api,
      systemUpdate: () => systemUpdate(),
      applySystemUpdate: (p: unknown) => applySystemUpdate(p),
    },
  };
});

const CURRENT = {
  installedVersion: "1.0.0",
  codeVersion: "1.0.0",
  pendingMigrations: 0,
  updateNeeded: false,
  backupAvailable: true,
  lastRun: null,
  backups: [],
};

const WAITING = { ...CURRENT, codeVersion: "1.1.0", updateNeeded: true, pendingMigrations: 2 };

beforeEach(() => {
  systemUpdate.mockReset().mockResolvedValue(CURRENT);
  applySystemUpdate.mockReset();
});
afterEach(cleanup);

describe("when there is nothing to apply", () => {
  it("says so plainly, with no button to press", async () => {
    render(<UpdatePanel />);

    expect(await screen.findByText(/Your shop is up to date/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Apply/i })).toBeNull();
  });
});

describe("when an update is waiting", () => {
  it("offers to apply it, and says a copy is saved first", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    render(<UpdatePanel />);

    expect(await screen.findByText(/There is an update waiting/i)).toBeTruthy();
    expect(screen.getByText(/A copy of your shop's records is saved first/i)).toBeTruthy();
  });

  /** He is told what it will do before it does it. */
  it("asks once before touching anything", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    render(<UpdatePanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply the update" }));

    expect(screen.getByText(/nothing can be lost/i)).toBeTruthy();
    expect(applySystemUpdate).not.toHaveBeenCalled();
  });

  it("applies it when he confirms", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    applySystemUpdate.mockResolvedValue({ ok: true, run: null, status: CURRENT });
    render(<UpdatePanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply the update" }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, apply it now/i }));

    await waitFor(() => expect(applySystemUpdate).toHaveBeenCalledWith({}));
    expect(await screen.findByText(/Your shop is up to date/i)).toBeTruthy();
  });

  /** No jargon, and no command he cannot run. */
  it("never puts a terminal command in front of him", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    const { container } = render(<UpdatePanel />);

    await screen.findByText(/There is an update waiting/i);
    expect(container.textContent).not.toMatch(/artisan|migration|cache|queue worker/i);
  });
});

describe("when this server cannot make a copy", () => {
  /**
   * Said BEFORE he presses. On hosting that forbids running other programs it
   * can never work, and learning that from a refusal every single time would be
   * the wrong moment.
   */
  it("warns up front rather than refusing afterwards", async () => {
    systemUpdate.mockResolvedValue({ ...WAITING, backupAvailable: false });
    render(<UpdatePanel />);

    expect(await screen.findByText(/will not let the shop make its own copy/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /I have taken my own copy/i })).toBeTruthy();
  });

  it("does not promise a copy it cannot take", async () => {
    systemUpdate.mockResolvedValue({ ...WAITING, backupAvailable: false });
    const { container } = render(<UpdatePanel />);

    await screen.findByText(/There is an update waiting/i);
    expect(container.textContent).not.toMatch(/A copy of your shop's records is saved first/i);
  });
});

describe("when a run stopped without saying how it went", () => {
  /** A killed request must never leave a spinner claiming work is in progress. */
  it("says so, instead of showing an update still running", async () => {
    systemUpdate.mockResolvedValue({
      ...WAITING,
      lastRun: { status: "stopped", startedAt: new Date().toISOString() },
    });
    render(<UpdatePanel />);

    expect(await screen.findByText(/stopped without saying how it went/i)).toBeTruthy();
    expect(screen.queryByText(/Putting the update in place/i)).toBeNull();
  });
});

describe("when it will not start", () => {
  it("explains a refused copy without showing him a reason code", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    const { ApiError } = await import("@/lib/apiClient");
    applySystemUpdate.mockRejectedValue(
      new ApiError("conflict", 409, { reason: "backup_failed", backup: { reason: "no_tool" } }),
    );
    render(<UpdatePanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply the update" }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, apply it now/i }));

    const message = await screen.findByText(/does not allow the shop to make its own copy/i);
    expect(message.textContent).not.toMatch(/no_tool/);
    expect(message.textContent).toMatch(/Nothing has changed/i);
  });

  it("says an update is already going rather than starting a second", async () => {
    systemUpdate.mockResolvedValue(WAITING);
    const { ApiError } = await import("@/lib/apiClient");
    applySystemUpdate.mockRejectedValue(new ApiError("conflict", 409, { reason: "already_running" }));
    render(<UpdatePanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Apply the update" }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, apply it now/i }));

    expect(await screen.findByText(/already being put in place/i)).toBeTruthy();
  });
});
