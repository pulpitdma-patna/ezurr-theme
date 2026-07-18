import Link from "next/link";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  inverse?: boolean;
  controls?: React.ReactNode;
  className?: string;
  titleAs?: "h1" | "h2";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  inverse = false,
  controls,
  className = "",
  titleAs = "h2",
}: SectionHeadingProps) {
  const TitleTag = titleAs;

  return (
    <div
      className={`mb-6 flex flex-col gap-5 sm:mb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10 ${className}`}
    >
      <div className="min-w-0 max-w-[720px] flex-1">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-px w-6 shrink-0 ${inverse ? "bg-white/35" : "bg-[#D2D2D7]"}`}
          />
          <span className={`ez-section-kicker ${inverse ? "!text-white/50" : ""}`}>
            {eyebrow}
          </span>
        </div>
        <TitleTag
          className={`ez-section-title mt-3 sm:mt-3.5 ${inverse ? "!text-white" : ""}`}
        >
          {title}
        </TitleTag>
        {description && (
          <p
            className={`ez-section-copy mt-3 max-w-[34rem] ${
              inverse ? "!text-white/55" : ""
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {(href || controls) && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:pt-1">
          {href && linkLabel && (
            <Link
              href={href}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold transition sm:min-h-11 sm:px-5 ${
                inverse
                  ? "border border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15 hover:!text-white"
                  : "border border-black/[0.08] bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-black/15 hover:bg-[#F5F5F7] hover:!text-[#1D1D1F]"
              }`}
            >
              {linkLabel}
              <span aria-hidden="true" className="ml-1.5 text-[13px] opacity-60">
                →
              </span>
            </Link>
          )}
          {controls}
        </div>
      )}
    </div>
  );
}
