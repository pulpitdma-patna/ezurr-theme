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
}: EditorialBannerProps) {
  const light = theme === "light";
  const freshOffer = fullWidth && theme === "violet";

  return (
    <section className={fullWidth ? "ez-section" : "ez-page ez-section"}>
      <div
        className={`relative isolate min-h-[510px] overflow-hidden sm:min-h-[480px] lg:min-h-[540px] ${
          freshOffer ? "lg:min-h-[620px]" : ""
        } ${
          fullWidth ? "" : "rounded-[30px] sm:rounded-[38px]"
        } ${
          theme === "violet"
            ? "bg-[#160B35]"
            : light
              ? "bg-[#F0F0F2]"
              : "bg-[#09090B]"
        }`}
      >
        {freshOffer && (
          <div className="absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}
        <div className={`absolute inset-0 ${freshOffer ? "lg:left-[34%]" : "lg:left-[42%]"}`}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(max-width: 1023px) 100vw, 58vw"
            className={`object-cover transition duration-700 ${light ? "object-center" : "object-[65%_center]"}`}
          />
        </div>
        <div
          className={`absolute inset-0 ${
            light
              ? "bg-gradient-to-r from-[#F0F0F2] via-[#F0F0F2]/90 to-[#F0F0F2]/10"
              : freshOffer
                ? "bg-gradient-to-r from-[#120B2E] via-[#120B2E]/90 to-[#120B2E]/10"
                : theme === "violet"
                ? "bg-gradient-to-r from-[#160B35] via-[#160B35]/92 to-[#160B35]/5"
                : "bg-gradient-to-r from-[#09090B] via-[#09090B]/92 to-transparent"
          }`}
        />
        {freshOffer && (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(178,91,255,0.22),transparent_34%)]" />
            <div className="absolute bottom-10 right-[5%] z-10 hidden min-w-[190px] rounded-[24px] border border-white/15 bg-black/20 p-5 text-white shadow-2xl backdrop-blur-xl lg:block">
              <span className="ez-mono text-[9px] uppercase tracking-[0.16em] text-white/50">
                Prepaid exclusive
              </span>
              <div className="mt-2 text-5xl font-semibold leading-none tracking-[-0.06em]">10%</div>
              <div className="mt-2 text-sm text-white/60">off at checkout</div>
            </div>
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent lg:hidden" />

        <div className={`relative z-10 ${fullWidth ? "ez-page" : ""}`}>
          <div
            className={`flex min-h-[510px] max-w-[700px] flex-col items-start justify-end sm:min-h-[480px] lg:justify-center ${
              freshOffer ? "lg:min-h-[620px]" : "lg:min-h-[540px]"
            } ${fullWidth ? "py-10 sm:py-14 lg:py-16" : "p-7 pb-10 sm:p-12 lg:p-16"}`}
          >
            <span
              className={`ez-section-kicker mb-4 ${light ? "" : "!text-white/55"}`}
            >
              {eyebrow}
            </span>
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
          </div>
        </div>
      </div>
    </section>
  );
}
