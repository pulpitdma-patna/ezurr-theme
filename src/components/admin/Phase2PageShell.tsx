"use client";

import type { ReactNode } from "react";
import { AdminPageHeader, type BreadcrumbItem } from "@/components/admin/AdminPageHeader";
import { Phase2Badge } from "@/components/admin/Phase2Badge";

/** Shared chrome for Phase 2 UI-preview pages. */
export function Phase2PageShell({
  title,
  description,
  breadcrumbs,
  actions,
  children,
}: {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
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
      {children}
    </div>
  );
}
