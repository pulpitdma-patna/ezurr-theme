import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  ShopifyConnectPanel,
  shopifyFailureMessage,
} from "@/components/admin/ShopifyConnectPanel";
import type { AdminIntegration } from "@/data/admin";
import { ApiError } from "@/lib/apiClient";

function shopify(overrides: Partial<AdminIntegration> = {}): AdminIntegration {
  return {
    id: "shopify",
    name: "Shopify",
    description: "Brings your products across.",
    status: "not_connected",
    enabled: true,
    fields: [],
    missingRequired: [],
    oauth: { supported: true, available: true, connected: false, shop: null },
    ...overrides,
  };
}

describe("ShopifyConnectPanel — before he has connected", () => {
  it("will not let him press Connect until the shop looks like a shop", () => {
    render(
      <ShopifyConnectPanel
        integration={shopify()}
        onStart={vi.fn()}
        onDisconnect={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    const button = screen.getByRole("button", { name: "Connect to Shopify" });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "mystore.example.com" },
    });
    expect(button).toBeDisabled();
    // A web address that is not Shopify's gets the address sentence…
    expect(screen.getByRole("alert")).toHaveTextContent(/not a Shopify one/i);

    // …and a bad shop NAME gets a different one. It used to get the address
    // sentence too, so a shopkeeper who typed "my store" — following the box's
    // own instruction to give just the name — was told he had pasted a web
    // address he never pasted.
    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "my store" },
    });
    expect(button).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/letters, numbers and hyphens/i);

    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "mystore" },
    });
    expect(button).toBeEnabled();
    // Once it resolves it is not a problem any more, so it stops being an alert.
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows him the address it will actually use", () => {
    render(
      <ShopifyConnectPanel
        integration={shopify()}
        onStart={vi.fn()}
        onDisconnect={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "https://admin.shopify.com/store/mystore/products" },
    });
    expect(screen.getByText("mystore.myshopify.com")).toBeInTheDocument();
  });

  it("sends the tidied-up shop and then leaves the page for Shopify", async () => {
    const onStart = vi.fn().mockResolvedValue("https://mystore.myshopify.com/admin/oauth/authorize?x=1");
    const navigate = vi.fn();
    render(
      <ShopifyConnectPanel
        integration={shopify()}
        onStart={onStart}
        onDisconnect={vi.fn()}
        navigate={navigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "  MyStore  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connect to Shopify" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    expect(onStart).toHaveBeenCalledWith("mystore.myshopify.com");
    expect(navigate).toHaveBeenCalledWith(
      "https://mystore.myshopify.com/admin/oauth/authorize?x=1",
    );
  });

  it("says what he can do about it when the shop cannot start the sign-in", async () => {
    const navigate = vi.fn();
    render(
      <ShopifyConnectPanel
        integration={shopify()}
        onStart={vi.fn().mockRejectedValue(new ApiError("Request failed", 409, null))}
        onDisconnect={vi.fn()}
        navigate={navigate}
      />,
    );

    fireEvent.change(screen.getByLabelText("Your Shopify shop"), {
      target: { value: "mystore" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Connect to Shopify" }));

    const alert = await screen.findByRole("alert");
    // Says plainly that it is not his job, without naming a server setting he
    // could neither reach nor pass on.
    expect(alert).toHaveTextContent(/not something you can do from here/i);
    expect(alert).not.toHaveTextContent("Request failed");
    expect(navigate).not.toHaveBeenCalled();
    // Still usable afterwards — a failed try must not strand him.
    expect(screen.getByRole("button", { name: "Connect to Shopify" })).toBeEnabled();
  });
});

describe("ShopifyConnectPanel — once he is connected", () => {
  const connected = shopify({
    status: "connected",
    lastSync: "2026-07-30T09:15:00.000Z",
    oauth: { supported: true, available: true, connected: true, shop: "mystore.myshopify.com" },
  });

  it("names the shop instead of asking for it again", () => {
    render(
      <ShopifyConnectPanel
        integration={connected}
        onStart={vi.fn()}
        onDisconnect={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.getByText("mystore.myshopify.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("Your Shopify shop")).not.toBeInTheDocument();
    expect(screen.getByText(/Last update from Shopify/i)).toBeInTheDocument();
  });

  it("asks first, and says the imported products are staying", async () => {
    const onDisconnect = vi.fn().mockResolvedValue(undefined);
    render(
      <ShopifyConnectPanel
        integration={connected}
        onStart={vi.fn()}
        onDisconnect={onDisconnect}
        navigate={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Disconnect Shopify" }));
    expect(onDisconnect).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent(/stay in your shop and keep selling/i);
    expect(dialog).toHaveTextContent(/disconnecting removes nothing/i);

    fireEvent.click(screen.getByRole("button", { name: "Yes, disconnect" }));
    await waitFor(() => expect(onDisconnect).toHaveBeenCalledTimes(1));
  });

  it("hides the disconnect button from staff who may only look", () => {
    render(
      <ShopifyConnectPanel
        integration={connected}
        readOnly
        onStart={vi.fn()}
        onDisconnect={vi.fn()}
        navigate={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Disconnect Shopify" })).not.toBeInTheDocument();
    expect(screen.getByText("mystore.myshopify.com")).toBeInTheDocument();
  });
});

describe("shopifyFailureMessage", () => {
  /**
   * These are the words ShopifyOAuthController actually sends, taken from the
   * controller and the module README rather than guessed. This test previously
   * asserted an invented vocabulary — `denied`, `invalid_hmac`, `not_configured`
   * — none of which the server has ever emitted, so it stayed green while eight
   * of the nine real failures fell through to the catch-all sentence. A test
   * that certifies a mismatch is worse than no test.
   */
  const SERVER_SLUGS = [
    "declined",
    "bad_shop",
    "expired",
    "shop_mismatch",
    "bad_signature",
    "exchange_failed",
    "not_available",
    "error",
  ];

  it("turns the server's one-word reason into something he can act on", () => {
    expect(shopifyFailureMessage("declined")).toMatch(/stopped before approving/i);
    expect(shopifyFailureMessage("bad_signature")).toMatch(/did not check out/i);
    expect(shopifyFailureMessage("not_available")).toMatch(/not something you can do from here/i);
    expect(shopifyFailureMessage("shop_mismatch")).toMatch(/different Shopify shop/i);
  });

  /** The catch-all is for a reason the server GROWS, not for eight it already has. */
  it("has its own sentence for every reason the server can send", () => {
    const fallback = shopifyFailureMessage("a_reason_that_does_not_exist");
    for (const slug of SERVER_SLUGS) {
      expect(shopifyFailureMessage(slug), `no sentence for "${slug}"`).not.toBe(fallback);
    }
  });

  it("never leaves a failure unexplained, or shows him the bare word", () => {
    for (const reason of [null, "", "something_new_the_server_added"]) {
      const message = shopifyFailureMessage(reason);
      expect(message.length).toBeGreaterThan(20);
      expect(message).not.toContain("_");
    }
  });
});
