import Image from "next/image";
import Link from "next/link";

type ProductImage = {
  src: string;
  alt: string;
};

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
  /** Shown in the prepaid glass card when theme is violet + fullWidth */
  prepaidPercent?: number;
  /** Product-led collage for prepaid full-bleed banners (replaces single hero image) */
  productImages?: ProductImage[];
};

function PrepaidProductCollage({ images }: { images: ProductImage[] }) {
  const [hero, second, third] = images;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,oklch(0.52_0.14_var(--ez-h)/0.16)_0%,transparent_46%)]" />

      {hero ? (
        <div className="absolute right-[-2%] top-[10%] h-[min(78%,520px)] w-[min(58%,640px)] drop-shadow-[0_40px_80px_rgba(0,0,0,0.55)] sm:right-[2%] sm:top-[6%] lg:right-[4%] lg:top-[4%] lg:h-[min(82%,560px)] lg:w-[min(52%,620px)]">
          <Image
            src={hero.src}
            alt=""
            fill
            sizes="(max-width: 1024px) 58vw, 620px"
            className="object-contain object-right"
            priority
          />
        </div>
      ) : null}

      {second ? (
        <div className="absolute right-[34%] top-[4%] hidden h-[min(42%,280px)] w-[min(30%,320px)] rotate-[-7deg] drop-shadow-[0_28px_56px_rgba(0,0,0,0.45)] sm:block lg:right-[38%] lg:top-[2%] lg:h-[min(44%,300px)] lg:w-[min(28%,300px)]">
          <Image
            src={second.src}
            alt=""
            fill
            sizes="(max-width: 1024px) 30vw, 300px"
            className="object-contain"
          />
        </div>
      ) : null}

      {third ? (
        <div className="absolute bottom-[6%] right-[10%] hidden h-[min(36%,240px)] w-[min(28%,260px)] rotate-[5deg] drop-shadow-[0_24px_48px_rgba(0,0,0,0.42)] md:block lg:bottom-[8%] lg:right-[14%] lg:h-[min(38%,260px)] lg:w-[min(26%,280px)]">
          <Image
            src={third.src}
            alt=""
            fill
            sizes="(max-width: 1024px) 28vw, 280px"
            className="object-contain"
          />
        </div>
      ) : null}

      <div className="absolute inset-y-0 right-0 w-[min(72%,920px)] bg-[linear-gradient(270deg,rgba(8,9,11,0)_0%,rgba(8,9,11,0.18)_28%,rgba(8,9,11,0.55)_100%)]" />
    </div>
  );
}

function PrepaidGlassCard({ percent }: { percent: number }) {
  return (
    <div
      aria-label={`${percent}% off at checkout for prepaid orders`}
      className="relative shrink-0 overflow-hidden rounded-[22px] border border-white/12 bg-[rgba(8,9,11,0.42)] px-5 py-4 text-white shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:rounded-[26px] sm:px-6 sm:py-5"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.08)_0%,transparent_48%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--ez-accent)] opacity-20 blur-2xl"
      />
      <span className="relative ez-mono text-[9px] font-bold uppercase tracking-[0.18em] text-white/45">
        Prepaid exclusive
      </span>
      <div className="relative mt-2 flex items-end gap-1.5">
        <span className="text-[clamp(2.75rem,7vw,3.5rem)] font-semibold leading-none tracking-[-0.07em]">
          {percent}
        </span>
        <span className="mb-1 text-2xl font-semibold leading-none tracking-[-0.04em] text-white/85">
          %
        </span>
      </div>
      <p className="relative mt-1.5 text-[13px] leading-snug text-white/55">off at checkout</p>
    </div>
  );
}

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
  productImages,
}: EditorialBannerProps) {
  const light = theme === "light";
  const prepaidOffer = fullWidth && theme === "violet";
  const productCollage = prepaidOffer && productImages && productImages.length > 0;
  const defaultPosition = light ? "center center" : prepaidOffer ? "72% 42%" : "70% center";
  const resolvedPosition = imagePosition ?? defaultPosition;
  const resolvedImageAlt =
    productCollage && productImages
      ? productImages.map((item) => item.alt).join(", ")
      : imageAlt;

  const shellTone = prepaidOffer
    ? "bg-[var(--ez-ink)]"
    : light
      ? "bg-[#F0F0F2]"
      : "bg-[#09090B]";

  const eyebrowTone = light ? "" : prepaidOffer ? "!text-[var(--ez-accent)]/80" : "!text-white/50";
  const badgeClass = light
    ? "border-black/10 bg-white text-[#424245]"
    : prepaidOffer
      ? "border-[var(--ez-accent)]/25 bg-[var(--ez-accent)]/10 text-white/85 backdrop-blur-md"
      : "border-white/15 bg-white/10 text-white backdrop-blur-md";

  const titleClass = light ? "text-[#1D1D1F]" : "text-white";
  const bodyClass = light ? "text-[#6E6E73]" : prepaidOffer ? "text-white/62" : "text-white/65";
  const ctaClass = light
    ? "bg-[#1D1D1F] text-white hover:bg-black hover:!text-white"
    : prepaidOffer
      ? "bg-white text-[var(--ez-ink)] shadow-[0_10px_32px_rgba(0,0,0,0.28)] hover:bg-white/92 hover:!text-[var(--ez-ink)]"
      : "bg-white text-[#1D1D1F] hover:bg-white/90 hover:!text-[#1D1D1F]";

  const overlayClass = light
    ? "bg-[linear-gradient(0deg,#F0F0F2_0%,rgba(240,240,242,0.92)_38%,rgba(240,240,242,0.35)_100%)] sm:bg-[linear-gradient(90deg,rgba(240,240,242,0.98)_0%,rgba(240,240,242,0.88)_44%,rgba(240,240,242,0.2)_100%)]"
    : prepaidOffer
      ? "bg-[linear-gradient(0deg,rgba(8,9,11,0.92)_0%,rgba(8,9,11,0.55)_42%,rgba(8,9,11,0.12)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,9,11,0.96)_0%,rgba(8,9,11,0.82)_40%,rgba(8,9,11,0.28)_72%,rgba(8,9,11,0.45)_100%)]"
      : "bg-[linear-gradient(0deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.45)_45%,rgba(0,0,0,0.15)_100%)] sm:bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.72)_42%,rgba(0,0,0,0.12)_100%)]";

  const accentGlowClass = prepaidOffer
    ? "bg-[radial-gradient(circle_at_78%_28%,oklch(0.52_0.14_var(--ez-h)/0.22)_0%,transparent_52%)]"
    : "";

  return (
    <section className={fullWidth ? "ez-section" : "ez-page ez-section"}>
      <div
        className={`relative isolate overflow-hidden ${shellTone} ${
          fullWidth ? "" : "rounded-[30px] sm:rounded-[38px]"
        }`}
      >
        <div
          className={`relative min-h-[460px] sm:min-h-[500px] ${
            prepaidOffer ? "lg:min-h-[560px] xl:min-h-[600px]" : "lg:min-h-[520px] xl:min-h-[580px]"
          }`}
        >
          {productCollage ? (
            <>
              <span className="sr-only">{resolvedImageAlt}</span>
              <PrepaidProductCollage images={productImages!} />
            </>
          ) : (
            <Image
              src={image}
              alt={resolvedImageAlt}
              fill
              sizes="100vw"
              className={`object-cover ${prepaidOffer ? "opacity-90 saturate-[0.72] contrast-[1.06]" : ""}`}
              style={{ objectPosition: resolvedPosition }}
            />
          )}

          <div className={`absolute inset-0 ${overlayClass}`} />
          {accentGlowClass ? (
            <div aria-hidden="true" className={`absolute inset-0 ${accentGlowClass}`} />
          ) : null}
          {prepaidOffer ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_18%)]"
            />
          ) : null}
          <div
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-px ${
              light ? "bg-black/8" : "bg-gradient-to-r from-transparent via-white/20 to-transparent"
            }`}
          />

          <div
            className={`relative z-10 flex min-h-[460px] flex-col justify-end sm:min-h-[500px] sm:justify-center ${
              prepaidOffer ? "lg:min-h-[560px] xl:min-h-[600px]" : "lg:min-h-[520px] xl:min-h-[580px]"
            } ${fullWidth ? "px-[var(--ez-page-x)] py-10 sm:py-12 lg:py-14" : "p-6 pb-8 sm:p-10 lg:p-14"}`}
          >
            <div
              className={`flex w-full flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 ${
                prepaidOffer ? "max-w-none" : "max-w-[720px]"
              }`}
            >
              <div className={prepaidOffer ? "max-w-[680px]" : ""}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3">
                    {!light ? (
                      <span aria-hidden="true" className="h-px w-6 shrink-0 bg-white/30" />
                    ) : null}
                    <span className={`ez-section-kicker ${eyebrowTone}`}>{eyebrow}</span>
                  </div>
                  {badge ? (
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${badgeClass}`}
                    >
                      {badge}
                    </span>
                  ) : null}
                </div>

                <h2
                  className={`m-0 max-w-[720px] text-[clamp(2.15rem,5.8vw,4.75rem)] font-semibold leading-[0.94] tracking-[-0.058em] ${titleClass}`}
                >
                  {title}
                </h2>

                <p
                  className={`mt-4 max-w-[560px] text-[15px] leading-[1.65] sm:mt-5 sm:text-[17px] sm:leading-[1.6] ${bodyClass}`}
                >
                  {description}
                </p>

                <div
                  className={`mt-7 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-center ${
                    prepaidOffer ? "sm:gap-6" : ""
                  }`}
                >
                  <Link
                    href={href}
                    className={`inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition ${ctaClass}`}
                  >
                    {cta} <span aria-hidden="true" className="ml-2">→</span>
                  </Link>
                  {prepaidOffer ? (
                    <div className="sm:hidden">
                      <PrepaidGlassCard percent={prepaidPercent} />
                    </div>
                  ) : null}
                </div>
              </div>

              {prepaidOffer ? (
                <div className="hidden shrink-0 sm:block lg:pb-1">
                  <PrepaidGlassCard percent={prepaidPercent} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
