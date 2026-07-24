"use client";

import { useEffect } from "react";
import { useCmsGlobalCode } from "@/hooks/useCmsStore";

/**
 * Injects admin-authored CSS into the storefront <head>. CSS only — never JS.
 *
 * Admin-authored JavaScript is NEVER executed in the storefront document: that
 * would be arbitrary code execution against every visitor. Custom code runs
 * exclusively inside the cross-origin, opaque-origin sandbox iframe served by
 * the API (see CmsSandboxFrame). This component intentionally has no JS path.
 */

type CmsCodeInjectorProps = {
  pageCss?: string;
  blockCss?: string;
};

export function CmsCodeInjector({
  pageCss = "",
  blockCss = "",
}: CmsCodeInjectorProps) {
  const global = useCmsGlobalCode();

  useEffect(() => {
    const styleId = "ezurr-cms-styles";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = [global.headCss, pageCss, blockCss].filter(Boolean).join("\n\n");
    return () => {
      /* keep styles until next paint; replaced on update */
    };
  }, [global.headCss, pageCss, blockCss]);

  return null;
}
