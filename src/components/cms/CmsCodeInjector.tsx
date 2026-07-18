"use client";

import { useEffect } from "react";
import { useCmsGlobalCode } from "@/hooks/useCmsStore";

type CmsCodeInjectorProps = {
  pageCss?: string;
  pageJs?: string;
  blockCss?: string;
  /** Skip JS injection in builder canvas */
  allowJs?: boolean;
};

export function CmsCodeInjector({
  pageCss = "",
  pageJs = "",
  blockCss = "",
  allowJs = true,
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

  useEffect(() => {
    if (!allowJs) return;
    const scripts: HTMLScriptElement[] = [];
    const run = (code: string, id: string) => {
      if (!code.trim()) return;
      const prev = document.getElementById(id);
      prev?.remove();
      const script = document.createElement("script");
      script.id = id;
      script.type = "text/javascript";
      script.text = code;
      document.body.appendChild(script);
      scripts.push(script);
    };
    run(global.footerJs, "ezurr-cms-js-global");
    run(pageJs, "ezurr-cms-js-page");
    return () => {
      scripts.forEach((s) => s.remove());
    };
  }, [allowJs, global.footerJs, pageJs]);

  return null;
}
