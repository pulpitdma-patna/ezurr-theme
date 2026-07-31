import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CheckoutSection } from "@/components/admin/settings/CheckoutSection";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";

afterEach(cleanup);

function settings(overrides: Partial<AdminSettings> = {}): AdminSettings {
  return { ...defaultAdminSettings, ...overrides };
}

describe("Checkout", () => {
  it("greys out the cash boxes while cash on delivery is off", () => {
    render(<CheckoutSection active settings={settings({ codEnabled: false })} patch={vi.fn()} />);

    expect(screen.getByLabelText(/Biggest order you will send on cash/i)).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText(/Advance to confirm a cash order/i)).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("tells him the lift switch does nothing until an advance exists", () => {
    // It used to sit two controls ABOVE the box it depends on and say "set an
    // advance below", which is an instruction, not a setting.
    render(
      <CheckoutSection
        active
        settings={settings({ codAdvance: 0, codAdvanceUnlocksCap: false })}
        patch={vi.fn()}
      />,
    );
    expect(screen.getByText(/Set an advance first/i)).toBeTruthy();
  });

  it("says which advance lifts the limit, in rupees, once one is set", () => {
    render(
      <CheckoutSection
        active
        settings={settings({ codAdvance: 500, codAdvanceUnlocksCap: true })}
        patch={vi.fn()}
      />,
    );
    expect(screen.getByText(/Once ₹500 is paid/i)).toBeTruthy();
    expect(screen.getByText(/the advance below lifts this limit/i)).toBeTruthy();
  });

  it("does not pretend a small order is charged for delivery", () => {
    // The checkout policy starts every cart at FREE / ₹0 and this setting only
    // changes the words under the amount. An owner who read the old "Free
    // delivery above ₹2,999" was under-collecting and could not see it.
    render(<CheckoutSection active settings={settings()} patch={vi.fn()} />);
    expect(screen.getByText(/nothing is added to the bill/i)).toBeTruthy();
  });

  it("holds the online discount inside what the server accepts", () => {
    const patch = vi.fn();
    render(<CheckoutSection active settings={settings()} patch={patch} />);

    fireEvent.change(screen.getByLabelText(/Discount for paying online/i), {
      target: { value: "90" },
    });

    expect(patch).toHaveBeenCalledWith({ prepaidDiscount: 50 });
  });

  it("no longer offers to change order numbers, which it could not do", () => {
    // Orders are numbered EZ-XXXXXXXX by the server, which never reads the
    // setting. The box changed nothing and its preview showed a number this
    // shop has never issued.
    const { container } = render(<CheckoutSection active settings={settings()} patch={vi.fn()} />);
    expect(container.textContent).not.toMatch(/order numbers/i);
    expect(container.textContent).not.toMatch(/EZX/);
  });
});
