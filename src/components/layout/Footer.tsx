import Link from "next/link";
import { navItems } from "@/lib/theme";

const trustItems = [
  "Minimum price",
  "Genuine products",
  "Fast dispatch",
] as const;

const SUPPORT_EMAIL = "info@ezurr.com";

/** CMS-managed policy pages (seeded by PolicyPagesSeeder, edited in /admin/cms). */
const policyLinks = {
  shipping: { href: "/shipping-policy", label: "Shipping policy" },
  returns: { href: "/returns-refunds", label: "Returns & refunds" },
  privacy: { href: "/privacy-policy", label: "Privacy" },
  terms: { href: "/terms-of-service", label: "Terms" },
  contact: { href: "/contact", label: "Contact us" },
  about: { href: "/about", label: "About" },
} as const;

const legalBarLinks = [
  policyLinks.privacy,
  policyLinks.terms,
  { href: policyLinks.returns.href, label: "Refunds" },
  policyLinks.about,
];

export function FooterFull() {
  return (
    <footer className="mt-12 border-t border-black/[0.06] bg-[#F5F5F7] sm:mt-16 lg:mt-20">
      <div className="ez-page border-b border-black/[0.06]">
        <div className="ez-scrollbar-none flex gap-6 overflow-x-auto py-4 sm:justify-center sm:gap-10">
          {trustItems.map((item) => (
            <span
              key={item}
              className="ez-mono shrink-0 text-[9px] font-bold uppercase tracking-[0.16em] text-[#6E6E73]"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="ez-page mx-auto grid grid-cols-1 gap-8 py-10 sm:grid-cols-2 sm:gap-10 sm:py-12 lg:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-[-0.045em]">Ezurr</span>
            <span className="ez-mono text-[9.5px] uppercase tracking-[0.18em] text-[#86868B]">
              Play HQ
            </span>
          </div>
          <p className="max-w-[300px] text-sm leading-relaxed text-[#6E6E73]">
            India&apos;s ultimate gaming store — games, consoles and gear at the
            lowest price, guaranteed.
          </p>
          <div className="mt-1 flex flex-col">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="ez-mono w-fit py-1 text-[11px] tracking-[0.08em] text-[#424245] hover:text-[#1D1D1F]"
            >
              {SUPPORT_EMAIL}
            </a>
            <span className="ez-mono text-[11px] tracking-[0.08em] text-[#86868B]">
              MON–SAT · 10 AM – 6 PM
            </span>
          </div>
        </div>

        {/* One shop column — "Collection" and "Shop" used to render the same five paths. */}
        <FooterColumn
          title="Shop"
          links={navItems.map((n) => ({ href: n.href, label: n.label }))}
        />
        <FooterColumn
          title="Help"
          links={[
            { href: "/track", label: "Track order" },
            policyLinks.shipping,
            policyLinks.returns,
            policyLinks.contact,
          ]}
        />
        <FooterColumn
          title="Account"
          links={[
            { href: "/auth", label: "Sign in" },
            { href: "/account", label: "My account" },
            { href: "/account/orders", label: "Orders" },
            { href: "/account/digital", label: "Digital vault" },
            { href: "/account/wishlist", label: "Wishlist" },
            { href: "/checkout", label: "Checkout" },
          ]}
        />
      </div>

      <div className="bg-[#1D1D1F]">
        <div className="ez-page mx-auto flex flex-col items-start justify-between gap-3 py-4 md:flex-row md:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="ez-mono text-[10.5px] tracking-[0.08em] text-white/45">
              © 2026 EZURR
            </span>
            {legalBarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="py-1 text-xs text-white/45 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <span className="text-xs text-white/45">
            Minimum price guarantee applies on selected titles between order and
            release day.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  // Links carry their own vertical padding to clear the 24px minimum target;
  // the column gap shrinks by the same amount so the rhythm is unchanged.
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span className="ez-mono mb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
        {title}
      </span>
      {links.map((link) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          className="py-1 text-[#424245] hover:text-[#1D1D1F]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function FooterCompact() {
  return (
    <footer className="mt-10 border-t border-[#E8E8ED] bg-white sm:mt-12">
      <div className="ez-page flex flex-col items-start justify-between gap-3 py-4 md:flex-row md:items-center md:py-5">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-semibold tracking-[-0.03em]">Ezurr</span>
          <span className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
            Play HQ
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#86868B]">
          <Link href="/auth" className="py-1 hover:text-[#1D1D1F]">
            Sign in
          </Link>
          <Link href="/account" className="py-1 hover:text-[#1D1D1F]">
            Account
          </Link>
          <Link href={policyLinks.privacy.href} className="py-1 hover:text-[#1D1D1F]">
            {policyLinks.privacy.label}
          </Link>
          <Link href={policyLinks.terms.href} className="py-1 hover:text-[#1D1D1F]">
            {policyLinks.terms.label}
          </Link>
          <span>Minimum price guarantee on selected titles.</span>
        </div>
        <span className="ez-mono text-[10.5px] tracking-[0.08em] text-[#86868B]">
          © 2026 EZURR
        </span>
      </div>
    </footer>
  );
}
