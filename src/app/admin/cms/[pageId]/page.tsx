"use client";

import { use } from "react";
import { PageBuilder } from "@/components/admin/cms/PageBuilder";

export default function AdminCmsBuilderPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);

  // No banner explaining where edits go. The save chip in the builder's top bar
  // reports the real state ("Saving…", "Saved 3:41 pm", "Not saved · Retry"),
  // and a banner is exactly what let the old build claim edits were
  // browser-only long after that stopped being true.
  return <PageBuilder pageId={pageId} />;
}
