import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { InvoiceSection } from "@/components/admin/settings/InvoiceSection";
import { defaultAdminSettings, type AdminSettings } from "@/data/admin";

afterEach(cleanup);

function settings(overrides: Partial<AdminSettings> = {}): AdminSettings {
  return { ...defaultAdminSettings, ...overrides };
}

describe("GST & invoices", () => {
  it("shows one GST box, not two", () => {
    render(<InvoiceSection active settings={settings()} patch={vi.fn()} />);
    expect(screen.getAllByLabelText(/GST number/i)).toHaveLength(1);
  });

  it("writes both stored GST numbers from that one box", () => {
    // The bill prints docGstin and only falls back to gstin. Writing one of them
    // is how a corrected number ends up on the screen and the old one on the
    // paper the customer takes home.
    const patch = vi.fn();
    render(<InvoiceSection active settings={settings()} patch={patch} />);

    fireEvent.change(screen.getByLabelText(/GST number/i), {
      target: { value: " 29aabce1234f1z5 " },
    });

    expect(patch).toHaveBeenCalledWith({
      docGstin: "29AABCE1234F1Z5",
      gstin: "29AABCE1234F1Z5",
    });
  });

  it("shows the number the bill will actually print when the two disagree", () => {
    const box = render(
      <InvoiceSection
        active
        settings={settings({ gstin: "OLDNUMBER00000", docGstin: "29AABCE1234F1Z5" })}
        patch={vi.fn()}
      />,
    );
    const input = box.container.querySelector<HTMLInputElement>("input.ez-mono");
    expect(input?.value).toBe("29AABCE1234F1Z5");
  });

  it("says out loud that bills go out bare when no GST number is stored", () => {
    render(<InvoiceSection active settings={settings({ gstin: "", docGstin: "" })} patch={vi.fn()} />);
    expect(screen.getByText(/without a GST number/i)).toBeTruthy();
  });

  it("names the consequence of an empty state, where the tax split is decided", () => {
    render(<InvoiceSection active settings={settings({ docState: "" })} patch={vi.fn()} />);
    expect(screen.getByText(/every bill has to charge IGST/i)).toBeTruthy();
  });

  it("names who gets CGST + SGST once a state is filled in", () => {
    render(<InvoiceSection active settings={settings({ docState: "Karnataka" })} patch={vi.fn()} />);
    expect(screen.getByText(/A customer in Karnataka is billed CGST \+ SGST/i)).toBeTruthy();
  });

  it("keeps the set-once wording folded away", () => {
    const { container } = render(<InvoiceSection active settings={settings()} patch={vi.fn()} />);
    const details = container.querySelector("details");
    expect(details).toBeTruthy();
    expect(details?.open).toBe(false);
    expect(details?.textContent).toContain("Bill numbers start with");
  });

  it("tells him which shop name a bill falls back to", () => {
    render(
      <InvoiceSection
        active
        settings={settings({ docBusinessName: "", storeName: "Patna Game Point" })}
        patch={vi.fn()}
      />,
    );
    expect(screen.getByText(/bills print your shop name, “Patna Game Point”/i)).toBeTruthy();
  });
});
