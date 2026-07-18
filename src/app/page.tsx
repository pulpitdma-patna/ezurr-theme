import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { HeroSlider } from "@/components/home/HeroSlider";
import { ProductRail } from "@/components/home/ProductRail";
import { EditorialBanner } from "@/components/home/EditorialBanner";
import { OfferBannerGate } from "@/components/home/OfferBannerGate";
import { BrandExplorer } from "@/components/home/BrandExplorer";
import { DigitalCardFeature } from "@/components/home/DigitalCardFeature";
import {
  featuredAccessories,
  featuredConsoles,
  featuredPreorders,
  trendingGames,
} from "@/data/home";

const assurances = [
  {
    title: "Minimum price",
    text: "You always pay our lowest price.",
    mark: "↓",
  },
  {
    title: "Genuine products",
    text: "Authentic, sealed, and warranty-backed.",
    mark: "✓",
  },
  {
    title: "Flexible payment",
    text: "COD under ₹10,000 or save prepaid.",
    mark: "₹",
  },
  {
    title: "Fast dispatch",
    text: "In-stock orders packed within 24 hours.",
    mark: "→",
  },
];

function AssuranceStrip() {
  return (
    <section className="relative z-20 bg-white" aria-label="Shopping assurances">
      <div className="ez-page relative -mt-5 sm:-mt-7">
        <div className="grid grid-cols-2 overflow-hidden rounded-[24px] border border-black/[0.07] bg-white/95 shadow-[0_20px_60px_rgba(17,17,19,0.12)] backdrop-blur-xl lg:grid-cols-4 lg:rounded-[28px]">
        {assurances.map((assurance, index) => (
          <div
            key={assurance.title}
            className={`group flex min-h-[126px] items-start gap-3.5 p-4 transition hover:bg-[#F8F8FA] sm:min-h-[138px] sm:gap-4 sm:p-6 ${
              index % 2 === 0 ? "border-r border-black/[0.06]" : ""
            } ${index < 2 ? "border-b border-black/[0.06] lg:border-b-0" : ""} ${
              index < assurances.length - 1 ? "lg:border-r lg:border-black/[0.06]" : ""
            }`}
          >
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1D1D1F] to-[#4A4A50] text-xs font-bold text-white shadow-[0_8px_20px_rgba(17,17,19,0.18)] transition duration-300 group-hover:-translate-y-0.5 group-hover:scale-105 sm:h-10 sm:w-10"
            >
              {assurance.mark}
            </span>
            <div className="pt-0.5">
              <h2 className="text-[13px] font-semibold tracking-[-0.02em] text-[#1D1D1F] sm:text-sm">
                {assurance.title}
              </h2>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#86868B] sm:text-xs">
                {assurance.text}
              </p>
            </div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MicroBar />
      <Header showSearch />
      <main>
        <HeroSlider />
        <AssuranceStrip />
        <ProductRail
          eyebrow="Reserve today · Pay at release"
          title="The next big worlds."
          description="Lock in our minimum price and be ready on release day."
          products={featuredPreorders}
          href="/preorders"
          linkLabel="All pre-orders"
          variant="preorder"
        />

        <OfferBannerGate />

        <BrandExplorer />
        <ProductRail
          eyebrow="Playing now"
          title="Games worth disappearing into."
          description="New releases, modern classics, and the titles everyone is talking about."
          products={trendingGames}
          href="/games"
          linkLabel="All games"
        />
        <ProductRail
          eyebrow="Choose your platform"
          title="Power your next era."
          products={featuredConsoles}
          href="/consoles"
          linkLabel="All consoles"
          variant="square"
        />
        <EditorialBanner
          eyebrow="Build your perfect setup"
          title="Control every detail."
          description="From precision racing hardware to handheld freedom, the right gear changes how every game feels."
          href="/accessories"
          cta="Shop gaming gear"
          image="/images/banner-racing-gear.png"
          imageAlt="Premium racing simulator in a minimalist studio"
          theme="light"
          fullWidth
          imagePosition="62% 40%"
        />
        <ProductRail
          eyebrow="Ready to ship"
          title="The finishing touch."
          products={featuredAccessories}
          href="/accessories"
          linkLabel="All accessories"
          variant="square"
        />
        <DigitalCardFeature />
      </main>
      <FooterFull />
    </div>
  );
}
