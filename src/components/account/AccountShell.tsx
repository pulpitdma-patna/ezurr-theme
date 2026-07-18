"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, formatMobileDisplay } from "@/lib/auth";
import { useAuthSession } from "@/hooks/useAuthSession";

const accountLinks = [
  { href: "/account", label: "Overview", match: (p: string) => p === "/account" },
  {
    href: "/account/orders",
    label: "Orders",
    match: (p: string) => p.startsWith("/account/orders"),
  },
  {
    href: "/account/digital",
    label: "Digital vault",
    match: (p: string) => p.startsWith("/account/digital"),
  },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    match: (p: string) => p.startsWith("/account/wishlist"),
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    match: (p: string) => p.startsWith("/account/addresses"),
  },
  {
    href: "/account/points",
    label: "Ezurr points",
    match: (p: string) => p.startsWith("/account/points"),
  },
  {
    href: "/account/profile",
    label: "Profile",
    match: (p: string) => p.startsWith("/account/profile"),
  },
];

function NavIcon({ label, active }: { label: string; active: boolean }) {
  const stroke = active ? "#FFFFFF" : "#6E6E73";
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    "aria-hidden": true as const,
  };
  switch (label) {
    case "Overview":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    case "Orders":
      return (
        <svg {...common}>
          <path d="M7 7h14l-1.5 9H8.5L7 7Zm0 0L6 4H3" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="10" cy="20" r="1.25" fill={stroke} />
          <circle cx="18" cy="20" r="1.25" fill={stroke} />
        </svg>
      );
    case "Digital vault":
      return (
        <svg {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2" stroke={stroke} strokeWidth="1.75" />
          <path d="M8 12h8M12 9v6" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    case "Wishlist":
      return (
        <svg {...common}>
          <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
        </svg>
      );
    case "Addresses":
      return (
        <svg {...common}>
          <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.25" stroke={stroke} strokeWidth="1.75" />
        </svg>
      );
    case "Ezurr points":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.75" />
          <path d="M12 8v8M9.5 10.5h3.2a1.8 1.8 0 1 1 0 3.6H9.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="3.5" stroke={stroke} strokeWidth="1.75" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      );
  }
}

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuthSession();

  const name = session?.name ?? "Player";
  const initials = session?.initials ?? "EZ";
  const mobile = formatMobileDisplay(session?.mobile ?? "");

  function signOut() {
    clearSession();
    router.push("/auth");
  }

  return (
    <div className="ez-page py-6 sm:py-8 lg:py-10">
      <div className="mb-8 flex items-center gap-4 lg:hidden">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D1D1F] text-sm font-semibold text-white">
          {initials}
        </div>
        <div>
          <div className="font-semibold tracking-[-0.02em]">{name}</div>
          <div className="ez-mono mt-0.5 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
            {mobile}
          </div>
        </div>
      </div>

      <div className="ez-scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:hidden">
        {accountLinks.map((item) => {
          const active = item.match(pathname);
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
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-full bg-[#FFF5F5] px-4 py-2.5 text-sm font-semibold text-[#B42318] transition hover:bg-[#FEE4E2]"
        >
          Sign out
        </button>
      </div>

      <div className="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-black/[0.07] bg-[#F7F7F8] p-4">
            <div className="flex items-center gap-3 border-b border-black/[0.06] p-3 pb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1D1D1F] text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate font-semibold tracking-[-0.02em]">{name}</div>
                <div className="ez-mono mt-0.5 text-[8px] uppercase tracking-[0.1em] text-[#86868B]">
                  {mobile}
                </div>
              </div>
            </div>

            <nav className="mt-3 flex flex-col gap-1" aria-label="Account">
              {accountLinks.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-white text-[#1D1D1F] shadow-sm"
                        : "text-[#6E6E73] hover:bg-white/70 hover:text-[#1D1D1F]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                        active ? "bg-[#1D1D1F]" : "bg-white"
                      }`}
                    >
                      <NavIcon label={item.label} active={active} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={signOut}
              className="mt-3 flex w-full items-center gap-3 border-t border-black/[0.06] px-4 pt-5 text-left text-sm font-medium text-[#B42318] hover:text-[#912018]"
            >
              Sign out
            </button>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
