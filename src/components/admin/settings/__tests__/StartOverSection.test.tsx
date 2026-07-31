import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { StartOverSection } from "@/components/admin/settings/StartOverSection";

afterEach(cleanup);

const contents = { products: 24, orders: 8, customers: 5, coupons: 2, checkoutRules: 1 };

describe("Start over", () => {
  it("lists what is about to go, counted, before anything is pressed", () => {
    render(<StartOverSection active contents={contents} onReset={vi.fn()} />);

    expect(screen.getByText("24 products")).toBeTruthy();
    expect(screen.getByText("8 orders")).toBeTruthy();
    expect(screen.getByText("1 checkout exception")).toBeTruthy();
    // The one the old copy never mentioned.
    expect(screen.getByText("the home page and custom code in Website")).toBeTruthy();
  });

  it("does not delete anything on the first press", () => {
    const onReset = vi.fn();
    render(<StartOverSection active contents={contents} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("names the same things again inside the confirmation", () => {
    render(<StartOverSection active contents={contents} onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("24 products");
    expect(dialog.textContent).toContain("the home page and custom code in Website");
    expect(dialog.textContent).toContain("no customer is affected and no money moves");
  });

  it("deletes only after the confirmation is taken", () => {
    const onReset = vi.fn();
    render(<StartOverSection active contents={contents} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete and start over" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("keeps everything when he backs out", () => {
    const onReset = vi.fn();
    render(<StartOverSection active contents={contents} onReset={onReset} />);

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep what's here" }));

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("renders nothing at all when another tab is open", () => {
    const { container } = render(
      <StartOverSection active={false} contents={contents} onReset={vi.fn()} />,
    );
    expect(container.textContent).toBe("");
  });
});
