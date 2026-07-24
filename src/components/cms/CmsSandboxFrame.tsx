"use client";

import { useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@/lib/apiClient";

/**
 * Renders admin-authored CMS custom code inside a cross-origin, opaque-origin
 * sandbox iframe. The code executes ONLY here — never in the storefront's own
 * document — because:
 *   • sandbox="allow-scripts" WITHOUT allow-same-origin → opaque origin, so the
 *     frame cannot read the storefront's cookies / localStorage / DOM.
 *   • the document is served cross-origin by the API with its own tight CSP.
 * The only cross-frame input we accept is a clamped height update.
 */

const MAX_SANDBOX_HEIGHT = 4000;

function sandboxOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_CMS_SANDBOX_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).origin;
    } catch {
      /* fall through */
    }
  }
  return getApiBaseUrl() ?? "";
}

export function CmsSandboxFrame({
  pageId,
  variant,
  blockId,
}: {
  pageId: string;
  variant: string;
  blockId: string;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  const origin = sandboxOrigin();
  const src = `${origin}/api/cms/sandbox/${encodeURIComponent(pageId)}/${encodeURIComponent(
    variant,
  )}/${encodeURIComponent(blockId)}`;

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Opaque-origin (sandboxed) frames report origin "null"; only accept the
      // height signal from OUR frame, and hard-clamp the value.
      if (
        e.source !== ref.current?.contentWindow ||
        e.origin !== "null" ||
        typeof e.data !== "object" ||
        e.data === null ||
        (e.data as { type?: unknown }).type !== "ezurr-sandbox-height"
      ) {
        return;
      }
      const h = Number((e.data as { height?: unknown }).height);
      if (Number.isFinite(h) && h > 0) {
        setHeight(Math.min(Math.round(h), MAX_SANDBOX_HEIGHT));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!origin) return null;

  return (
    <iframe
      ref={ref}
      src={src}
      title="Custom content"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      loading="lazy"
      className="w-full border-0"
      style={{ height, display: "block" }}
    />
  );
}
