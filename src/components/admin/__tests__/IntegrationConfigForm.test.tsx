import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { IntegrationConfigForm } from "@/components/admin/IntegrationConfigForm";
import type { AdminIntegration, AdminIntegrationField } from "@/data/admin";

afterEach(cleanup);

/** `advanced` is served by the API but not yet on the shared field type. */
function field(overrides: Partial<AdminIntegrationField> & { advanced?: boolean }) {
  return {
    key: "key",
    label: "Key ID (from your Razorpay dashboard)",
    type: "text",
    scope: "config",
    required: true,
    secret: false,
    readOnly: false,
    envVar: null,
    help: null,
    configured: false,
    viaFallback: false,
    value: null,
    ...overrides,
  } as AdminIntegrationField;
}

function integration(overrides: Partial<AdminIntegration> = {}): AdminIntegration {
  return {
    id: "razorpay",
    name: "Razorpay",
    category: "payments",
    description: "Payments",
    status: "needs_attention",
    enabled: true,
    fields: [
      field({}),
      field({
        key: "secret",
        label: "Key Secret (from your Razorpay dashboard)",
        type: "password",
        scope: "credential",
        secret: true,
      }),
      field({
        key: "webhook_secret",
        label: "Webhook secret (from your Razorpay dashboard)",
        type: "password",
        scope: "credential",
        required: false,
        secret: true,
        configured: true,
        advanced: true,
      }),
    ],
    missingRequired: ["key", "secret"],
    ...overrides,
  };
}

describe("IntegrationConfigForm", () => {
  it("keeps the draft when save rejects", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    render(<IntegrationConfigForm integration={integration()} saving={false} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/key id/i), { target: { value: "rzp_test" } });
    fireEvent.change(screen.getByPlaceholderText(/paste the value/i), {
      target: { value: "super-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect((screen.getByLabelText(/key id/i) as HTMLInputElement).value).toBe("rzp_test");
    expect((screen.getByPlaceholderText(/paste the value/i) as HTMLInputElement).value).toBe(
      "super-secret",
    );
  });

  it("sends null when clearing an optional stored secret", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<IntegrationConfigForm integration={integration()} saving={false} onSave={onSave} />);

    fireEvent.click(screen.getByText("Clear"));
    // The point of this line is that pressing Clear warns him BEFORE he saves,
    // not the exact sentence it warns with — "will clear the stored value" was
    // the old wording and this assertion was pinning it in place.
    expect(screen.getByText(/wipe what is stored/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      config: {},
      credentials: { webhook_secret: null },
    });
  });

  /**
   * Two boxes matter on a payment card; the other two exist because a support
   * agent might one day ask for them. Mixing them made a four-field form read
   * like a ten-field one, which is most of why this screen felt like a
   * developer's.
   */
  it("folds the rarely-touched fields away", () => {
    render(
      <IntegrationConfigForm integration={integration()} saving={false} onSave={vi.fn()} />,
    );

    const disclosure = screen.getByText("Only if someone told you to").closest("details");
    expect(disclosure).toBeTruthy();
    expect(disclosure?.open).toBe(false);
    const advanced = document.getElementById("integration-field-webhook_secret");
    const everyday = document.getElementById("integration-field-key");
    expect(disclosure?.contains(advanced)).toBe(true);
    // The two that matter are not inside it.
    expect(disclosure?.contains(everyday)).toBe(false);
  });

  /** Someone who may look but not change is offered nothing to press. */
  it("offers no save button when the viewer cannot write", () => {
    render(
      <IntegrationConfigForm
        integration={integration()}
        saving={false}
        readOnly
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /^save$/i })).toBeNull();
    expect((screen.getByLabelText(/key id/i) as HTMLInputElement).disabled).toBe(true);
  });
});
