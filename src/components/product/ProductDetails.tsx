"use client";

import { useEffect, useState } from "react";
import { api, isApiEnabled } from "@/lib/apiClient";
import { sanitizeHtml } from "@/lib/cms/sanitizeHtml";

type Policy = { title: string; body: string };

/**
 * Full product description + the store's shipping/returns policies (fetched
 * once from the API) rendered as a details/accordion block below the buy box.
 * All HTML is sanitised before render.
 */
export function ProductDetails({ descriptionHtml }: { descriptionHtml?: string }) {
  const [policies, setPolicies] = useState<{ shipping?: Policy; returns?: Policy }>({});

  useEffect(() => {
    if (!isApiEnabled()) return;
    let cancelled = false;
    void api
      .policies()
      .then((p) => {
        if (!cancelled) setPolicies(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const desc = (descriptionHtml ?? "").trim();
  const sections = [
    { key: "shipping", label: "Shipping & delivery", body: policies.shipping?.body },
    { key: "returns", label: "Returns & refunds", body: policies.returns?.body },
  ].filter((s) => (s.body ?? "").trim().length > 0);

  if (!desc && sections.length === 0) return null;

  return (
    <section className="ez-page mx-auto w-full max-w-none border-t border-[#E8E8ED] bg-white pb-8 pt-7 sm:pb-12 sm:pt-9 xl:max-w-[1520px] 2xl:max-w-[1680px]">
      <div className="mx-auto w-full max-w-[920px] lg:max-w-[1100px] xl:max-w-[1200px]">
        {desc ? (
          <div className="pb-7 sm:pb-9">
            <h2 className="ez-mono mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
              Product details
            </h2>
            <div
              className="prose prose-neutral max-w-none text-[15px] leading-[1.65] text-[#424245] [&_a]:text-[#111113] [&_a]:underline [&_img]:rounded-xl [&_li]:my-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc) }}
            />
          </div>
        ) : null}

        {sections.length > 0 ? (
          <div className="overflow-hidden rounded-[18px] border border-[#E8E8ED]">
            {sections.map((s, i) => (
              <details
                key={s.key}
                className={`group bg-[#FAFAFB] transition-colors hover:bg-[#F5F5F7] ${i > 0 ? "border-t border-[#E8E8ED]" : ""}`}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-semibold text-[#111113] sm:px-6 [&::-webkit-details-marker]:hidden">
                  {s.label}
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[18px] font-normal leading-none text-[#86868B] shadow-[0_1px_3px_rgba(17,17,19,0.06)] transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div
                  className="prose prose-sm prose-neutral max-w-none border-t border-[#E8E8ED] bg-white px-5 pb-5 pt-4 text-[14px] leading-relaxed text-[#6E6E73] sm:px-6 sm:pb-6 [&_a]:text-[#111113] [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(s.body ?? "") }}
                />
              </details>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
