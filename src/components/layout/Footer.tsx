import Link from "next/link";
import { navItems } from "@/lib/theme";

export function FooterFull() {
  return (
    <footer className="mt-20 border-t border-black/[0.06] bg-[#F5F5F7] sm:mt-28 lg:mt-36">
      <div className="ez-page mx-auto grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 sm:gap-12 sm:py-20 lg:grid-cols-4">
        <div className="flex flex-col gap-3.5 sm:col-span-2 lg:col-span-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[22px] font-semibold tracking-[-0.045em]">Ezurr</span>
            <span className="ez-mono text-[9.5px] uppercase tracking-[0.18em] text-[#86868B]">
              Play HQ
            </span>
          </div>
          <p className="max-w-[310px] text-sm leading-relaxed text-[#6E6E73]">
            India&apos;s ultimate gaming store — games, consoles and gear at the
            lowest price, guaranteed.
          </p>
          <div className="mt-1.5 flex flex-col gap-1">
            <span className="ez-mono text-[11px] tracking-[0.08em] text-[#424245]">
              info@ezurr.com
            </span>
            <span className="ez-mono text-[11px] tracking-[0.08em] text-[#86868B]">
              MON–SAT · 10 AM – 6 PM
            </span>
          </div>
        </div>
        <FooterColumn
          title="Collection"
          links={navItems.map((n) => ({ href: n.href, label: n.label }))}
        />
        <FooterColumn
          title="Shop"
          links={[
            { href: "/consoles", label: "PlayStation" },
            { href: "/consoles", label: "Xbox" },
            { href: "/consoles", label: "Nintendo" },
            { href: "/accessories", label: "Logitech" },
            { href: "/accessories", label: "Razer" },
          ]}
        />
        <FooterColumn
          title="About Ezurr"
          links={[
            { href: "#about", label: "Why us" },
            { href: "#about", label: "Shipping policy" },
            { href: "#about", label: "Refund & cancellation" },
            { href: "#about", label: "Privacy policy" },
            { href: "#about", label: "Contact us" },
          ]}
        />
      </div>
      <div className="border-t border-black/[0.06]">
        <div className="ez-page mx-auto flex flex-col items-start justify-between gap-4 py-5 md:flex-row md:items-center">
          <span className="ez-mono text-[10.5px] tracking-[0.08em] text-[#86868B]">
            © 2026 EZURR
          </span>
          <span className="text-xs text-[#86868B]">
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
  return (
    <div className="flex flex-col gap-3.5 text-sm">
      <span className="ez-mono mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#86868B]">
        {title}
      </span>
      {links.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="text-[#424245] hover:text-[#1D1D1F]"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function FooterCompact() {
  return (
    <footer className="mt-16 border-t border-[#E8E8ED] bg-white sm:mt-24">
      <div className="ez-page flex flex-col items-start justify-between gap-4 py-5 md:flex-row md:items-center">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-[-0.03em]">Ezurr</span>
          <span className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
            Play HQ
          </span>
        </Link>
        <span className="text-xs text-[#86868B]">
          Minimum price guarantee applies on selected titles between order and
          release day.
        </span>
        <span className="ez-mono text-[10.5px] tracking-[0.08em] text-[#86868B]">
          © 2026 EZURR
        </span>
      </div>
    </footer>
  );
}
