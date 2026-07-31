import type { AdminOrderEvent } from "@/data/admin";
import { formatAdminDateTime } from "@/lib/adminFormat";

// Was its own toLocaleString with no time zone, so history on this screen could
// disagree by a day with the same order's date in the list beside it.
const formatAt = formatAdminDateTime;

export function OrderTimeline({ events }: { events: AdminOrderEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-[#86868B]">No timeline events.</p>;
  }

  return (
    <ol className="relative space-y-0 border-l border-black/[0.1] pl-4">
      {events.map((event, index) => (
        <li key={event.id} className="relative pb-5 last:pb-0">
          <span
            className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
              index === events.length - 1 ? "bg-[#1D1D1F]" : "bg-[#AEAEB2]"
            }`}
          />
          <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#AEAEB2]">
            {formatAt(event.at)}
          </div>
          <div className="mt-0.5 text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
            {event.label}
            {event.actor ? (
              <span className="ml-2 text-[11px] font-medium text-[#86868B]">· {event.actor}</span>
            ) : null}
          </div>
          {event.detail ? (
            <p className="mt-0.5 text-xs text-[#6E6E73]">{event.detail}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
