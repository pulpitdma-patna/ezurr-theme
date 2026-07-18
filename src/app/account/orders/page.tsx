import Image from "next/image";
import { SectionHeading } from "@/components/home/SectionHeading";

const orders = [
  {
    id: "EZX24071891",
    status: "Arriving tomorrow",
    statusTone: "text-[#2D6B3C] bg-[#EAF6ED]",
    date: "Placed 15 Jul 2026",
    name: "DualSense Controller — Midnight Black",
    price: "₹6,389",
    image: "https://ezurr.com/cdn/shop/files/ACCPLAY256.jpg?v=1772605855&width=533",
    action: "Track order",
  },
  {
    id: "EZX24062144",
    status: "Pre-order confirmed",
    statusTone: "text-[var(--ez-accent-text)] bg-[var(--ez-accent-soft)]",
    date: "Placed 21 Jun 2026",
    name: "Grand Theft Auto VI — Standard Edition",
    price: "₹5,999",
    image: "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533",
    action: "View pre-order",
  },
  {
    id: "EZX24030802",
    status: "Delivered",
    statusTone: "text-[#6E6E73] bg-[#F0F0F2]",
    date: "Delivered 12 Mar 2026",
    name: "PlayStation Portal — White",
    price: "₹23,999",
    image: "https://ezurr.com/cdn/shop/files/ACCPLAY224.jpg?v=1772548181&width=533",
    action: "Buy again",
  },
];

export default function OrdersPage() {
  return (
    <div>
      <SectionHeading
        titleAs="h1"
        eyebrow="Purchase history"
        title="Your orders."
        description="Track current deliveries and revisit past purchases."
      />

      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        {["All orders", "In progress", "Pre-orders", "Delivered"].map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
              index === 0 ? "bg-[#1D1D1F] text-white" : "bg-[#F5F5F7] text-[#6E6E73]"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {orders.map((order) => (
          <article key={order.id} className="overflow-hidden rounded-[26px] border border-black/[0.07]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.05] bg-[#FAFAFB] px-5 py-4 sm:px-6">
              <div>
                <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Order {order.id}</span>
                <div className="mt-1 text-xs text-[#86868B]">{order.date}</div>
              </div>
              <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${order.statusTone}`}>{order.status}</span>
            </div>
            <div className="grid gap-5 p-5 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:p-6">
              <div className="relative aspect-square overflow-hidden rounded-[18px] bg-[#F7F7F8]">
                <Image src={order.image} alt={order.name} fill className="object-contain p-2" sizes="110px" />
              </div>
              <div>
                <h2 className="font-semibold tracking-[-0.02em]">{order.name}</h2>
                <div className="ez-mono mt-2 text-xs text-[#424245]">{order.price}</div>
                <p className="mt-2 text-xs leading-relaxed text-[#86868B]">Qty 1 · Standard delivery</p>
              </div>
              <button
                type="button"
                className="min-h-11 rounded-full border border-black/10 px-5 text-sm font-semibold transition hover:bg-[#F5F5F7]"
              >
                {order.action}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
