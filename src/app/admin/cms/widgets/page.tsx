"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The widget marketplace is gone.
 *
 * Widgets only ever installed into the author's own browser, so a visitor could
 * never resolve one — every customer saw the words "Widget unavailable" where a
 * widget had been placed. Four of the ten bundled widgets were also broken by
 * the HTML sanitiser (a spacer whose only control was a stripped inline style, a
 * FAQ built from disallowed <details>, a newsletter form with no <form>).
 *
 * The route survives so existing bookmarks land somewhere sensible rather than
 * on a 404. Widget *blocks* already placed on a page still render a recoverable
 * card in the builder — see WidgetBlock in PageRenderer.
 */
export default function RetiredWidgetsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/cms");
  }, [router]);

  return (
    <div className="ez-mono py-10 text-center text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
      Widgets have been retired — redirecting to Pages…
    </div>
  );
}
