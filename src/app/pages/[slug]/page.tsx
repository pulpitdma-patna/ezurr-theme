"use client";

import { use } from "react";
import { StorefrontCmsPage } from "@/components/cms/StorefrontCmsPage";

export default function CmsLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return <StorefrontCmsPage pageId={slug} notFoundFallback />;
}
