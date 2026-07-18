import Image from "next/image";
import Link from "next/link";

type EditorialBannerProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  image: string;
  imageAlt: string;
  theme?: "dark" | "violet" | "light";
  badge?: string;
  fullWidth?: boolean;
  imagePosition?: string;
  /** Shown in the prepaid overlay chip when theme is violet + fullWidth */
  prepaidPercent?: number;
};

export function EditorialBanner({
  eyebrow,
  title,
  description,
  href,
  cta,
  image,
  imageAlt,
  theme = "dark",
  badge,
  fullWidth = false,
  imagePosition,
  prepaidPercent = 10,
}: EditorialBannerProps) {
  const light = theme === "light";
  const freshOffer = fullWidth && theme === "violet";
  const defaultPosition = light ? "center center" : "70% center";
  const resolvedPosition = imagePosition ?? defaultPosition;

  const shellTone = theme === "violet" ? "bg-[#160B35]" : light ? "bg-[#F0F0F2]" : "bg-[#09090B]";

  const copy = (
    <>
      <span className={`ez-section-kicker mb-4 ${light ? "" : "!text-white/55"}`}>{eyebrow}</span>
      {badge && (
        <span
          className={`mb-4 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] ${
            light
              ? "border-black/10 bg-white text-[#424245]"
              : "border-white/15 bg-white/10 text-white backdrop-blur-md"
          }`}
        >
          {badge}
        </span>
      )}
      <h2
        className={`m-0 max-w-[650px] text-[clamp(2.35rem,6vw,5rem)] font-semibold leading-[0.95] tracking-[-0.055em] ${
          light ? "text-[#1D1D1F]" : "text-white"
        }`}
      >
        {title}
      </h2>
      <p
        className={`mt-5 max-w-[530px] text-base leading-relaxed sm:text-lg ${
          light ? "text-[#6E6E73]" : "text-white/65"
        }`}
      >
        {description}
      </p>
      <Link
        href={href}
        className={`mt-7 inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${
          light
            ? "bg-[#1D1D1F] text-white hover:bg-black hover:!text-white"
            : "bg-white text-[#1D1D1F] hover:bg-white/90 hover:!text-[#1D1D1F]"
        }`}
      >
        {cta} <span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </>
  );

  return (
    <section className={fullWidth ? "ez-section" : "ez-page ez-section"}>
      <div
        className={`relative isolate overflow-hidden ${shellTone} ${
          fullWidth ? "" : "rounded-[30px] sm:rounded-[38px]"
        }`}
      >
        {freshOffer && (
          <div className="absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}

        {/* Mobile / tablet: full-bleed art under copy */}
        <div className="relative min-h-[420px] sm:min-h-[440px] lg:hidden">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: resolvedPosition }}
          />
          <div
            className={`absolute inset-0 ${
              light
                ? "bg-gradient-to-t from-[#F0F0F2] via-[#F0F0F2]/85 to-[#F0F0F2]/25"
                : freshOffer
                  ? "bg-gradient-to-t from-[#120B2E] via-[#120B2E]/88 to-[#120B2E]/25"
                  : "bg-gradient-to-t from-black/85 via-black/45 to-black/20"
            }`}
          />
          <div
            className={`relative z-10 flex min-h-[420px] max-w-[700px] flex-col items-start justify-end p-6 pb-8 sm:min-h-[440px] sm:p-10 ${
              fullWidth ? "pl-[var(--ez-page-x)] pr-[var(--ez-page-x)]" : ""
            }`}
          >
            {copy}
          </div>
        </div>

        {/* Desktop: true split — copy | media */}
        <div
          className={`hidden lg:grid lg:min-h-[520px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:min-h-[580px] ${
            freshOffer ? "lg:min-h-[560px] xl:min-h-[620px]" : ""
          }`}
        >
          <div
            className={`relative z-10 flex flex-col items-start justify-center ${
              fullWidth
                ? "py-12 pl-[var(--ez-page-x)] pr-8 xl:py-14 xl:pr-12"
                : "p-10 xl:p-14"
            }`}
          >
            <div className="max-w-[640px]">{copy}</div>
          </div>

          <div
            className={`relative overflow-hidden ${
              freshOffer ? "min-h-[560px] xl:min-h-[620px]" : "min-h-[520px] xl:min-h-[580px]"
            }`}
          >
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="(max-width: 1279px) 52vw, 50vw"
              className="object-cover"
              style={{ objectPosition: resolvedPosition }}
            />
            {freshOffer && (
              <>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,rgba(178,91,255,0.18),transparent_42%)]" />
                <div className="absolute bottom-10 left-8 z-10 min-w-[190px] rounded-[24px] border border-white/15 bg-black/20 p-5 text-white shadow-2xl backdrop-blur-xl xl:left-10">
                  <span className="ez-mono text-[9px] uppercase tracking-[0.16em] text-white/50">
                    Prepaid exclusive
                  </span>
                  <div className="mt-2 text-5xl font-semibold leading-none tracking-[-0.06em]">
                    {prepaidPercent}%
                  </div>
                  <div className="mt-2 text-sm text-white/60">off at checkout</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
