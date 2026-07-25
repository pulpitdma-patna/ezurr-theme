"use client";

import { useEffect, useState } from "react";
import { useApiSettings } from "@/hooks/useApiSettings";

/**
 * Floating "chat on WhatsApp" launcher.
 *
 * Deliberately a plain deep-link (wa.me), not an embedded third-party chat SDK:
 * the storefront CSP uses strict-dynamic, and a vendor widget would need a
 * script exemption plus its own cookie/consent story. A link costs nothing,
 * loads nothing, and works on both mobile (app) and desktop (web.whatsapp).
 *
 * Renders only when an admin has enabled it AND supplied a number.
 */
export function WhatsAppWidget() {
  const { settings } = useApiSettings();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Avoid an SSR/client mismatch: settings hydrate on the client.
  useEffect(() => setMounted(true), []);

  const enabled = settings.whatsappWidgetEnabled;
  const digits = String(settings.whatsappNumber ?? "").replace(/\D+/g, "");
  if (!mounted || !enabled || !digits || dismissed) return null;

  // India default when the admin stored a bare 10-digit number.
  const e164 = digits.length === 10 ? `91${digits}` : digits;
  const greeting = settings.whatsappGreeting?.trim() || "Hi! I have a question about my order.";
  const href = `https://wa.me/${e164}?text=${encodeURIComponent(greeting)}`;

  return (
    <div className="fixed bottom-[88px] right-4 z-40 flex items-center gap-2 lg:bottom-6">
      <button
        type="button"
        aria-label="Hide WhatsApp chat"
        onClick={() => setDismissed(true)}
        className="grid h-7 w-7 place-items-center rounded-full border border-black/[0.08] bg-white/90 text-[13px] leading-none text-[#6E6E73] shadow-sm backdrop-blur transition hover:text-[#1D1D1F]"
      >
        ×
      </button>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex items-center gap-2.5 rounded-full bg-[#25D366] px-4 py-3 text-[14px] font-semibold text-white no-underline shadow-lg shadow-[#25D366]/25 transition hover:brightness-105 active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.480 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35Z" />
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.13.82.84-3.05-.2-.31a8.17 8.17 0 0 1-1.25-4.35c0-4.54 3.7-8.23 8.24-8.23a8.23 8.23 0 0 1 .01 16.45Z" />
        </svg>
        Chat with us
      </a>
    </div>
  );
}
