"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminIntegration } from "@/data/admin";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { ApiError } from "@/lib/apiClient";
import { normalizeShopDomain } from "@/lib/shopifyShop";

/**
 * Shopify, for an owner who has never opened a developer setting.
 *
 * What this replaces: three boxes, one of them asking for an "Admin API access
 * token", which is ten screens deep in Shopify and expires if you generate it
 * twice. He types the name of his shop instead and presses one button; Shopify
 * asks him to approve, the way approving anything else on Shopify works.
 *
 * This only ever renders when the server says it holds a Shopify app to approve.
 * Where it does not, the old form stays — a button that cannot work is worse
 * than the long way round.
 */
export function ShopifyConnectPanel({
  integration,
  onStart,
  onDisconnect,
  readOnly = false,
  navigate = (url: string) => window.location.assign(url),
}: {
  integration: AdminIntegration;
  /** Returns the address on Shopify to send him to. */
  onStart: (shop: string) => Promise<string>;
  onDisconnect: () => Promise<void>;
  /** Staff who may look but not change. They still see which shop it is. */
  readOnly?: boolean;
  /** Overridden in tests, which cannot navigate the page away. */
  navigate?: (url: string) => void;
}) {
  const oauth = integration.oauth;
  // A failed check leaves the row on needs_attention: he is still connected and
  // still wants to see which shop, so only a real disconnect brings the box back.
  const connected = Boolean(oauth?.connected) && integration.status !== "not_connected";

  if (connected) {
    return (
      <ConnectedPanel
        integration={integration}
        onDisconnect={onDisconnect}
        readOnly={readOnly}
      />
    );
  }

  return (
    <ConnectForm
      integration={integration}
      onStart={onStart}
      readOnly={readOnly}
      navigate={navigate}
    />
  );
}

function ConnectForm({
  integration,
  onStart,
  readOnly,
  navigate,
}: {
  integration: AdminIntegration;
  onStart: (shop: string) => Promise<string>;
  readOnly: boolean;
  navigate: (url: string) => void;
}) {
  const [typed, setTyped] = useState(() => storedShop(integration));
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  const shop = normalizeShopDomain(typed);

  async function start(event: React.FormEvent) {
    event.preventDefault();
    if (!shop || leaving) return;
    setError("");
    setLeaving(true);
    try {
      const authorizeUrl = await onStart(shop);
      // A whole-page move, not a fetch: the next screen is Shopify's own, on
      // Shopify's address, and it is meant to be — he should be able to see in
      // the address bar that he is approving this on Shopify and nowhere else.
      navigate(authorizeUrl);
    } catch (caught) {
      setError(startFailureMessage(caught));
      setLeaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void start(event)} className="space-y-4">
      <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
        Connect your Shopify shop
      </div>

      <p className="text-xs leading-relaxed text-[#6E6E73]">
        Type the name of your Shopify shop and press Connect. Shopify will ask you
        to approve, then bring you straight back here. There is nothing to copy
        out of Shopify.
      </p>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="shopify-shop"
          className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]"
        >
          Your Shopify shop
        </label>
        <input
          id="shopify-shop"
          aria-describedby="shopify-shop-hint"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            setError("");
          }}
          disabled={leaving || readOnly}
          autoComplete="off"
          spellCheck={false}
          placeholder="mystore"
          className={controlClass}
        />
        {/*
          Outside the label on purpose: it changes with every keystroke, and a
          box whose name is read out as its own changing hint is unusable to
          anyone listening to this screen rather than looking at it.
        */}
        <p id="shopify-shop-hint" className="text-[11px] leading-relaxed text-[#86868B]">
          {shop ? (
            <>
              We will open <span className="font-semibold text-[#1D1D1F]">{shop}</span>
            </>
          ) : typed.trim() ? (
            "That is not a Shopify shop address. It is the one ending in .myshopify.com, not your own website address."
          ) : (
            "Just the name is enough. You can also paste the whole address from the Shopify tab you have open."
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!shop || leaving || readOnly}
          className="h-9 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {leaving ? "Taking you to Shopify…" : "Connect to Shopify"}
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-[11px] leading-relaxed font-medium text-[#B42318]">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function ConnectedPanel({
  integration,
  onDisconnect,
  readOnly,
}: {
  integration: AdminIntegration;
  onDisconnect: () => Promise<void>;
  readOnly: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const shop = integration.oauth?.shop || storedShop(integration) || "your Shopify shop";

  async function disconnect() {
    setConfirming(false);
    setError("");
    setWorking(true);
    try {
      await onDisconnect();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.trim()
          ? caught.message.trim()
          : "Could not disconnect just now. Try again in a moment.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
        Connect your Shopify shop
      </div>

      <div className="rounded-xl border border-black/[0.08] bg-white p-4">
        <p className="text-xs leading-relaxed text-[#6E6E73]">
          Connected to <span className="font-semibold text-[#1D1D1F]">{shop}</span>.
        </p>
        <dl className="mt-3 border-t border-black/[0.06] pt-3">
          <dt className="ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            Last update from Shopify
          </dt>
          <dd className="mt-0.5 text-[11px] font-medium text-[#6E6E73]">
            {formatAdminDateTime(integration.lastSync, "Nothing has come across yet")}
          </dd>
        </dl>
        {integration.status === "needs_attention" ? (
          <p className="mt-3 text-[11px] leading-relaxed text-[#9A3412]">
            Something went wrong the last time your shop spoke to Shopify. Use Test
            connection below to see what.
          </p>
        ) : null}
      </div>

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={working}
            className="h-9 rounded-lg border border-black/[0.1] bg-white px-3.5 text-xs font-semibold text-[#B42318] disabled:opacity-40"
          >
            {working ? "Disconnecting…" : "Disconnect Shopify"}
          </button>
          <p className="text-[11px] leading-relaxed text-[#86868B]">
            Your approval stays saved, so connecting again is one press.
          </p>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-[11px] leading-relaxed font-medium text-[#B42318]">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={confirming}
        danger
        title="Stop bringing things across from Shopify?"
        // Both halves of this sentence are enforced on the server, and neither
        // used to be. Shopify is never told the owner disconnected — the
        // subscriptions live on its side and keep firing — so until the inbound
        // path started checking whether the shop is still switched on, a price he
        // had just corrected by hand was overwritten from a shop he thought was
        // off, and a product deleted over there still vanished from his
        // storefront. ShopifyDisconnectTest holds both.
        description="The products already brought across stay in your shop and keep selling — disconnecting removes nothing. They stop updating, so a price or stock change you make in Shopify will not reach here until you connect again."
        confirmLabel="Yes, disconnect"
        cancelLabel="Keep it connected"
        onConfirm={() => void disconnect()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

/** What he last saved as his shop address, so he does not retype it. */
function storedShop(integration: AdminIntegration): string {
  const field = integration.fields?.find((f) => f.key === "shop_domain");
  return field?.value ?? "";
}

/**
 * Why the button did not take him to Shopify, said as something he can do.
 *
 * "Request failed" is the message this used to be, and it leaves a shopkeeper
 * with a customer at the counter and nowhere to go.
 */
export function startFailureMessage(error: unknown): string {
  const status = error instanceof ApiError ? error.status : 0;

  if (status === 422) {
    return "Shopify did not recognise that shop. Check the address in your Shopify tab — it ends in .myshopify.com — and try again.";
  }
  if (status === 409) {
    return "This shop is not set up to connect to Shopify by button. Ask whoever set up your shop to finish that off.";
  }
  if (status === 401 || status === 403) {
    return "You are not allowed to change this. Ask the shop owner to connect Shopify.";
  }
  if (status === 429) {
    return "Too many tries in a row. Wait a minute and press Connect again.";
  }
  if (status >= 500) {
    return "Your shop hit a problem starting this. Nothing has changed — wait a moment and press Connect again.";
  }
  return "Could not reach your shop just now. Check the internet connection and press Connect again.";
}

/**
 * The one-word reason the server puts in the address, turned into a sentence.
 *
 * THESE KEYS ARE A CONTRACT. They are the nine words
 * ShopifyOAuthController can actually send, and nothing else. This map was
 * written against a guessed vocabulary — `state_mismatch`, `invalid_hmac`,
 * `access_denied`, thirteen more — and not one of them is a word the server
 * emits. Eight of the nine real failures therefore fell through to the catch-all
 * sentence, which tells the owner only that something went wrong and never which
 * thing, so the two cases he can actually fix himself — a mistyped shop, and
 * simply taking too long — read the same as a signature failure he cannot.
 *
 * A reason with no sentence here still gets one, because a bare word like
 * `bad_signature` must never reach him.
 */
export function shopifyFailureMessage(reason: string | null): string {
  const known: Record<string, string> = {
    // He pressed Cancel on Shopify's screen, or closed it. Not an error.
    declined:
      "You stopped before approving on Shopify, so nothing has changed. Press Connect when you are ready to try again.",
    bad_shop:
      "Shopify did not recognise that shop. Check the address in your Shopify tab — it ends in .myshopify.com — and try again.",
    // The nonce is good for fifteen minutes and for one trip only.
    expired:
      "That took too long, or it was started in another tab. Press Connect and go straight through.",
    shop_mismatch:
      "You approved a different Shopify shop from the one you typed. Press Connect and check the shop name.",
    bad_signature:
      "What came back from Shopify did not check out, so your shop stopped rather than trust it. Press Connect and start again from this page.",
    exchange_failed:
      "Shopify approved you, but the last step did not come through. Wait a minute and press Connect again.",
    not_available:
      "This shop is not set up to connect to Shopify by button yet. Ask whoever set up your shop to switch it on — or add your Shopify details by hand below.",
    error:
      "Your shop hit a problem finishing this. Nothing has changed — press Connect to try again.",
  };

  return (
    (reason ? known[reason] : undefined) ??
    "Shopify did not finish connecting, and nothing has changed. Press Connect to try again."
  );
}

/**
 * `updates_off` is the ninth reason, and it is NOT a failure — it is a
 * connection that worked with one thing left to mention, so it never reaches
 * the function above. See the success path in the integrations page.
 */
export const SHOPIFY_UPDATES_DELAYED =
  "Shopify is connected and your products are on their way in. Live updates could not be switched on, " +
  "so a price or stock change you make in Shopify may take up to fifteen minutes to show here.";

const controlClass =
  "w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none transition hover:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-60";
