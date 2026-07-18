import type { AssuranceItem } from "@/lib/cms/types";
import { DEFAULT_ASSURANCES } from "@/lib/cms/defaultHomePage";

type AssuranceStripProps = {
  items?: AssuranceItem[];
};

export function AssuranceStrip({ items = DEFAULT_ASSURANCES }: AssuranceStripProps) {
  return (
    <section className="relative z-20 bg-white" aria-label="Shopping assurances">
      <div className="ez-page relative -mt-5 sm:-mt-7">
        <div className="grid grid-cols-2 overflow-hidden rounded-[24px] border border-black/[0.07] bg-white/95 shadow-[0_20px_60px_rgba(17,17,19,0.12)] backdrop-blur-xl lg:grid-cols-4 lg:rounded-[28px]">
          {items.map((assurance, index) => (
            <div
              key={`${assurance.title}-${index}`}
              className={`group flex min-h-[126px] items-start gap-3.5 p-4 transition hover:bg-[#F8F8FA] sm:min-h-[138px] sm:gap-4 sm:p-6 ${
                index % 2 === 0 ? "border-r border-black/[0.06]" : ""
              } ${index < 2 ? "border-b border-black/[0.06] lg:border-b-0" : ""} ${
                index < items.length - 1 ? "lg:border-r lg:border-black/[0.06]" : ""
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
