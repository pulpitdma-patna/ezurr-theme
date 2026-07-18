"use client";

import { use } from "react";
import { PageBuilder } from "@/components/admin/cms/PageBuilder";

export default function AdminCmsBuilderPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);
  return <PageBuilder pageId={pageId} />;
}
