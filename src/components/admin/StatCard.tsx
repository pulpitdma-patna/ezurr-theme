type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "dark" | "light";
  delta?: string;
  deltaPositive?: boolean | null;
};

function deltaTone(positive: boolean | null | undefined) {
  if (positive === false) return "bg-[#FEE4E2] text-[#B42318]";
  if (positive === true) return "bg-[#EAF6ED] text-[#067647]";
  return "bg-[#F0F0F2] text-[#6E6E73]";
}

export function StatCard({
  label,
  value,
  detail,
  tone = "light",
  delta,
  deltaPositive,
}: StatCardProps) {
  const primary = tone === "dark";

  return (
    <article
      className={`relative overflow-hidden rounded-xl border p-3.5 sm:p-4 ${
        primary
          ? "border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)]"
          : "border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
      }`}
    >
      {primary ? (
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[3px] bg-[var(--ez-accent)]"
        />
      ) : null}

      <div className="flex items-start justify-between gap-2">
        <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          {label}
        </span>
        {delta ? (
          <span
            className={`ez-mono shrink-0 rounded px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.06em] ${deltaTone(deltaPositive)}`}
          >
            {delta}
          </span>
        ) : null}
      </div>

      <div className="mt-1.5 text-[22px] font-semibold tabular-nums leading-none tracking-[-0.04em] text-[#1D1D1F] sm:text-[26px]">
        {value}
      </div>

      {detail ? (
        <p className="mt-2 text-[11px] leading-snug text-[#6E6E73]">{detail}</p>
      ) : null}
    </article>
  );
}
