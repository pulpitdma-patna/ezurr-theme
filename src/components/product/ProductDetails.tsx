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
    <section className="ez-page w-full pb-6 pt-2 sm:pb-10">
      <div className="mx-auto max-w-[820px]">
        {desc ? (
          <div className="pb-8">
            <h2 className="ez-mono mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
              Product details
            </h2>
            <div
              className="prose prose-neutral max-w-none text-[15px] leading-relaxed text-[#424245] [&_a]:text-[#111113] [&_a]:underline [&_img]:rounded-xl [&_li]:my-1"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(desc) }}
            />
          </div>
        ) : null}

        {sections.length > 0 ? (
          <div className="divide-y divide-[#E8E8ED] border-y border-[#E8E8ED]">
            {sections.map((s) => (
              <details key={s.key} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-[15px] font-semibold text-[#111113] [&::-webkit-details-marker]:hidden">
                  {s.label}
                  <span
                    aria-hidden
                    className="text-[20px] font-normal leading-none text-[#86868B] transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div
                  className="prose prose-sm prose-neutral max-w-none pb-5 text-[14px] leading-relaxed text-[#6E6E73] [&_a]:text-[#111113] [&_a]:underline"
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
