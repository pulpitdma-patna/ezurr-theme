"use client";

import type { ReactNode } from "react";
import { AdminPageHeader, type BreadcrumbItem } from "@/components/admin/AdminPageHeader";
import { Phase2Banner, Phase2Badge } from "@/components/admin/Phase2Badge";

const DEFAULT_PLANNED = [
  "Replace localStorage with API persistence",
  "Server-enforced authZ / SSO",
  "Provider webhooks & delivery queues",
];

/** Shared chrome for Phase 2 UI-preview pages. */
export function Phase2PageShell({
  title,
  description,
  breadcrumbs,
  actions,
  bannerTitle,
  bannerDescription,
  planned = DEFAULT_PLANNED,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  bannerTitle?: string;
  bannerDescription?: string;
  planned?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Phase2Badge />
            {actions}
          </div>
        }
      />
      <Phase2Banner title={bannerTitle} description={bannerDescription} />
      {planned.length > 0 ? (
        <div className="mb-5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3">
          <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
            What&apos;s planned
          </div>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {planned.map((item) => (
              <li key={item} className="flex gap-2 text-xs text-[#6E6E73]">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#AEAEB2]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {children}
    </div>
  );
}
