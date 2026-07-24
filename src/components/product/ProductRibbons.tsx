import type { ProductBadge } from "@/lib/types";

type RibbonSize = "sm" | "md" | "lg";

const BADGE_PRIORITY: Record<string, number> = {
  discount: 0,
  new: 1,
  preorder: 2,
  bestprice: 3,
  soldout: 4,
};

const SIZE: Record<
  RibbonSize,
  {
    wrap: string;
    discount: { body: string; text: string; fold: string; notch: number };
    chip: { root: string; text: string; pad: string; accent: string };
  }
> = {
  sm: {
    wrap: "left-3 top-3 max-w-[calc(100%-3.75rem)] gap-1.5",
    discount: {
      body: "px-3 py-1.5 pr-[18px]",
      text: "text-[11px] tracking-[0.05em]",
      fold: "h-2 w-2",
      notch: 8,
    },
    chip: {
      root: "min-h-[22px]",
      text: "text-[9px] tracking-[0.13em]",
      pad: "px-2.5 py-1",
      accent: "w-[2.5px]",
    },
  },
  md: {
    wrap: "left-3 top-3 gap-[6px]",
    discount: {
      body: "px-2.5 py-[5px] pr-[12px]",
      text: "text-[9px] tracking-[0.08em] sm:text-[10px]",
      fold: "h-[6px] w-[6px]",
      notch: 6,
    },
    chip: {
      root: "min-h-[20px]",
      text: "text-[8px] tracking-[0.14em] sm:text-[9px]",
      pad: "px-2 py-[4px]",
      accent: "w-[2px]",
    },
  },
  lg: {
    wrap: "left-3.5 top-3.5 gap-[7px] sm:left-4 sm:top-4",
    discount: {
      body: "px-2.5 py-[5px] pr-[11px]",
      text: "text-[9px] tracking-[0.1em] sm:text-[10px]",
      fold: "h-[7px] w-[7px]",
      notch: 7,
    },
    chip: {
      root: "min-h-[21px]",
      text: "text-[8px] tracking-[0.16em] sm:text-[9px]",
      pad: "px-2.5 py-[5px]",
      accent: "w-[2px]",
    },
  },
};

const CHIP_ACCENTS: Record<string, string> = {
  new: "bg-[var(--ez-accent)]",
  preorder: "bg-[var(--ez-accent)]",
  bestprice: "bg-[#C98A16]",
  soldout: "bg-transparent",
};

function sortBadges(badges: ProductBadge[]): ProductBadge[] {
  return [...badges].sort(
    (a, b) =>
      (BADGE_PRIORITY[a.kind] ?? 99) - (BADGE_PRIORITY[b.kind] ?? 99),
  );
}

/** Garnet corner-sash discount tag with fold tail and metallic edge. */
function DiscountRibbon({ label, size }: { label: string; size: RibbonSize }) {
  const sz = SIZE[size].discount;
  const notch = sz.notch;

  return (
    <span
      className={`relative inline-flex items-center bg-gradient-to-br from-[#A00E22] via-[#D01230] to-[#7A0818] text-white shadow-[0_1px_0_rgba(255,255,255,0.22)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset,0_2px_8px_rgba(0,0,0,0.28),0_6px_18px_rgba(122,8,24,0.42)] ring-1 ring-white/20 ring-inset drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${sz.body}`}
      style={{
        clipPath: `polygon(0 0, 100% 0, 100% calc(100% - ${notch}px), calc(100% - ${notch}px) 100%, 0 100%)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18)_0%,transparent_40%,rgba(0,0,0,0.1)_100%)]"
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute bottom-0 right-0 bg-[#4A0510] shadow-[inset_1px_1px_0_rgba(255,255,255,0.06)] ${sz.fold}`}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
      <span
        className={`relative ez-mono font-bold leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.45)] ${sz.text}`}
      >
        {label}
      </span>
    </span>
  );
}

/** Frosted glass chip for condition / status badges. */
function ChipRibbon({
  label,
  kind,
  size,
}: {
  label: string;
  kind: string;
  size: RibbonSize;
}) {
  const sz = SIZE[size].chip;
  const isSoldOut = kind === "soldout";
  const accent = CHIP_ACCENTS[kind] ?? "bg-[var(--ez-accent)]";

  const surface = isSoldOut
    ? "bg-[rgba(58,58,60,0.92)] ring-white/10"
    : "bg-[rgba(17,17,19,0.88)] ring-white/14";

  return (
    <span
      className={`inline-flex items-stretch overflow-hidden backdrop-blur-md shadow-[0_1px_0_rgba(255,255,255,0.1)_inset,0_2px_8px_rgba(0,0,0,0.22),0_4px_14px_rgba(17,17,19,0.24)] ring-1 ring-inset drop-shadow-[0_2px_5px_rgba(0,0,0,0.28)] ${surface} ${sz.root}`}
    >
      {!isSoldOut ? (
        <span className={`shrink-0 ${accent} ${sz.accent}`} aria-hidden />
      ) : null}
      <span
        className={`ez-mono flex items-center font-bold uppercase leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] ${sz.text} ${sz.pad}`}
      >
        {label}
      </span>
    </span>
  );
}

function RibbonBadge({ badge, size }: { badge: ProductBadge; size: RibbonSize }) {
  if (badge.kind === "discount") {
    return <DiscountRibbon label={badge.label} size={size} />;
  }
  return <ChipRibbon label={badge.label} kind={badge.kind} size={size} />;
}

/** Shared product image ribbons — discount, condition, pre-order, sold out. */
export function ProductRibbons({
  badges,
  size = "md",
}: {
  badges?: ProductBadge[];
  size?: RibbonSize;
}) {
  if (!badges || badges.length === 0) return null;

  const sorted = sortBadges(badges);

  return (
    <div
      className={`pointer-events-none absolute z-10 flex flex-col items-start ${SIZE[size].wrap}`}
    >
      {sorted.map((b, i) => (
        <RibbonBadge key={`${b.kind}-${i}`} badge={b} size={size} />
      ))}
    </div>
  );
}
