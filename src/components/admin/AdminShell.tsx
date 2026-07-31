"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  formatMobileDisplay,
  isAdminSession,
  isCredentialedSession,
} from "@/lib/auth";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAdminSettingsSync } from "@/hooks/useAdminSettingsSync";
import { AdminToastProvider } from "@/components/admin/AdminToast";
import { CommandPalette } from "@/components/admin/CommandPalette";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type NavItem = { href: string; label: string; icon: ReactNode };
type NavGroup = { label: string; icon: ReactNode; items: NavItem[] };

function IconDash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 19V5M4 19h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M8 15v-4M12 15V8M16 15v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function IconTags() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconBrand() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 4h10l1 4H6l1-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M6 8h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V8Z" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="14" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M11.5 11.5 20 3M16 4l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M3.5 19c.8-3 2.9-4.5 5.5-4.5S13.7 16 14.5 19" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16 14.5c2 .2 3.5 1.4 4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M4.9 6.5l1.6 1.6M17.5 15.9l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.9 17.5l1.6-1.6M17.5 8.1l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlug() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 3v5M16 3v5M6 8h12v2a6 6 0 0 1-12 0V8ZM12 16v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconReports() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M14 4v4h4M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2 4 14h7l-1 8 10-14h-7l1-6Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19V9M10 19V5M16 19v-7M20 19H3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <circle cx="6.5" cy="6.5" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.6 9.6 13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconStore() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M3 10 5.5 4h13L21 10M9 14h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 16h12l-1.2-1.5V10a4.8 4.8 0 1 0-9.6 0v4.5L6 16Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconSidebarToggle({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M9 4v16" stroke="currentColor" strokeWidth="1.75" />
      <path
        d={collapsed ? "M14 9l3 3-3 3" : "M16 9l-3 3 3 3"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const pageTitles: { match: (path: string) => boolean; title: string; crumb?: string; crumbHref?: string }[] = [
  { match: (p) => p === "/admin", title: "Today", crumb: "Overview", crumbHref: "/admin" },
  { match: (p) => p.startsWith("/admin/analytics"), title: "Analytics", crumb: "Overview", crumbHref: "/admin" },
  { match: (p) => p.startsWith("/admin/reports"), title: "Reports", crumb: "Overview", crumbHref: "/admin" },
  { match: (p) => p.startsWith("/admin/products"), title: "Products", crumb: "Catalog", crumbHref: "/admin/products" },
  { match: (p) => p.startsWith("/admin/categories"), title: "Categories", crumb: "Catalog", crumbHref: "/admin/products" },
  { match: (p) => p.startsWith("/admin/brands"), title: "Brands", crumb: "Catalog", crumbHref: "/admin/products" },
  // Retired routes that now redirect into Products — kept so a bookmarked URL
  // still shows the right chrome for the frame before the redirect lands.
  { match: (p) => p.startsWith("/admin/inventory"), title: "Inventory", crumb: "Catalog", crumbHref: "/admin/products" },
  { match: (p) => p.startsWith("/admin/preorders"), title: "Pre-orders", crumb: "Catalog", crumbHref: "/admin/products" },
  { match: (p) => p.startsWith("/admin/media"), title: "Media", crumb: "Catalog", crumbHref: "/admin/products" },
  { match: (p) => p.startsWith("/admin/orders"), title: "Orders", crumb: "Fulfillment", crumbHref: "/admin/orders" },
  { match: (p) => p.startsWith("/admin/digital-codes"), title: "Digital codes", crumb: "Fulfillment", crumbHref: "/admin/orders" },
  { match: (p) => p.startsWith("/admin/customers"), title: "Customers", crumb: "Grow", crumbHref: "/admin/customers" },
  { match: (p) => p.startsWith("/admin/coupons"), title: "Coupons", crumb: "Grow", crumbHref: "/admin/coupons" },
  { match: (p) => p.startsWith("/admin/recovery"), title: "Recovery", crumb: "Grow", crumbHref: "/admin/recovery" },
  { match: (p) => p === "/admin/cms", title: "Pages", crumb: "Online store", crumbHref: "/admin/cms" },
  { match: (p) => p === "/admin/cms/code", title: "Custom code", crumb: "Online store", crumbHref: "/admin/cms" },
  { match: (p) => p.startsWith("/admin/cms/"), title: "Page builder", crumb: "Online store", crumbHref: "/admin/cms" },
  { match: (p) => p === "/admin/checkout-rules/templates", title: "Templates", crumb: "Online store", crumbHref: "/admin/checkout-rules" },
  { match: (p) => p.startsWith("/admin/checkout-rules"), title: "Checkout rules", crumb: "Online store", crumbHref: "/admin/checkout-rules" },
  { match: (p) => p.startsWith("/admin/system"), title: "System health", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/team"), title: "Team", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/integrations"), title: "Integrations", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/automations"), title: "Automations", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/message-templates"), title: "Message templates", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/activity"), title: "Activity", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/tools"), title: "Import", crumb: "System", crumbHref: "/admin/settings" },
  { match: (p) => p.startsWith("/admin/settings"), title: "Settings", crumb: "System", crumbHref: "/admin/settings" },
];

function resolvePageMeta(pathname: string) {
  return (
    pageTitles.find((entry) => entry.match(pathname)) ?? {
      title: "Admin",
      crumb: "Ezurr HQ",
      crumbHref: "/admin" as string | undefined,
    }
  );
}

function IconActivity() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 12h4l2-6 4 12 2-6h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMedia() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="9" cy="11" r="1.75" fill="currentColor" />
      <path d="m13 14 2.5-3 4.5 5H8l2.5-3 2.5 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlatform() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M12 11v9M4 7.5l8 3.5 8-3.5" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  );
}

/** Top-level links — never wrapped in a collapsible submenu. */
const topLevelNav: NavItem[] = [
  // "Today" rather than "Dashboard": the screen answers what came in and
  // what needs doing now, which is what he opens it for.
  { href: "/admin", label: "Today", icon: <IconDash /> },
  { href: "/admin/analytics", label: "Analytics", icon: <IconChart /> },
  { href: "/admin/reports", label: "Reports", icon: <IconReports /> },
];

/** Multi-item groups rendered as collapsible NavSubmenus. */
const navSubmenus: NavGroup[] = [
  {
    label: "Catalog",
    icon: <IconBox />,
    items: [
      // Inventory and Pre-orders are Products views now (stock is edited inline
      // on the row; pre-order is the `fulfillment_type` tab), so they no longer
      // get their own nav entries.
      { href: "/admin/products", label: "Products", icon: <IconBox /> },
      { href: "/admin/categories", label: "Categories", icon: <IconTags /> },
      { href: "/admin/brands", label: "Brands", icon: <IconBrand /> },
      { href: "/admin/media", label: "Media", icon: <IconMedia /> },
    ],
  },
  {
    label: "Fulfillment",
    icon: <IconOrders />,
    items: [
      { href: "/admin/orders", label: "Orders", icon: <IconOrders /> },
      { href: "/admin/digital-codes", label: "Digital codes", icon: <IconKey /> },
    ],
  },
  {
    label: "Grow",
    icon: <IconGrow />,
    items: [
      { href: "/admin/customers", label: "Customers", icon: <IconUsers /> },
      { href: "/admin/coupons", label: "Coupons", icon: <IconTag /> },
      { href: "/admin/recovery", label: "Recovery", icon: <IconGrow /> },
    ],
  },
  {
    label: "Online store",
    icon: <IconMedia />,
    items: [
      { href: "/admin/cms", label: "Pages", icon: <IconReports /> },
      { href: "/admin/cms/code", label: "Custom code", icon: <IconBolt /> },
      { href: "/admin/checkout-rules", label: "Checkout rules", icon: <IconStore /> },
      { href: "/admin/settings#appearance", label: "Appearance", icon: <IconGear /> },
    ],
  },
  {
    label: "System",
    icon: <IconGear />,
    items: [
      { href: "/admin/system", label: "System health", icon: <IconPlatform /> },
      { href: "/admin/team", label: "Team", icon: <IconUsers /> },
      { href: "/admin/integrations", label: "Integrations", icon: <IconPlug /> },
      { href: "/admin/automations", label: "Automations", icon: <IconBolt /> },
      { href: "/admin/message-templates", label: "Message templates", icon: <IconReports /> },
      { href: "/admin/activity", label: "Activity", icon: <IconActivity /> },
      { href: "/admin/tools/import", label: "Import", icon: <IconReports /> },
      { href: "/admin/settings", label: "Settings", icon: <IconGear /> },
    ],
  },
];

const SIDEBAR_W_EXPANDED = "w-[256px]";
const SIDEBAR_W_COLLAPSED = "w-[72px]";
const SIDEBAR_PL_EXPANDED = "lg:pl-[256px]";
const SIDEBAR_PL_COLLAPSED = "lg:pl-[72px]";

const NAV_OPEN_STORAGE_KEY = "ezurr-admin-nav-open";
const NAV_OPEN_EVENT = "ezurr-admin-nav-open";
const SIDEBAR_COLLAPSED_STORAGE_KEY = "ezurr-admin-sidebar-collapsed";
const SIDEBAR_COLLAPSED_EVENT = "ezurr-admin-sidebar-collapsed";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Every nav href, used to resolve the single best (longest) match so a parent
// like /admin/cms doesn't highlight alongside its child /admin/cms/widgets.
const ALL_NAV_HREFS = [
  ...topLevelNav.map((i) => i.href),
  ...navSubmenus.flatMap((g) => g.items.map((i) => i.href)),
];

function bestActiveHref(pathname: string): string | null {
  let best: string | null = null;
  for (const href of ALL_NAV_HREFS) {
    if (!isActive(pathname, href)) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

// A single nav item is active only if it is THE best match for the path.
function isBestActive(pathname: string, href: string) {
  return bestActiveHref(pathname) === href;
}

function groupHasActive(pathname: string, items: NavItem[]) {
  return items.some((item) => isActive(pathname, item.href));
}

function parseNavOpenPrefs(raw: string): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, boolean>;
  } catch {
    return {};
  }
}

function getNavOpenPrefsSnapshot() {
  try {
    return window.localStorage.getItem(NAV_OPEN_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function getNavOpenPrefsServerSnapshot() {
  return "";
}

function subscribeNavOpenPrefs(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(NAV_OPEN_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(NAV_OPEN_EVENT, onStoreChange);
  };
}

function writeNavOpenPrefs(prefs: Record<string, boolean>) {
  try {
    window.localStorage.setItem(NAV_OPEN_STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event(NAV_OPEN_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

function getSidebarCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1" ? "1" : "0";
  } catch {
    return "0";
  }
}

function getSidebarCollapsedServerSnapshot() {
  return "0";
}

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange);
  };
}

function writeSidebarCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

function SidebarBrand({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { settings } = useAdminStore();
  const name = settings.storeName?.trim() || "Ezurr HQ";
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      title={collapsed ? name : undefined}
      className={`group flex items-center rounded-2xl py-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        collapsed ? "justify-center px-0" : "gap-3 px-1"
      }`}
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2A2A2E] to-[#141416] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-white/10">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <span className="relative text-[11px] font-semibold tracking-[-0.04em] text-white">EZ</span>
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.035em] text-white">
            {name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
            <span className="ez-mono text-[8px] uppercase tracking-[0.16em] text-white/40">
              Live ops
            </span>
          </span>
        </span>
      ) : null}
    </Link>
  );
}

function NavSectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pb-1.5 pt-1">
      <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-white/28">
        {children}
      </span>
    </div>
  );
}

function NavLinkItem({
  item,
  pathname,
  onNavigate,
  nested = false,
  collapsed = false,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
  collapsed?: boolean;
}) {
  const active = isBestActive(pathname, item.href);
  if (collapsed) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        title={item.label}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center justify-center rounded-[10px] p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          active
            ? "bg-white/[0.11] text-white ring-1 ring-inset ring-white/10"
            : "text-white/50 hover:bg-white/[0.05] hover:text-white/90"
        }`}
      >
        {active ? (
          <span
            className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-white/80"
            aria-hidden
          />
        ) : null}
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition-colors ${
            active
              ? "bg-white/10 text-white"
              : "text-white/45 group-hover:text-white/75"
          }`}
        >
          {item.icon}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-2.5 rounded-[10px] text-[13px] font-medium tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        nested ? "px-2 py-[7px]" : "px-2 py-2"
      } ${
        active
          ? "bg-white/[0.11] text-white ring-1 ring-inset ring-white/10"
          : "text-white/50 hover:bg-white/[0.05] hover:text-white/90"
      }`}
    >
      {active ? (
        <span
          className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-white/75"
          aria-hidden
        />
      ) : null}
      <span
        className={`flex shrink-0 items-center justify-center rounded-[7px] transition-colors ${
          nested ? "h-6 w-6" : "h-7 w-7"
        } ${
          active
            ? nested
              ? "text-white"
              : "bg-white/10 text-white"
            : nested
              ? "text-white/35 group-hover:text-white/65"
              : "text-white/45 group-hover:text-white/75"
        }`}
      >
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavSubmenu({
  group,
  pathname,
  open,
  onToggle,
  onNavigate,
  collapsed = false,
}: {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const panelId = useId();
  const routeActive = groupHasActive(pathname, group.items);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutCloseTimerRef = useRef<number | null>(null);

  function syncFlyoutPos() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setFlyoutPos({ top: rect.top, left: rect.right + 8 });
  }

  function openFlyout() {
    if (flyoutCloseTimerRef.current) {
      window.clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
    syncFlyoutPos();
    setFlyoutOpen(true);
  }

  function scheduleCloseFlyout() {
    if (flyoutCloseTimerRef.current) window.clearTimeout(flyoutCloseTimerRef.current);
    flyoutCloseTimerRef.current = window.setTimeout(() => {
      setFlyoutOpen(false);
      flyoutCloseTimerRef.current = null;
    }, 140);
  }

  useEffect(() => {
    if (!collapsed || !flyoutOpen) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (flyoutRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setFlyoutOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setFlyoutOpen(false);
    }
    window.addEventListener("resize", syncFlyoutPos);
    window.addEventListener("scroll", syncFlyoutPos, true);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", syncFlyoutPos);
      window.removeEventListener("scroll", syncFlyoutPos, true);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [collapsed, flyoutOpen]);

  useEffect(() => {
    return () => {
      if (flyoutCloseTimerRef.current) window.clearTimeout(flyoutCloseTimerRef.current);
    };
  }, []);

  if (collapsed) {
    return (
      <div className="relative" onMouseEnter={openFlyout} onMouseLeave={scheduleCloseFlyout}>
        <button
          ref={triggerRef}
          type="button"
          title={group.label}
          aria-label={group.label}
          aria-expanded={flyoutOpen}
          aria-haspopup="true"
          onClick={() => {
            if (flyoutOpen) {
              setFlyoutOpen(false);
            } else {
              openFlyout();
            }
          }}
          className={`group flex w-full items-center justify-center rounded-[10px] p-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            routeActive || flyoutOpen
              ? "bg-white/[0.08] text-white ring-1 ring-inset ring-white/[0.08]"
              : "text-white/45 hover:bg-white/[0.05] hover:text-white/85"
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition-colors ${
              routeActive
                ? "bg-white/10 text-white"
                : "text-white/40 group-hover:text-white/70"
            }`}
          >
            {group.icon}
          </span>
        </button>
        {flyoutOpen && flyoutPos ? (
          <div
            ref={flyoutRef}
            role="menu"
            aria-label={group.label}
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
            className="fixed z-50 min-w-[208px] rounded-xl border border-white/[0.08] bg-[#121214] py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.42)]"
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleCloseFlyout}
          >
            <div className="border-b border-white/[0.06] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
              {group.label}
            </div>
            <ul className="flex flex-col gap-0.5 px-1.5 py-1.5">
              {group.items.map((item) => {
                const active = isBestActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      title={item.label}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        setFlyoutOpen(false);
                        onNavigate?.();
                      }}
                      className={`relative flex items-center gap-2 rounded-[8px] px-2.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                        active
                          ? "bg-white/[0.11] text-white ring-1 ring-inset ring-white/10"
                          : "text-white/50 hover:bg-white/[0.05] hover:text-white/90"
                      }`}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-white/75"
                          aria-hidden
                        />
                      ) : null}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                          active ? "text-white" : "text-white/35"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`group flex w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          routeActive
            ? "bg-white/[0.06] text-white/95"
            : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
        }`}
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] transition-colors ${
            routeActive
              ? "bg-white/10 text-white"
              : "text-white/40 group-hover:text-white/70"
          }`}
        >
          {group.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em]">
          {group.label}
        </span>
        <span
          className={`shrink-0 text-white/30 transition-transform duration-200 group-hover:text-white/50 ${
            open ? "rotate-0" : "-rotate-90"
          }`}
          aria-hidden
        >
          <IconChevron />
        </span>
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={group.label}
        hidden={!open}
        className={open ? "mt-0.5" : undefined}
      >
        {open ? (
          <ul className="relative ml-[1.15rem] flex flex-col gap-0.5 border-l border-white/[0.06] py-0.5 pl-3">
            {group.items.map((item) => {
              const active = isBestActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2 rounded-[8px] px-2 py-[7px] text-[12.5px] font-medium tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      active
                        ? "bg-white/[0.11] text-white ring-1 ring-inset ring-white/10"
                        : "text-white/42 hover:bg-white/[0.05] hover:text-white/88"
                    }`}
                  >
                    {active ? (
                      <span
                        className="absolute -left-3 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-white/75"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                        active ? "text-white" : "text-white/32 group-hover:text-white/58"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
  collapsed = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const prefsRaw = useSyncExternalStore(
    subscribeNavOpenPrefs,
    getNavOpenPrefsSnapshot,
    getNavOpenPrefsServerSnapshot,
  );
  const prefs = parseNavOpenPrefs(prefsRaw);
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const prevPathRef = useRef(pathname);

  // Clear manual collapses/expands on navigation so active groups auto-open again.
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      setManual({});
    }
  }, [pathname]);

  function isGroupOpen(group: NavGroup) {
    // Manual toggle wins (allows collapse while a child route is active).
    if (Object.prototype.hasOwnProperty.call(manual, group.label)) {
      return manual[group.label];
    }
    if (groupHasActive(pathname, group.items)) return true;
    return prefs[group.label] === true;
  }

  function toggleGroup(group: NavGroup) {
    const nextOpen = !isGroupOpen(group);
    setManual((prev) => ({ ...prev, [group.label]: nextOpen }));
    writeNavOpenPrefs({ ...prefs, [group.label]: nextOpen });
  }

  return (
    <nav
      className={`ez-scrollbar-none flex flex-1 flex-col overflow-y-auto overflow-x-visible py-4 ${
        collapsed ? "gap-3 px-2" : "gap-4 px-3"
      }`}
      aria-label="Admin"
    >
      {!collapsed ? <NavSectionLabel>Overview</NavSectionLabel> : null}
      <ul className="flex flex-col gap-0.5">
        {topLevelNav.map((item) => (
          <li key={item.href}>
            <NavLinkItem
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          </li>
        ))}
      </ul>
      <div className={`flex flex-col gap-1 ${collapsed ? "" : "border-t border-white/[0.05] pt-3"}`}>
        {!collapsed ? <NavSectionLabel>Workspace</NavSectionLabel> : null}
        {navSubmenus.map((group) => (
          <NavSubmenu
            key={group.label}
            group={group}
            pathname={pathname}
            open={isGroupOpen(group)}
            onToggle={() => toggleGroup(group)}
            onNavigate={onNavigate}
            collapsed={collapsed}
          />
        ))}
      </div>
    </nav>
  );
}

function SidebarFooter({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  return (
    <div className={`border-t border-white/[0.06] ${collapsed ? "p-2" : "p-3"}`}>
      <Link
        href="/"
        onClick={onNavigate}
        title={collapsed ? "Storefront" : undefined}
        aria-label={collapsed ? "Storefront" : undefined}
        className={`flex items-center rounded-[10px] bg-white/[0.03] text-[13px] font-medium text-white/55 ring-1 ring-inset ring-white/[0.06] transition-colors hover:bg-white/[0.06] hover:text-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
          collapsed ? "justify-center p-2" : "gap-2.5 px-2 py-2"
        }`}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-[7px] text-white/45">
          <IconStore />
        </span>
        {!collapsed ? (
          <span className="min-w-0">
            <span className="block leading-tight">Storefront</span>
            <span className="ez-mono text-[8px] uppercase tracking-[0.14em] text-white/28">
              Open shop
            </span>
          </span>
        ) : null}
      </Link>
    </div>
  );
}

function SidebarShell({
  children,
  className = "",
  allowFlyouts = false,
}: {
  children: ReactNode;
  className?: string;
  /** When true, avoid clipping hover flyouts from the collapsed rail. */
  allowFlyouts?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col bg-[#0A0A0C] ${
        allowFlyouts ? "overflow-visible" : "overflow-hidden"
      } ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045)_0%,transparent_28%),radial-gradient(ellipse_at_15%_0%,rgba(255,255,255,0.06),transparent_52%)]"
        aria-hidden
      />
      <div className="relative flex h-full min-h-0 flex-col">{children}</div>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready } = useAuthSession();
  // Every admin page, not just Settings — the sidebar shows the store's name and
  // used to show the seeded default until the owner happened to open Settings.
  useAdminSettingsSync();
  // No useAdminStore here any more. The alert bell and the orders badge were
  // both counted from the localStorage demo seed and drawn on top of every live
  // screen — a red "3" over the shop's real orders, sourced from practice data
  // that has nothing to do with this store. Deleted rather than re-pointed: the
  // count belongs on a server figure, and a badge that is right only sometimes
  // is worse than no badge, because it is the thing being trusted at a glance.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPath, setDrawerPath] = useState(pathname);
  const [search, setSearch] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const sidebarCollapsedRaw = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot,
  );
  const sidebarCollapsed = sidebarCollapsedRaw === "1";
  const searchId = useId();
  const drawerRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const goChordRef = useRef(false);
  const goChordTimerRef = useRef<number | null>(null);
  const pageMeta = resolvePageMeta(pathname);

  if (pathname !== drawerPath) {
    setDrawerPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!ready) return;
    if (!isCredentialedSession(session) || !isAdminSession(session)) {
      if (session && !isCredentialedSession(session)) clearSession();
      router.replace("/auth");
    }
  }, [ready, session, router]);

  useEffect(() => {
    if (!drawerOpen) return;
    const panel = drawerRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(
      'a, button, input, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(
        'a, button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    function onPointer(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
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

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target.isContentEditable
      );
    }

    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteQuery("");
        setPaletteOpen(true);
        goChordRef.current = false;
        return;
      }

      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        goChordRef.current = false;
        return;
      }

      if (event.key.toLowerCase() === "g" && !event.repeat) {
        goChordRef.current = true;
        if (goChordTimerRef.current) window.clearTimeout(goChordTimerRef.current);
        goChordTimerRef.current = window.setTimeout(() => {
          goChordRef.current = false;
        }, 800);
        return;
      }

      if (goChordRef.current && event.key.toLowerCase() === "o") {
        event.preventDefault();
        goChordRef.current = false;
        router.push("/admin/orders");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (goChordTimerRef.current) window.clearTimeout(goChordTimerRef.current);
    };
  }, [router]);

  if (!ready || !isCredentialedSession(session) || !isAdminSession(session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F0F0F2]">
        <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B]">
          Checking admin access…
        </div>
      </div>
    );
  }

  function signOut() {
    clearSession();
    router.push("/auth");
  }

  function openPalette(seed = "") {
    setPaletteQuery(seed);
    setPaletteOpen(true);
  }

  function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    openPalette(search.trim());
  }

  function toggleSidebarCollapsed() {
    writeSidebarCollapsed(!sidebarCollapsed);
  }

  const sidebarWidthClass = sidebarCollapsed ? SIDEBAR_W_COLLAPSED : SIDEBAR_W_EXPANDED;
  const sidebarPadClass = sidebarCollapsed ? SIDEBAR_PL_COLLAPSED : SIDEBAR_PL_EXPANDED;

  return (
    <AdminToastProvider>
    <div className="min-h-screen bg-[#F0F0F2] lg:flex">
      <CommandPalette
        open={paletteOpen}
        initialQuery={paletteQuery}
        onClose={() => {
          setPaletteOpen(false);
          setPaletteQuery("");
        }}
      />
      <aside
        className={`admin-chrome fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 ease-out lg:flex ${sidebarWidthClass} ${
          sidebarCollapsed ? "overflow-visible" : ""
        }`}
      >
        <SidebarShell
          allowFlyouts={sidebarCollapsed}
          className="w-full border-r border-white/[0.06]"
        >
          <div
            className={`border-b border-white/[0.05] pb-3 pt-5 ${
              sidebarCollapsed ? "px-2" : "px-4"
            }`}
          >
            <SidebarBrand collapsed={sidebarCollapsed} />
          </div>
          <SidebarNav pathname={pathname} collapsed={sidebarCollapsed} />
          <SidebarFooter collapsed={sidebarCollapsed} />
        </SidebarShell>
      </aside>

      {drawerOpen ? (
        <div className="admin-chrome fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-[min(300px,90vw)] flex-col shadow-2xl"
          >
            <SidebarShell className="w-full">
              <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-5">
                <SidebarBrand onNavigate={() => setDrawerOpen(false)} />
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/60 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  aria-label="Close menu"
                >
                  <IconClose />
                </button>
              </div>
              <SidebarNav pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
              <SidebarFooter onNavigate={() => setDrawerOpen(false)} />
            </SidebarShell>
          </aside>
        </div>
      ) : null}

      <div
        className={`admin-shell-body flex min-h-screen min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out ${sidebarPadClass}`}
      >
        <header className="admin-chrome sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 shadow-[0_1px_0_rgba(17,17,19,0.03)] backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-3 sm:gap-4 sm:px-5 lg:px-6">
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-[#F7F7F8] text-[#1D1D1F] transition hover:bg-[#EFEFF1] lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <IconMenu />
            </button>

            <button
              type="button"
              onClick={toggleSidebarCollapsed}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-[#424245] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F] lg:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <IconSidebarToggle collapsed={sidebarCollapsed} />
            </button>

            <div className="hidden min-w-0 shrink-0 sm:block">
              <nav aria-label="Breadcrumb" className="ez-mono text-[8px] uppercase tracking-[0.16em] text-[#AEAEB2]">
                <ol className="flex items-center gap-1">
                  <li>
                    <Link href="/admin" className="hover:text-[#1D1D1F]">
                      HQ
                    </Link>
                  </li>
                  {pageMeta.crumb ? (
                    <>
                      <li aria-hidden>/</li>
                      <li>
                        {pageMeta.crumbHref ? (
                          <Link href={pageMeta.crumbHref} className="hover:text-[#1D1D1F]">
                            {pageMeta.crumb}
                          </Link>
                        ) : (
                          pageMeta.crumb
                        )}
                      </li>
                    </>
                  ) : null}
                  <li aria-hidden>/</li>
                  <li className="font-medium text-[#6E6E73]">{pageMeta.title}</li>
                </ol>
              </nav>
            </div>

            <div className="hidden h-7 w-px shrink-0 bg-black/[0.08] sm:block" aria-hidden />

            <form onSubmit={handleSearch} className="min-w-0 flex-1">
              <label htmlFor={searchId} className="sr-only">
                Search admin
              </label>
              <div className="relative max-w-xl">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                  aria-hidden
                >
                  <IconSearch />
                </span>
                <input
                  ref={searchInputRef}
                  id={searchId}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => openPalette(search.trim())}
                  placeholder="Search products, orders, customers…"
                  className="h-10 w-full rounded-xl border border-black/[0.07] bg-[#F7F7F8] pl-9 pr-14 text-sm outline-none transition placeholder:text-[#AEAEB2] hover:bg-[#F3F3F5] focus:border-black/[0.12] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                />
                <button
                  type="button"
                  onClick={() => openPalette(search.trim())}
                  className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-black/[0.08] bg-white px-1.5 py-0.5 ez-mono text-[9px] text-[#86868B] transition hover:bg-[#F5F5F7] sm:inline-flex"
                  aria-label="Open command palette"
                >
                  ⌘K
                </button>
              </div>
            </form>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Link
                href="/admin/orders"
                className="relative hidden h-9 w-9 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-[#424245] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F] md:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                aria-label="Orders"
                title="Orders"
              >
                <IconOrders />
              </Link>
              <Link
                href="/"
                className="hidden h-9 w-9 items-center justify-center rounded-xl border border-black/[0.07] bg-white text-[#424245] transition hover:bg-[#F5F5F7] hover:text-[#1D1D1F] sm:inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                aria-label="Storefront"
                title="Storefront"
              >
                <IconStore />
              </Link>

              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-black/[0.07] bg-white py-1 pl-1 pr-2.5 transition hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D1D1F] text-[10px] font-semibold text-white">
                    {session.initials}
                  </span>
                  <span className="hidden min-w-0 text-left lg:block">
                    <span className="block max-w-[7rem] truncate text-xs font-semibold leading-tight text-[#1D1D1F]">
                      {session.name}
                    </span>
                    <span className="ez-mono block text-[8px] uppercase tracking-[0.12em] text-[#86868B]">
                      Admin
                    </span>
                  </span>
                  <span className="hidden text-[#AEAEB2] lg:inline">
                    <IconChevron />
                  </span>
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] z-40 w-56 overflow-hidden rounded-2xl border border-black/[0.07] bg-white py-1.5 shadow-[0_16px_40px_rgba(17,17,19,0.12)]"
                  >
                    <div className="border-b border-black/[0.06] px-3.5 py-3">
                      <div className="text-sm font-semibold tracking-[-0.02em]">{session.name}</div>
                      <div className="mt-0.5 ez-mono text-[10px] text-[#86868B]">
                        {formatMobileDisplay(session.mobile)}
                      </div>
                    </div>
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      className="block px-3.5 py-2.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
                      onClick={() => setAccountOpen(false)}
                    >
                      Settings
                    </Link>
                    <Link
                      href="/"
                      role="menuitem"
                      className="block px-3.5 py-2.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7]"
                      onClick={() => setAccountOpen(false)}
                    >
                      View storefront
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="block w-full px-3.5 py-2.5 text-left text-xs font-medium text-[#B42318] hover:bg-[#FFF5F5]"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="admin-shell-main flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-6">{children}</main>
      </div>
    </div>
    </AdminToastProvider>
  );
}
