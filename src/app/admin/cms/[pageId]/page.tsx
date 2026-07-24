"use client";

import { use } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { PageBuilder } from "@/components/admin/cms/PageBuilder";
import { isApiEnabled } from "@/lib/apiClient";

export default function AdminCmsBuilderPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);
  return (
    <div>
      {isApiEnabled() ? (
        <AdminNotice tone="demo">
          Page edits are saved to this browser (localStorage) only — not to the
          live server yet.
        </AdminNotice>
      ) : null}
      <PageBuilder pageId={pageId} />
    </div>
  );
}
