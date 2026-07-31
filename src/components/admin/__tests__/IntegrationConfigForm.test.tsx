import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { IntegrationConfigForm } from "@/components/admin/IntegrationConfigForm";
import type { AdminIntegration } from "@/data/admin";

afterEach(cleanup);

function integration(overrides: Partial<AdminIntegration> = {}): AdminIntegration {
  return {
    id: "razorpay",
    name: "Razorpay",
    category: "payments",
    description: "Payments",
    status: "needs_attention",
    enabled: true,
    fields: [
      {
        key: "key",
        label: "Key id",
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
      },
      {
        key: "secret",
        label: "Key secret",
        type: "password",
        scope: "credential",
        required: true,
        secret: true,
        readOnly: false,
        envVar: null,
        help: null,
        configured: false,
        viaFallback: false,
        value: null,
      },
      {
        key: "webhook_secret",
        label: "Webhook signing secret",
        type: "password",
        scope: "credential",
        required: false,
        secret: true,
        readOnly: false,
        envVar: null,
        help: null,
        configured: true,
        viaFallback: false,
        value: null,
      },
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
    fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));

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
    expect(screen.getByText(/will clear the stored value/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /save configuration/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      config: {},
      credentials: { webhook_secret: null },
    });
  });
});
