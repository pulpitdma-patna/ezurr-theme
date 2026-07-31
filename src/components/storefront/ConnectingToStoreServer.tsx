"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiOriginPasteForm } from "@/components/storefront/ApiOriginPasteForm";
import {
  clearSameOriginApiDiscovered,
  getApiUrlOverride,
  isEzurrHealthBody,
  markSameOriginApiDiscovered,
  probeSameOriginApiHealth,
} from "@/lib/apiOrigin";

async function probeAbsoluteHealth(origin: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/api/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return false;
    return isEzurrHealthBody(await res.json());
  } catch {
    return false;
  }
}

/**
 * Shown on the homepage when the theme cannot reach a live Laravel API.
 * Probes same-origin `/api/health` first, then offers a one-time paste override.
 */
export function ConnectingToStoreServer({
  reason,
}: {
  reason: "missing_url" | "unreachable" | "http_error";
}) {
  const router = useRouter();
  const [probing, setProbing] = useState(true);
  const [pasteError, setPasteError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProbing(true);
      setPasteError("");

      const override = getApiUrlOverride();
      if (override) {
        const ok = await probeAbsoluteHealth(override);
        if (cancelled) return;
        if (ok) {
          router.refresh();
          router.push("/setup");
          return;
        }
        setPasteError(
          "Saved API origin did not answer with Ezurr health JSON. Check the URL, CORS_ORIGINS, and that /install is green.",
        );
        setProbing(false);
        return;
      }

      const same = await probeSameOriginApiHealth();
      if (cancelled) return;
      if (same) {
        markSameOriginApiDiscovered();
        router.refresh();
        router.push("/setup");
        return;
      }
      clearSameOriginApiDiscovered();
      setProbing(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, tick]);

  const copy =
    reason === "missing_url"
      ? {
          title: "Store server address missing",
          body: "This storefront build has no NEXT_PUBLIC_API_URL, or the proxy is not live yet. We tried same-origin /api/health — paste your Laravel API origin below, or set the env and redeploy.",
        }
      : reason === "http_error"
        ? {
            title: "Store server not answering correctly",
            body: "The API URL is set, but install/state did not return JSON. On Cloudways, point the web root at Laravel’s public/ folder, run php artisan ezurr:install, then open https://your-api-host/install — or paste the correct API origin below.",
          }
        : {
            title: "Connecting to store server",
            body: "The storefront cannot reach the API yet. Finish the backend installer on the API host (/install should be green). If the proxy is miswired, paste the API origin below.",
          };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--ez-warm-surface)] px-5 py-16">
      <div className="mx-auto w-full max-w-[34rem]">
        <p className="ez-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ez-accent-text)]">
          Frontend · waiting on API
        </p>
        <h1 className="mt-3 text-[clamp(1.7rem,3.5vw,2.3rem)] font-semibold tracking-[-0.045em] text-[var(--ez-ink)]">
          {copy.title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ez-muted)]">{copy.body}</p>
        {probing ? (
          <p className="mt-6 ez-mono animate-pulse text-[11px] uppercase tracking-[0.16em] text-[var(--ez-subtle)]">
            Checking API health…
          </p>
        ) : (
          <>
            {pasteError ? (
              <p role="alert" className="mt-4 text-[13px] text-[#B42318]">
                {pasteError}
              </p>
            ) : null}
            <ApiOriginPasteForm
              onSaved={() => {
                setProbing(true);
                setTick((n) => n + 1);
              }}
            />
          </>
        )}
        <p className="mt-6 text-[13px] leading-relaxed text-[var(--ez-subtle)]">
          Backend prepare and storefront claim are separate. Claim only after the
          API install console is green — then open <code className="ez-mono">/setup</code>.
        </p>
      </div>
    </main>
  );
}
