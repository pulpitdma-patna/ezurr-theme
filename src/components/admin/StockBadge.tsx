import { stockLevel } from "@/data/admin";

const tones = {
  in_stock: "bg-[#EAF6ED] text-[#2D6B3C]",
  low: "bg-[#FEF3C7] text-[#92400E]",
  out: "bg-[#FEE4E2] text-[#B42318]",
} as const;

const labels = {
  in_stock: "In stock",
  low: "Low",
  out: "Out",
} as const;

export function StockBadge({ stock }: { stock: number }) {
  const level = stockLevel(stock);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-semibold ${tones[level]}`}
    >
      <span className="ez-mono">{stock}</span>
      <span className="opacity-80">{labels[level]}</span>
    </span>
  );
}
