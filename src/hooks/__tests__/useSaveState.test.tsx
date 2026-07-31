import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useSaveState } from "@/hooks/useSaveState";
import { SaveStatus } from "@/components/admin/SaveStatus";
import { ApiError } from "@/lib/apiClient";

/**
 * Both things this hook does with time are `setTimeout`: waiting out the
 * debounce, and rescheduling itself when a save comes back with something still
 * unsaved. On real timers a test can only guess when those have happened, and
 * the guess was wrong in the one case that mattered — "typed while the save was
 * in flight" was really typed before the request had left, so it proved nothing
 * about the case it is named after.
 *
 * Only the two clock functions the hook uses are faked. `Date` is left real so
 * `Saved · 4:12 pm` is the time the owner would actually be looking at.
 */
const DEBOUNCE_MS = 600;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * The screen the owner named. He could not tell whether anything he typed had
 * been kept, and the four defects underneath that complaint are the four things
 * asserted here.
 */
function Harness({
  save,
  onPendingKeysChange,
}: {
  save: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onPendingKeysChange?: (keys: string[]) => void;
}) {
  const { state, queue } = useSaveState({ save, debounceMs: DEBOUNCE_MS, onPendingKeysChange });
  return (
    <div>
      <SaveStatus state={state} />
      <button type="button" onClick={() => queue({ storeName: "Ezurr Play" })}>
        edit
      </button>
      <button type="button" onClick={() => queue({ storeName: "Second thought" })}>
        edit again
      </button>
    </div>
  );
}

/** Type something, the way the owner does: one press, then React settles. */
async function press(label: string) {
  await act(async () => {
    screen.getByText(label).click();
  });
}

/** Let the debounce fall due, and whatever it starts run to its end. */
async function debounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Answer the request that is currently in the air. */
async function answer<T>(gate: { promise: Promise<T>; resolve: (value: T) => void }, value: T) {
  await act(async () => {
    gate.resolve(value);
    await gate.promise;
  });
}

type Save = (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;

describe("useSaveState", () => {
  /**
   * The original screen wrote the value locally, queued a request and popped
   * "Saved just now" 600 ms later whatever happened to it.
   */
  it("never says saved before the server has answered", async () => {
    const gate = deferred<Record<string, unknown>>();
    const save = vi.fn<Save>(() => gate.promise);
    render(<Harness save={save} />);

    await press("edit");

    // Queued but not sent yet, and already nothing may claim it was kept.
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByText(/saving your change/i)).toBeTruthy();
    expect(screen.queryByText(/^Saved ·/)).toBeNull();

    await debounce();

    // In the air. Still the same sentence, still no claim.
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/saving your change/i)).toBeTruthy();
    expect(screen.queryByText(/^Saved ·/)).toBeNull();

    await answer(gate, { storeName: "Ezurr Play" });

    expect(screen.getByText(/^Saved ·/)).toBeTruthy();
  });

  /**
   * A save that came back with something else is not a save. Without this the
   * screen agrees with itself and disagrees with the shop.
   */
  it("reports a failure when the server kept something different", async () => {
    render(<Harness save={async () => ({ storeName: "Something else" })} />);

    await press("edit");
    await debounce();

    expect(screen.getByText(/not saved/i)).toBeTruthy();
    expect(screen.getByText(/kept something different/i)).toBeTruthy();
  });

  /**
   * The queue used to be emptied before the await, so a rejected save lost the
   * change entirely — gone from the server, still on the screen, and the only
   * clue a red toast that removed itself after 2.8 seconds.
   */
  it("keeps the change and resends it when Try again is pressed", async () => {
    const save = vi
      .fn<Save>()
      .mockRejectedValueOnce(new ApiError("Server error", 500, null))
      .mockResolvedValueOnce({ storeName: "Ezurr Play" });

    render(<Harness save={save} />);

    await press("edit");
    await debounce();
    expect(screen.getByText(/not saved/i)).toBeTruthy();

    // Try again sends immediately — a press is not a keystroke, so it does not
    // wait out a debounce first.
    await press("Try again");

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toEqual({ storeName: "Ezurr Play" });
    expect(screen.getByText(/^Saved ·/)).toBeTruthy();
  });

  /** A dead network is not the same sentence as a refused request. */
  it("says so plainly when there is no internet", async () => {
    render(<Harness save={() => Promise.reject(new TypeError("Failed to fetch"))} />);

    await press("edit");
    await debounce();

    expect(screen.getByText(/no internet/i)).toBeTruthy();
    expect(screen.queryByText(/failed to fetch/i)).toBeNull();
  });

  /**
   * Anything typed while the request was in the air is still unsaved. Dropping
   * it because its own save came back is how an edit vanishes with a green tick
   * next to it.
   */
  it("does not discard a change made while the save was in flight", async () => {
    const gate = deferred<Record<string, unknown>>();
    const save = vi
      .fn<Save>()
      .mockImplementationOnce(() => gate.promise)
      .mockResolvedValue({ storeName: "Second thought" });

    render(<Harness save={save} />);

    await press("edit");
    await debounce();

    // The premise of this test, asserted rather than assumed: the first value
    // is on the wire before the second one is typed.
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ storeName: "Ezurr Play" });

    await press("edit again");

    // The second thought's own debounce falls due while that request is still
    // unanswered — the usual case, because a save slow enough to be re-typed
    // over is slow enough to outlast 600 ms. Nothing may be sent on top of a
    // request in flight, so this send is skipped and its timer is spent.
    await debounce();
    expect(save).toHaveBeenCalledTimes(1);

    await answer(gate, { storeName: "Ezurr Play" });

    // That request kept what it sent, so it succeeded — but the second thought
    // never went anywhere, so the screen must not say the shop has it.
    expect(screen.queryByText(/^Saved ·/)).toBeNull();
    expect(screen.getByText(/saving your change/i)).toBeTruthy();

    // Nothing else is going to send it: its debounce was spent while the
    // request was in the air. If coming back does not schedule another one, the
    // change sits queued until the owner happens to touch a different field —
    // and if he closes the tab first, it is gone.
    await debounce();

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toEqual({ storeName: "Second thought" });
    expect(screen.getByText(/^Saved ·/)).toBeTruthy();
  });

  /** The background settings sync is told what not to overwrite. */
  it("names the keys that are not on the server yet", async () => {
    const seen: string[][] = [];
    const gate = deferred<Record<string, unknown>>();
    render(<Harness save={() => gate.promise} onPendingKeysChange={(k) => seen.push(k)} />);

    await press("edit");
    expect(seen.at(-1)).toEqual(["storeName"]);

    await debounce();
    // Still ours to protect while the request is unanswered.
    expect(seen.at(-1)).toEqual(["storeName"]);

    await answer(gate, { storeName: "Ezurr Play" });
    expect(seen.at(-1)).toEqual([]);
  });
});
