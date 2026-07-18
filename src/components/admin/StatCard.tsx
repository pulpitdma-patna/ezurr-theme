type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "dark" | "light";
  delta?: string;
  deltaPositive?: boolean | null;
};

export function StatCard({
  label,
  value,
  detail,
  tone = "light",
  delta,
  deltaPositive,
}: StatCardProps) {
  const dark = tone === "dark";
  return (
    <article
      className={`rounded-lg p-4 ${
        dark ? "bg-[#1D1D1F] text-white" : "border border-black/[0.08] bg-white"
      }`}
    >
      <span
        className={`ez-mono text-[9px] uppercase tracking-[0.14em] ${
          dark ? "text-white/45" : "text-[#86868B]"
        }`}
      >
        {label}
      </span>
      <div className="mt-2 text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{value}</div>
      {delta ? (
        <p
          className={`mt-1.5 text-xs font-medium ${
            dark
              ? deltaPositive === false
                ? "text-[#F97066]"
                : "text-[#6CE9A6]"
              : deltaPositive === false
                ? "text-[#B42318]"
                : deltaPositive === true
                  ? "text-[#067647]"
                  : "text-[#86868B]"
          }`}
        >
          {delta}
        </p>
      ) : null}
      {detail ? (
        <p className={`mt-1 text-xs ${dark ? "text-white/55" : "text-[#86868B]"}`}>{detail}</p>
      ) : null}
    </article>
  );
}
