import Link from "next/link";
import { gameCards } from "@/data/home";

export function DigitalCardFeature() {
  return (
    <section className="ez-page ez-section" aria-labelledby="digital-cards-title">
      <div className="overflow-hidden rounded-[30px] bg-[#101012] px-6 py-10 sm:rounded-[38px] sm:px-10 sm:py-14 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-12 lg:px-14 lg:py-16">
        <div className="mb-9 lg:mb-0">
          <span className="ez-section-kicker !text-white/45">Instant delivery</span>
          <h2
            id="digital-cards-title"
            className="mt-3 text-[clamp(2.2rem,5vw,4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-white"
          >
            More play.
            <br />
            Zero waiting.
          </h2>
          <p className="mt-5 max-w-[460px] text-base leading-relaxed text-white/60">
            Wallet top-ups, memberships, and digital codes delivered securely to your mobile.
          </p>
          <Link
            href="/game-cards"
            className="mt-7 inline-flex min-h-12 items-center rounded-full bg-white px-6 text-sm font-semibold text-[#1D1D1F] transition hover:bg-white/90 hover:!text-[#1D1D1F]"
          >
            Explore game cards <span aria-hidden="true" className="ml-2">→</span>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {gameCards.slice(0, 3).map((card) => (
            <article
              key={`${card.name}-${card.value}`}
              className="relative flex min-h-[230px] flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 p-5 text-white shadow-2xl"
              style={{ background: card.bg }}
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <span className="ez-mono text-[8px] font-bold uppercase tracking-[0.16em] text-white/55">
                  {card.tag}
                </span>
                <h3 className="mt-2 text-xl font-semibold leading-tight tracking-[-0.03em] text-white">
                  {card.title}
                </h3>
                <p className="ez-mono mt-1 text-[9px] uppercase tracking-[0.12em] text-white/45">
                  {card.sub}
                </p>
              </div>
              <div className="relative">
                <div className="text-2xl font-semibold tracking-[-0.04em]">{card.value}</div>
                <div className="ez-mono mt-1 text-[10px] text-white/55">{card.price}</div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
