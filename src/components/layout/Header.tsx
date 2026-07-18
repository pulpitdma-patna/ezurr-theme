"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navItems, type NavKey } from "@/lib/theme";
import { clearSession } from "@/lib/auth";
import { useAuthSession } from "@/hooks/useAuthSession";

function BagIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1D1D1F"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8h12l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#1D1D1F"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
    >
      {open ? (
        <>
          <path d="M6 6l12 12M18 6L6 18" />
        </>
      ) : (
        <>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </>
      )}
    </svg>
  );
}

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex shrink-0 items-baseline gap-2.5 whitespace-nowrap"
    >
      <span className="text-xl font-semibold tracking-[-0.045em] sm:text-[22px]">Ezurr</span>
      <span className="ez-mono text-[8px] uppercase tracking-[0.2em] text-[#86868B] sm:text-[9px]">
        Play HQ
      </span>
    </Link>
  );
}

type HeaderProps = {
  active?: NavKey;
  showSearch?: boolean;
  compact?: boolean;
};

export function Header({ active, showSearch = false, compact = false }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { session, ready } = useAuthSession();
  const accountHref = session ? "/account" : "/auth";
  const accountLabel = session ? "Account" : "Sign in";

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header
      className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/82 backdrop-blur-[24px]"
      style={{ WebkitBackdropFilter: "saturate(180%) blur(20px)" }}
    >
      <nav
        className={`mx-auto flex items-center gap-4 ${
          compact
            ? "h-14 max-w-[1100px] px-4 sm:h-16 sm:px-6"
            : "ez-page h-14 sm:h-[72px]"
        }`}
      >
        <Logo onClick={closeMenu} />

        {!compact && (
          <div className="hidden shrink-0 gap-7 text-[13px] font-medium text-[#424245] lg:flex xl:gap-8">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={
                  active === item.key
                    ? "font-semibold text-[#1D1D1F]"
                    : "text-[#424245] hover:text-[#1D1D1F]"
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 sm:gap-[22px]">
          {showSearch && (
            <div className="hidden min-w-[90px] w-[174px] shrink cursor-text items-center gap-2 rounded-full border border-black/[0.04] bg-[#F5F5F7] px-4 py-2.5 text-[13px] text-[#86868B] md:flex">
              <span className="relative h-3 w-3 shrink-0 rounded-full border-[1.6px] border-[#86868B]">
                <span className="absolute left-[9px] top-[10px] h-[1.6px] w-[5px] rotate-45 bg-[#86868B]" />
              </span>
              Search
            </div>
          )}
          {!compact && session?.role === "admin" && (
            <Link
              href="/admin"
              className={`hidden text-sm font-semibold text-[#1D1D1F] hover:text-[#1D1D1F] sm:inline ${
                ready ? "opacity-100" : "opacity-0"
              }`}
            >
              Admin
            </Link>
          )}
          {!compact && (
            <div
              ref={accountRef}
              className={`relative hidden sm:block ${ready ? "opacity-100" : "opacity-0"}`}
            >
              {session ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#424245] hover:text-[#1D1D1F]"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D1D1F] text-[10px] font-semibold text-white">
                      {session.initials}
                    </span>
                    <span className="max-w-[7rem] truncate">{session.name.split(" ")[0]}</span>
                  </button>
                  {accountOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-black/[0.08] bg-white py-1 shadow-[0_12px_40px_rgba(17,17,19,0.12)]"
                    >
                      {[
                        ["/account", "Overview"],
                        ["/account/orders", "Orders"],
                        ["/account/wishlist", "Wishlist"],
                        ["/account/profile", "Profile"],
                      ].map(([href, label]) => (
                        <Link
                          key={href}
                          href={href}
                          role="menuitem"
                          onClick={() => setAccountOpen(false)}
                          className="block px-3.5 py-2 text-sm text-[#424245] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                        >
                          {label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          clearSession();
                          setAccountOpen(false);
                          router.push("/auth");
                        }}
                        className="block w-full px-3.5 py-2 text-left text-sm text-[#B42318] hover:bg-[#FFF5F5]"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <Link
                  href={accountHref}
                  className="text-sm font-medium text-[#424245] hover:text-[#1D1D1F]"
                >
                  {accountLabel}
                </Link>
              )}
            </div>
          )}
          <Link
            href="/checkout"
            className="relative flex items-center"
            aria-label="Bag"
            onClick={closeMenu}
          >
            <BagIcon />
            <span className="absolute -right-2 -top-[7px] inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--ez-accent)] text-[10.5px] font-semibold text-white">
              1
            </span>
          </Link>
          {!compact && (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E8ED] lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MenuIcon open={menuOpen} />
            </button>
          )}
        </div>
      </nav>

      {!compact && menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 top-14 z-40 bg-black/20 sm:top-[68px] lg:hidden"
            onClick={closeMenu}
          />
          <div className="absolute left-0 right-0 top-full z-50 border-b border-[#E8E8ED] bg-white px-4 py-4 shadow-lg lg:hidden">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={closeMenu}
                  className={`rounded-xl px-4 py-3.5 text-[15px] font-medium ${
                    active === item.key
                      ? "bg-[#F5F5F7] font-semibold text-[#1D1D1F]"
                      : "text-[#424245]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {session?.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="rounded-xl px-4 py-3.5 text-[15px] font-semibold text-[#1D1D1F]"
                >
                  Admin
                </Link>
              )}
              <Link
                href={accountHref}
                onClick={closeMenu}
                className="rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#424245] sm:hidden"
              >
                {accountLabel}
              </Link>
              {showSearch && (
                <div className="mt-2 flex items-center gap-2 rounded-full bg-[#F5F5F7] px-4 py-3 text-[13px] text-[#86868B] md:hidden">
                  <span className="relative h-3 w-3 shrink-0 rounded-full border-[1.6px] border-[#86868B]">
                    <span className="absolute left-[9px] top-[10px] h-[1.6px] w-[5px] rotate-45 bg-[#86868B]" />
                  </span>
                  Search games, consoles…
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

export function CheckoutHeader({
  label = "Secure pre-order · 256-bit",
  shortLabel = "Secure · 256-bit",
}: {
  label?: string;
  shortLabel?: string;
} = {}) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
      <nav className="ez-page flex h-14 w-full items-center justify-between gap-3 sm:h-16">
        <Logo />
        <div className="flex items-center gap-2 rounded-full border border-[#E5E5EA] bg-[#F7F7F8] px-3 py-1.5 sm:gap-2.5 sm:px-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6E6E73" strokeWidth="2" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span className="ez-mono hidden text-[10px] uppercase tracking-[0.14em] text-[#6E6E73] sm:inline">
            {label}
          </span>
          <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#6E6E73] sm:hidden">
            {shortLabel}
          </span>
        </div>
      </nav>
    </header>
  );
}
