import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { OrderAutosaveField } from "@/components/admin/OrderAutosaveField";

afterEach(cleanup);

describe("OrderAutosaveField", () => {
  /**
   * The courier is at the counter. He types the number and turns away. The old
   * screen needed him to find a Save button that also saved an unrelated note,
   * and answered with a banner that faded in a few seconds.
   */
  it("saves when he leaves the field, and says so where he can see it", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<OrderAutosaveField label="Courier tracking number" value="" onSave={save} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "4419112233" } });
    fireEvent.blur(input, { target: { value: "4419112233" } });

    await waitFor(() => expect(save).toHaveBeenCalledWith("4419112233"));
    await waitFor(() => expect(screen.getByText(/^Saved ·/)).toBeTruthy());
  });

  it("does not write when nothing changed", () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<OrderAutosaveField label="Note to self" value="ring him first" onSave={save} />);

    fireEvent.blur(screen.getByRole("textbox"), { target: { value: "ring him first" } });

    expect(save).not.toHaveBeenCalled();
  });

  /**
   * The contract that matters most: a failure never leaves the screen looking
   * like a success, and never eats what he typed.
   */
  it("keeps the typed number and says it did not save when the server refuses", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Your session has expired."));
    render(<OrderAutosaveField label="Courier tracking number" value="" onSave={save} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "4419112233" } });
    fireEvent.blur(input, { target: { value: "4419112233" } });

    await waitFor(() =>
      expect(screen.getByText(/Not saved — Your session has expired\./)).toBeTruthy(),
    );
    expect((input as HTMLInputElement).value).toBe("4419112233");
    expect(screen.queryByText(/^Saved ·/)).toBeNull();
  });

  it("tries again with what is still in the box", async () => {
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error("Couldn't reach the store server."))
      .mockResolvedValue(undefined);
    render(<OrderAutosaveField label="Courier tracking number" value="" onSave={save} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "4419112233" } });
    fireEvent.blur(input, { target: { value: "4419112233" } });

    await waitFor(() => expect(screen.getByText("Try again")).toBeTruthy());
    fireEvent.click(screen.getByText("Try again"));

    await waitFor(() => expect(screen.getByText(/^Saved ·/)).toBeTruthy());
    expect(save).toHaveBeenCalledTimes(2);
  });

  /** A reload must not quietly swallow the edit he is in the middle of. */
  it("does not overwrite an edit in progress when the order reloads", () => {
    const { rerender } = render(
      <OrderAutosaveField label="Note to self" value="old" onSave={vi.fn()} />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "half-typed" } });
    rerender(<OrderAutosaveField label="Note to self" value="from the server" onSave={vi.fn()} />);

    expect((input as HTMLInputElement).value).toBe("half-typed");
  });
});
