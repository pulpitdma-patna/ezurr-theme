"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/hooks/useAuthSession";

/** Redirects unsigned visitors to auth with a return path. */
export function AccountAuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      const next = encodeURIComponent(pathname || "/account");
      router.replace(`/auth?next=${next}`);
    }
  }, [ready, session, router, pathname]);

  if (!ready || !session) {
    return (
      <div className="ez-page flex min-h-[40vh] items-center justify-center py-16">
        <p className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          Checking session…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
