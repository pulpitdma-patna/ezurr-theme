import Link from "next/link";
import Image from "next/image";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductCard, ConsoleCard } from "@/components/ui/ProductCard";
import { theme } from "@/lib/theme";
import { getCatalogProductKey } from "@/lib/productKey";

const preorders = [
  {
    img: "https://ezurr.com/cdn/shop/files/PREPLAY346.jpg?v=1773153102&width=533",
    brand: "PS5",
    name: "Marvel's Wolverine",
    price: "₹5,499",
    strike: "",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/GAMPLAY463.jpg?v=1781180742&width=533",
    brand: "PS5",
    name: "Onimusha: Way of the Sword",
    price: "₹5,999",
    strike: "",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/GAMPLAY465.jpg?v=1781180621&width=533",
    brand: "PS5",
    name: "The Blood of Dawnwalker",
    price: "₹5,999",
    strike: "",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/PREPLAY339.jpg?v=1773145693&width=533",
    brand: "PS5",
    name: "Marvel Tokon: Fighting Souls",
    price: "₹4,199",
    strike: "",
  },
];

const consoles = [
  {
    img: "https://ezurr.com/cdn/shop/files/CONSNIN130_1.jpg?v=1772613150&width=533",
    brand: "Nintendo",
    name: "Nintendo Switch 2",
    price: "₹65,000",
    strike: "₹74,490",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/CONVALV410.jpg?v=1779280531&width=533",
    brand: "Valve",
    name: "Steam Deck OLED 1TB",
    price: "₹119,990",
    strike: "₹149,990",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/CONMETA407.jpg?v=1779279795&width=533",
    brand: "Meta",
    name: "Meta Quest 3S 128GB",
    price: "₹42,899",
    strike: "₹49,990",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/CONPLAY127_2.jpg?v=1772612994&width=533",
    brand: "PlayStation",
    name: "PlayStation VR2",
    price: "₹44,990",
    strike: "",
  },
];

const accessories = [
  {
    img: "https://ezurr.com/cdn/shop/files/ACCPLAY256.jpg?v=1772605855&width=533",
    brand: "PlayStation",
    name: "DualSense Controller — Midnight Black",
    price: "₹6,389",
    strike: "",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/ACCPLAY224.jpg?v=1772548181&width=533",
    brand: "PlayStation",
    name: "PlayStation Portal — White",
    price: "₹23,999",
    strike: "",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/ACCPLAY227_1.jpg?v=1774419421&width=533",
    brand: "Logitech",
    name: "Logitech G29 Driving Force",
    price: "₹36,999",
    strike: "₹49,195",
  },
  {
    img: "https://ezurr.com/cdn/shop/files/PLAYNIN542.jpg?v=1783427115&width=533",
    brand: "Nintendo",
    name: "Switch 2 Pro Controller",
    price: "₹7,979",
    strike: "",
  },
];

const assurances = [
  {
    title: "Min price guarantee",
    text: "Price drops before release? The difference is refunded automatically.",
  },
  {
    title: "Price-drop alerts",
    text: "Track any item and get notified the moment its price moves.",
  },
  {
    title: "Cash on delivery",
    text: "Pay at your door on orders under ₹10,000 — or save 10% prepaid.",
  },
  {
    title: "Ships in 24 hrs",
    text: "Packed with speed and delivered fast, anywhere in India.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[#86868B] sm:text-[11px]">
          {eyebrow}
        </div>
        <h2 className="ez-h2 m-0 font-bold">{title}</h2>
      </div>
      <Link
        href={href}
        className="w-fit border-b border-[#D2D2D7] pb-0.5 text-sm font-semibold text-[#424245] hover:border-[#1D1D1F] hover:text-[#1D1D1F]"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header showSearch />
      <HeroSlider />

      <section className="border-y border-[#E8E8ED] bg-white">
        <div className="ez-page mx-auto grid grid-cols-1 gap-8 py-8 sm:grid-cols-2 sm:gap-10 sm:py-10 lg:grid-cols-4">
          {assurances.map((a) => (
            <div key={a.title} className="flex flex-col gap-2">
              <div className="ez-mono flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-[#1D1D1F]">
                <span className="h-1.5 w-1.5 shrink-0 bg-[var(--ez-accent)]" />
                {a.title}
              </div>
              <p className="m-0 text-[13.5px] leading-relaxed text-[#6E6E73]">{a.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="preorders" className="ez-page ez-section mx-auto">
        <SectionHeader
          eyebrow="Reserve today · Pay at release"
          title="Upcoming pre-orders"
          href="/preorders"
          linkLabel="View all pre-orders"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {preorders.map((p, i) => (
            <ProductCard key={getCatalogProductKey(p, i)} {...p} variant="preorder" />
          ))}
        </div>
      </section>

      {theme.showOffer && theme.offerStyle === "split" && (
        <section className="ez-section mt-8 border-y border-[#E8E8ED] bg-[#F5F5F7] sm:mt-16 lg:mt-[104px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
            <div className="ez-page flex flex-col justify-center gap-4 py-10 sm:gap-[18px] sm:py-16 lg:py-[88px] lg:pl-12 lg:pr-16">
              <span className="ez-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ez-accent-text)] sm:text-[11px]">
                Limited time · Prepaid offer
              </span>
              <h2 className="ez-display m-0 font-bold">
                Save 10%
                <br />
                <span className="font-medium text-[#86868B]">
                  on every prepaid pre-order.
                </span>
              </h2>
              <p className="ez-lead m-0 max-w-[440px] text-[#6E6E73]">
                Pay by UPI or card and the discount is applied at checkout — on top
                of your locked minimum price.
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <Link
                  href="/preorders"
                  className="ez-btn-dark inline-flex justify-center rounded-full px-8 py-3.5 text-[15px] font-semibold sm:py-[15px]"
                >
                  Browse pre-orders
                </Link>
                <span className="ez-mono text-[10px] tracking-[0.1em] text-[#86868B] sm:text-[11px]">
                  AUTO-APPLIED AT CHECKOUT
                </span>
              </div>
            </div>
            <div className="relative min-h-[240px] overflow-hidden border-t border-[#E8E8ED] bg-white sm:min-h-[320px] lg:min-h-[420px] lg:border-l lg:border-t-0">
              <Image
                src="https://ezurr.com/cdn/shop/files/ACCPLAY224.jpg?v=1772548181&width=800"
                alt="Offer visual"
                fill
                className="object-contain"
                sizes="50vw"
              />
            </div>
          </div>
        </section>
      )}

      <section id="consoles" className="ez-page ez-section mx-auto">
        <SectionHeader
          eyebrow="PlayStation · Nintendo · Meta · Valve"
          title="Consoles"
          href="/consoles"
          linkLabel="All consoles"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {consoles.map((c) => (
            <ConsoleCard key={c.name} {...c} />
          ))}
        </div>
      </section>

      <section id="gamecards" className="ez-page ez-section mx-auto">
        <SectionHeader
          eyebrow="Digital codes · Email delivery"
          title="Game cards, in seconds"
          href="/game-cards"
          linkLabel="All game cards"
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: "PlayStation Network",
              tag: "WALLET TOP UP",
              sub: "PSN CARD · INDIA",
              bg: "oklch(0.32 0.11 var(--ez-h))",
              chips: ["₹1,000", "₹2,000", "₹5,000"],
            },
            {
              title: "Xbox Game Pass",
              tag: "MEMBERSHIP",
              sub: "ESSENTIAL · DIGITAL CODE",
              bg: "oklch(0.44 0.12 var(--ez-h))",
              chips: ["12 MONTHS"],
            },
            {
              title: "Roblox",
              tag: "GIFT CARD",
              sub: "4500 ROBUX · DIGITAL CODE",
              bg: "oklch(0.56 0.13 var(--ez-h))",
              chips: ["$50"],
            },
          ].map((card) => (
            <div key={card.title} className="flex flex-col gap-4">
              <div
                className="flex aspect-[1.62] flex-col justify-between rounded-[18px] p-6 transition-transform hover:-translate-y-[3px]"
                style={{ background: card.bg }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[19px] font-semibold tracking-[-0.01em] text-white">
                    {card.title}
                  </span>
                  <span className="ez-mono text-[9px] uppercase tracking-[0.16em] text-white/55">
                    {card.tag}
                  </span>
                </div>
                <div className="ez-mono text-[11px] uppercase tracking-[0.1em] text-white/65">
                  {card.sub}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {card.chips.map((chip, i) => (
                  <span
                    key={chip}
                    className={`ez-mono cursor-pointer rounded-full px-3.5 py-2 text-xs ${
                      i === 0
                        ? "bg-[#1D1D1F] text-white"
                        : "border border-[#D2D2D7] text-[#424245] hover:border-[#1D1D1F] hover:text-[#1D1D1F]"
                    }`}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="accessories" className="ez-page ez-section mx-auto">
        <SectionHeader
          eyebrow="In stock · Ships in 24 hrs"
          title="Accessories"
          href="/accessories"
          linkLabel="All accessories"
        />
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          {accessories.map((a) => (
            <ConsoleCard key={a.name} {...a} />
          ))}
        </div>
      </section>

      <div className="ez-page mx-auto mt-12 sm:mt-16 lg:mt-[88px]">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 border-y border-[#E8E8ED] py-5 ez-mono text-[9px] uppercase tracking-[0.18em] text-[#AEAEB2] sm:gap-10 sm:py-[26px] sm:text-[11px] sm:tracking-[0.22em]">
          {["PLAYSTATION", "XBOX", "NINTENDO", "LOGITECH", "THRUSTMASTER", "RAZER"].map(
            (b) => (
              <span key={b}>{b}</span>
            ),
          )}
        </div>
      </div>

      {theme.showMembership && (
        <section className="ez-page mx-auto mt-12 sm:mt-16 lg:mt-[88px]">
          <div className="grid grid-cols-1 items-center gap-10 rounded-2xl bg-[#1D1D1F] p-6 sm:gap-16 sm:rounded-[28px] sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:p-16">
            <div className="flex flex-col gap-4 sm:gap-5">
              <div className="ez-mono text-[10px] uppercase tracking-[0.16em] text-[oklch(0.78_0.1_var(--ez-h))] sm:text-[11px]">
                Membership
              </div>
              <h2 className="ez-h2 m-0 font-bold text-[#F5F5F7]">Ezurr Plus</h2>
              <p className="m-0 max-w-[420px] text-base leading-relaxed text-[#A1A1A6]">
                2% back in points on everything, 48-hour early access to limited
                drops, and free release-day delivery.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="#plus"
                  className="inline-flex rounded-full bg-[#F5F5F7] px-7 py-3.5 text-[15px] font-semibold text-[#1D1D1F] transition-transform hover:-translate-y-px hover:text-[#1D1D1F]"
                >
                  Join for ₹99/mo
                </Link>
                <span className="ez-mono text-[11px] tracking-[0.1em] text-[#6E6E73]">
                  CANCEL ANYTIME
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              {[
                ["Points on every order", "2% BACK"],
                ["Early access to drops", "48 HRS"],
                ["Release-day delivery", "FREE"],
              ].map(([label, value], i) => (
                <div
                  key={label}
                  className={`flex items-baseline justify-between py-[18px] ${
                    i < 2 ? "border-b border-[#38383D]" : ""
                  }`}
                >
                  <span className="text-[15px] font-medium text-[#F5F5F7]">{label}</span>
                  <span className="ez-mono text-[13px] text-[oklch(0.78_0.1_var(--ez-h))]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <FooterFull />
    </div>
  );
}
