"use client";

import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useCmsGlobalCode } from "@/hooks/useCmsStore";
import { updateCmsGlobalCode } from "@/lib/adminStore";

export default function AdminCmsCodePage() {
  const code = useCmsGlobalCode();
  const toast = useAdminToast();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Custom code"
        description="Site-wide CSS and JavaScript injected on every CMS-powered storefront page."
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Demo only — saved to this browser (localStorage), not the live server, and
        JS is not sandboxed. Prefer page-level or block-scoped CSS when possible.
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block rounded-2xl border border-black/[0.07] bg-white p-5">
          <span className="text-sm font-semibold text-[#1D1D1F]">Global CSS</span>
          <textarea
            className="mt-3 w-full min-h-[280px] rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-xs outline-none focus:border-[#1D1D1F]"
            value={code.headCss}
            onChange={(e) => updateCmsGlobalCode({ headCss: e.target.value })}
            placeholder={`/* Example */\n.ez-section-title { letter-spacing: -0.04em; }`}
          />
        </label>
        <label className="block rounded-2xl border border-black/[0.07] bg-white p-5">
          <span className="text-sm font-semibold text-[#1D1D1F]">Global JS</span>
          <textarea
            className="mt-3 w-full min-h-[280px] rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-xs outline-none focus:border-[#1D1D1F]"
            value={code.footerJs}
            onChange={(e) => updateCmsGlobalCode({ footerJs: e.target.value })}
            placeholder={`// Example\nconsole.log("Ezurr CMS ready");`}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => toast.push("Custom code saved to local store", "success")}
          className="rounded-xl bg-[#1D1D1F] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Save
        </button>
        <Link
          href="/admin/cms"
          className="rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F5F5F7]"
        >
          ← Pages
        </Link>
        <Link
          href="/admin/settings#appearance"
          className="rounded-xl border border-black/[0.1] bg-white px-4 py-2.5 text-sm font-semibold hover:bg-[#F5F5F7]"
        >
          Appearance →
        </Link>
      </div>
    </div>
  );
}
