import Link from "next/link";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  inverse?: boolean;
  controls?: React.ReactNode;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  inverse = false,
  controls,
}: SectionHeadingProps) {
  return (
    <div className="mb-7 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-[760px] flex-col gap-3">
        <span className={`ez-section-kicker ${inverse ? "!text-white/55" : ""}`}>{eyebrow}</span>
        <h2 className={`ez-section-title ${inverse ? "!text-white" : ""}`}>{title}</h2>
        {description && (
          <p className={`ez-section-copy ${inverse ? "!text-white/60" : ""}`}>{description}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {href && linkLabel && (
          <Link
            href={href}
            className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm font-semibold transition ${
              inverse
                ? "border-white/20 bg-white/10 text-white hover:border-white/35 hover:bg-white/15 hover:!text-white"
                : "border-black/10 bg-white text-[#1D1D1F] hover:border-black/20 hover:bg-[#F5F5F7] hover:!text-[#1D1D1F]"
            }`}
          >
            {linkLabel}
          </Link>
        )}
        {controls}
      </div>
    </div>
  );
}
