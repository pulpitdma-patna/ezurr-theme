"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const accountLinks = [
  { href: "/account", label: "Overview", icon: "⌂" },
  { href: "/account/orders", label: "Orders", icon: "□" },
  { href: "/account/wishlist", label: "Wishlist", icon: "♡" },
  { href: "/account/addresses", label: "Addresses", icon: "⌖" },
  { href: "/account/profile", label: "Profile", icon: "○" },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="ez-page py-8 sm:py-12 lg:py-16">
      <div className="mb-8 flex items-center gap-4 lg:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D1D1F] text-sm font-semibold text-white">
          AP
        </div>
        <div>
          <div className="font-semibold tracking-[-0.02em]">Arjun Patel</div>
          <div className="ez-mono mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
            +91 98765 43210
          </div>
        </div>
      </div>

      <div className="ez-scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:hidden">
        {accountLinks.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                active ? "bg-[#1D1D1F] text-white hover:!text-white" : "bg-[#F5F5F7] text-[#424245]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-28 overflow-hidden rounded-[28px] border border-black/[0.07] bg-[#F7F7F8] p-4">
            <div className="flex items-center gap-3 border-b border-black/[0.06] p-3 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D1D1F] text-sm font-semibold text-white">
                AP
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold tracking-[-0.02em]">Arjun Patel</div>
                <div className="ez-mono mt-0.5 text-[8px] uppercase tracking-[0.1em] text-[#86868B]">
                  +91 98765 43210
                </div>
              </div>
            </div>

            <nav className="mt-3 flex flex-col gap-1" aria-label="Account">
              {accountLinks.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-white text-[#1D1D1F] shadow-sm"
                        : "text-[#6E6E73] hover:bg-white/70 hover:text-[#1D1D1F]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                        active ? "bg-[#1D1D1F] text-white" : "bg-white text-[#6E6E73]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/auth"
              className="mt-3 flex items-center gap-3 border-t border-black/[0.06] px-4 pt-5 text-sm font-medium text-[#B42318] hover:!text-[#B42318]"
            >
              Sign out
            </Link>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
