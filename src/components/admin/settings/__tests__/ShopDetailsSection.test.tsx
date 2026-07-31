import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ShopDetailsSection } from "@/components/admin/settings/ShopDetailsSection";
import { StockSection } from "@/components/admin/settings/StockSection";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";

afterEach(cleanup);

function settings(overrides: Partial<AdminSettings> = {}): AdminSettings {
  return { ...defaultAdminSettings, ...overrides };
}

describe("Shop details", () => {
  it("keeps the chat switch with the number it needs", () => {
    // It used to live on the Checkout tab and its own description told him to
    // go and find this one: "Add a WhatsApp number under Shop details first".
    render(<ShopDetailsSection active settings={settings()} patch={vi.fn()} />);

    expect(screen.getByRole("switch", { name: /Show the chat button/i })).toBeTruthy();
    expect(screen.getByLabelText(/Number customers message/i)).toBeTruthy();
  });

  it("takes a phone number however he pastes it", () => {
    const patch = vi.fn();
    render(<ShopDetailsSection active settings={settings()} patch={patch} />);

    fireEvent.change(screen.getByLabelText(/Phone customers can call/i), {
      target: { value: "+91 98765 00000" },
    });

    expect(patch).toHaveBeenCalledWith({ supportPhone: "9198765000" });
  });

  it("warns about an address that cannot be an email, without blocking typing", () => {
    render(<ShopDetailsSection active settings={settings()} patch={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Email customers can write to/i), {
      target: { value: "hello@ezurr" },
    });

    expect(screen.getByRole("alert").textContent).toMatch(/doesn't look like an email/i);
  });

  it("says which name a bill will carry when a registered one is stored", () => {
    render(
      <ShopDetailsSection
        active
        settings={settings({ docBusinessName: "Ezurr Retail Pvt Ltd" })}
        patch={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ezurr Retail Pvt Ltd/)).toBeTruthy();
  });
});

describe("Stock", () => {
  it("no longer offers a currency or a time zone it cannot change", () => {
    // Nothing anywhere reads either value: every amount is printed in ₹ and
    // every admin time in IST. Setting "US dollars" moved no price.
    const { container } = render(<StockSection active settings={settings()} patch={vi.fn()} />);
    expect(container.textContent).not.toMatch(/currency/i);
    expect(container.textContent).not.toMatch(/time zone/i);
    expect(container.textContent).not.toMatch(/dollars|Dirhams/i);
  });

  it("says where the low-stock warning will show up, with his own number in it", () => {
    render(<StockSection active settings={settings({ lowStockThreshold: 3 })} patch={vi.fn()} />);
    expect(screen.getByText(/at 3 or fewer left/i)).toBeTruthy();
  });
});
