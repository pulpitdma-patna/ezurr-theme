import Image from "next/image";
import Link from "next/link";
import { homeCategories } from "@/data/home";
import { SectionHeading } from "./SectionHeading";

export function CategoryShowcase() {
  return (
    <section className="ez-page ez-section" aria-label="Shop by category">
      <SectionHeading
        eyebrow="Start exploring"
        title="Shop by category."
        description="Jump directly into the collection built for what you want to play next."
        controls={
          <span className="ez-mono hidden rounded-full border border-black/[0.08] bg-[#F5F5F7] px-4 py-2 text-[9px] uppercase tracking-[0.15em] text-[#6E6E73] sm:inline-flex">
            05 collections
          </span>
        }
      />

      <div className="ez-scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-5 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0">
        {homeCategories.map((category, index) => (
          <Link
            key={category.href}
            href={category.href}
            className="group relative aspect-[4/5] w-[72vw] max-w-[310px] shrink-0 snap-start overflow-hidden rounded-[26px] border border-black/[0.06] bg-[#F3F4F6] shadow-[0_12px_35px_rgba(17,17,19,0.07)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_55px_rgba(17,17,19,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D1D1F] sm:w-[42vw] lg:w-auto lg:max-w-none"
            aria-label={`Shop ${category.title}`}
          >
            <Image
              src={category.image}
              alt={category.imageAlt}
              fill
              priority={index === 0}
              sizes="(max-width: 639px) 72vw, (max-width: 1023px) 42vw, 20vw"
              className={`transition duration-700 ease-out group-hover:scale-[1.045] ${
                index === 0 ? "object-cover" : "object-contain p-6 lg:p-5 xl:p-7"
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-transparent" />
            <span className="ez-mono absolute left-5 top-5 z-10 rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-white/70 backdrop-blur-md">
              0{index + 1}
            </span>
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 lg:p-4 xl:p-5">
              <span className="ez-mono text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">
                {category.eyebrow}
              </span>
              <div className="mt-1 flex items-end justify-between gap-3">
                <h3 className="text-[clamp(1.35rem,2vw,2rem)] font-semibold leading-none tracking-[-0.04em] text-white">
                  {category.title}
                </h3>
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base text-black transition duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
