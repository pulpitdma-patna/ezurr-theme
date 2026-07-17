import Image from "next/image";
import Link from "next/link";

const stats = [
  { label: "Orders", value: "03", detail: "1 arriving soon" },
  { label: "Ezurr points", value: "1,240", detail: "₹124 reward value" },
  { label: "Wishlist", value: "08", detail: "2 price drops" },
];

export default function AccountPage() {
  return (
    <div>
      <div className="mb-8 sm:mb-10">
        <span className="ez-section-kicker">Your account</span>
        <h1 className="mt-3 text-[clamp(2.2rem,5vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
          Welcome back, Arjun.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#6E6E73]">
          Track orders, manage your details, and pick up where you left off.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat, index) => (
          <article
            key={stat.label}
            className={`rounded-[24px] p-5 sm:p-6 ${
              index === 0 ? "bg-[#1D1D1F] text-white" : "border border-black/[0.06] bg-[#F7F7F8]"
            }`}
          >
            <span className={`ez-mono text-[9px] uppercase tracking-[0.15em] ${index === 0 ? "text-white/45" : "text-[#86868B]"}`}>
              {stat.label}
            </span>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.045em]">{stat.value}</div>
            <p className={`mt-2 text-xs ${index === 0 ? "text-white/55" : "text-[#86868B]"}`}>{stat.detail}</p>
          </article>
        ))}
      </div>

      <section className="mt-10 rounded-[28px] border border-black/[0.07] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="ez-section-kicker">Latest order</span>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Arriving tomorrow.</h2>
          </div>
          <Link href="/account/orders" className="text-sm font-semibold text-[#424245]">
            View all orders →
          </Link>
        </div>

        <div className="mt-6 grid gap-6 rounded-[22px] bg-[#F7F7F8] p-4 sm:grid-cols-[110px_1fr_auto] sm:items-center sm:p-5">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-white">
            <Image
              src="https://ezurr.com/cdn/shop/files/ACCPLAY256.jpg?v=1772605855&width=533"
              alt="DualSense Controller Midnight Black"
              fill
              className="object-contain p-2"
              sizes="110px"
            />
          </div>
          <div>
            <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#3D7A4E]">Shipped · EZX24071891</div>
            <h3 className="mt-2 font-semibold tracking-[-0.02em]">DualSense Controller — Midnight Black</h3>
            <p className="mt-1 text-sm text-[#86868B]">Blue Dart · Tracking 781205391</p>
          </div>
          <Link
            href="/account/orders"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1D1D1F] px-5 text-sm font-semibold text-white hover:!text-white"
          >
            Track order
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-[-0.04em]">Quick actions</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["/account/wishlist", "Wishlist", "Return to saved products"],
            ["/account/addresses", "Addresses", "Manage delivery locations"],
            ["/account/profile", "Profile", "Update mobile and details"],
          ].map(([href, title, description]) => (
            <Link
              key={href}
              href={href}
              className="group rounded-[22px] border border-black/[0.07] p-5 transition hover:-translate-y-1 hover:shadow-[var(--ez-card-shadow)]"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{title}</h3>
                <span className="transition group-hover:translate-x-1">→</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-[#86868B]">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
