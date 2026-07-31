"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

/**
 * Site-wide custom code is not available.
 *
 * Both fields that used to live here were fiction. Global JS had zero read
 * sites anywhere in the app — nothing has ever executed it. Global CSS was read
 * by CmsCodeInjector from `localStorage`, but from the *visitor's* localStorage,
 * which is always empty, so it never reached a customer either. The Save button
 * only fired a toast.
 *
 * Rather than keep two textareas that quietly do nothing, this says so and
 * points at the two places custom code genuinely works today.
 */
export default function AdminCmsCodePage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Code for the whole site"
        description="Not available — here is what does work instead."
      />

      <div className="rounded-2xl border border-black/[0.07] bg-white p-6">
        <p className="m-0 text-sm font-semibold text-[#1D1D1F]">
          Site-wide code isn&apos;t available yet
        </p>
        <p className="m-0 mt-2 max-w-[62ch] text-[13px] leading-relaxed text-[#6E6E73]">
          This screen used to accept CSS and JavaScript that never reached your
          customers — it was only ever stored in the browser you typed it into.
          It has been removed rather than left looking like it works.
        </p>

        <p className="m-0 mt-5 text-[13px] font-semibold text-[#1D1D1F]">
          What works today
        </p>
        <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-[#6E6E73]">
          <li>
            <strong className="text-[#1D1D1F]">Styling one page</strong> — open
            the page, then <em>Page code</em> in the top bar. That CSS is saved
            with the page and does render on the live site.
          </li>
          <li>
            <strong className="text-[#1D1D1F]">Embeds and scripts</strong> — add
            a <em>Custom HTML</em> section. Its code runs inside an isolated
            frame on the live page, so it cannot read customer data or interfere
            with checkout.
          </li>
          <li>
            <strong className="text-[#1D1D1F]">Colours and fonts</strong> —{" "}
            <Link
              href="/admin/settings#appearance"
              className="font-semibold text-[#1D1D1F] underline"
            >
              in Shop settings
            </Link>
            , with no code at all.
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/cms"
          className="rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F5F5F7]"
        >
          ← Website
        </Link>
      </div>
    </div>
  );
}
