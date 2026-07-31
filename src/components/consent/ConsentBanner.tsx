"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getConsent, setConsent, subscribeConsent, type Consent } from "@/lib/consent";

/** Cookie-consent banner. Shows only when consent is unset; marketing/analytics
 *  tags load only after "Accept". Default posture is decline. */
export function ConsentBanner() {
  const [consent, setLocal] = useState<Consent>("granted"); // avoid flash before hydration
  const pathname = usePathname();

  useEffect(() => {
    const update = () => setLocal(getConsent());
    update();
    return subscribeConsent(update);
  }, []);

  // Not in the back office. This asks a SHOPPER whether the shop may measure
  // their visit; asking the owner for consent to analytics on his own admin is
  // both meaningless and, since it floats bottom-centre over the content, in the
  // way of the work. It lives in the root layout, which the admin also uses.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/setup")) return null;

  if (consent !== "unset") return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[680px] rounded-2xl border border-black/[0.08] bg-white/95 p-4 shadow-[0_16px_48px_rgba(17,17,19,0.16)] backdrop-blur-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="m-0 text-[13px] leading-relaxed text-[#424245]">
          We use cookies for analytics to understand how the store is used and improve it. You can
          accept or decline — essential features work either way.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setConsent("denied")}
            className="rounded-full border border-[#D2D2D7] px-4 py-2 text-[13px] font-semibold text-[#1D1D1F] transition hover:border-[#1D1D1F]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => setConsent("granted")}
            className="rounded-full bg-[#111113] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#2C2C2E]"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
