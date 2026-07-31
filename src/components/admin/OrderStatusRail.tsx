import type { AdminOrder, AdminOrderStatus } from "@/data/admin";

/**
 * Where this order has got to, and what is still left — as a rail, not a badge.
 *
 * A badge answers "where is it". Standing at the counter with a customer on the
 * phone, that is rarely the question: he wants to know what has already happened
 * and what has not, and a single word cannot say that. This is the admin twin of
 * the customer-facing stepper in components/orders/OrderTracker.
 *
 * Three shapes, because three kinds of order genuinely have different lives:
 *
 *  - **Physical** — Placed, Accepted, Packed, Sent, Delivered.
 *  - **Digital** — Placed, Paid, Code sent. Three steps, not five: an order that
 *    is an email with a code in it has nothing to pack and nothing to hand to a
 *    courier, and showing it a greyed-out "Packed" step invites him to look for
 *    a parcel that does not exist.
 *  - **Pre-order** — the physical rail with the wait pinned in front of it, so
 *    "why has this one not moved in three weeks" answers itself.
 *
 * **Mixed orders get one rail, and it is the physical one whenever any line is
 * physical.** He has one parcel to post and one customer to ring; splitting an
 * order into two fulfilments would be a truthful data model and a useless
 * screen. The digital lines say `Code sent` on their own row in the item list.
 */

export type RailStepState = "done" | "current" | "todo";

export type RailStep = {
  key: string;
  label: string;
  state: RailStepState;
};

export type Rail = {
  shape: "physical" | "digital" | "preorder";
  steps: RailStep[];
  /** Pinned in front of the rail — the wait a pre-order is stuck behind. */
  pinned?: string;
  /** Set instead of steps when the order stopped rather than finished. */
  terminal?: string;
};

/** Statuses that mean the money is in. Mirrors Order::SETTLED_STATUSES. */
const SETTLED: AdminOrderStatus[] = ["paid", "confirmed", "packed", "shipped", "delivered"];

function done(status: AdminOrderStatus, reached: AdminOrderStatus[]): boolean {
  return reached.includes(status);
}

/** Everything up to the first unfinished step is done; that one is current. */
function withStates(steps: { key: string; label: string; done: boolean }[]): RailStep[] {
  const firstTodo = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    key: s.key,
    label: s.label,
    state: s.done ? "done" : i === firstTodo ? "current" : "todo",
  }));
}

/**
 * The rail for one order. Pure, so the shape of every kind of order can be
 * asserted without rendering anything.
 *
 * @param codeSent Whether a game code has actually gone out — the page knows
 *   this from the codes on the order, and it is not derivable from the status.
 * @param releaseAt When a pre-order is expected. Optional and usually absent:
 *   nothing on an order records the release date today, and a date we do not
 *   have is not a date we print.
 */
export function orderRail(
  order: AdminOrder,
  opts: { codeSent?: boolean; releaseAt?: string } = {},
): Rail {
  if (order.status === "cancelled") {
    return { shape: "physical", steps: [], terminal: "Cancelled. Nothing more will happen." };
  }
  if (order.status === "refunded") {
    return { shape: "physical", steps: [], terminal: "Money sent back. This order is closed." };
  }

  const types = new Set((order.items ?? []).map((i) => i.fulfillmentType));
  const isPreorder = order.status === "preorder" || types.has("preorder");
  // Digital only when EVERY line is digital. One physical line means a parcel.
  const digitalOnly = !isPreorder && types.size > 0 && types.has("digital") && !types.has("physical");

  if (digitalOnly) {
    return {
      shape: "digital",
      steps: withStates([
        { key: "placed", label: "Placed", done: true },
        { key: "paid", label: "Paid", done: done(order.status, SETTLED) },
        {
          key: "code-sent",
          label: "Code sent",
          done: opts.codeSent === true,
        },
      ]),
    };
  }

  return {
    shape: isPreorder ? "preorder" : "physical",
    pinned: isPreorder
      ? opts.releaseAt
        ? `Waiting for release — expected ${opts.releaseAt}`
        : "Waiting for release"
      : undefined,
    steps: withStates([
      { key: "placed", label: "Placed", done: true },
      {
        key: "accepted",
        label: "Accepted",
        done: done(order.status, ["confirmed", "paid", "packed", "shipped", "delivered"]),
      },
      { key: "packed", label: "Packed", done: done(order.status, ["packed", "shipped", "delivered"]) },
      { key: "sent", label: "Sent", done: done(order.status, ["shipped", "delivered"]) },
      { key: "delivered", label: "Delivered", done: order.status === "delivered" },
    ]),
  };
}

export function OrderStatusRail({
  order,
  codeSent,
  releaseAt,
  className = "",
}: {
  order: AdminOrder;
  codeSent?: boolean;
  releaseAt?: string;
  className?: string;
}) {
  const rail = orderRail(order, { codeSent, releaseAt });

  if (rail.terminal) {
    return (
      <p className={`text-xs font-medium text-[#B42318] ${className}`} data-testid="order-rail">
        {rail.terminal}
      </p>
    );
  }

  return (
    <div className={className} data-testid="order-rail">
      {rail.pinned ? (
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FFEDD5] px-2 py-0.5 text-[10px] font-semibold text-[#9A3412]">
          {rail.pinned}
        </div>
      ) : null}
      <ol className="flex items-start">
        {rail.steps.map((step, i) => (
          <li key={step.key} className="flex flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <span
                className={`h-0.5 flex-1 ${
                  i === 0 ? "opacity-0" : step.state === "done" ? "bg-[#1D1D1F]" : "bg-[#E3E3E8]"
                }`}
              />
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold ${
                  step.state === "done"
                    ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                    : "border-[#D6D6DB] bg-white text-[#C7C7CC]"
                } ${step.state === "current" ? "ring-4 ring-[#1D1D1F]/10" : ""}`}
                aria-hidden
              >
                {step.state === "done" ? "✓" : i + 1}
              </span>
              <span
                className={`h-0.5 flex-1 ${
                  i === rail.steps.length - 1
                    ? "opacity-0"
                    : rail.steps[i + 1]?.state === "done"
                      ? "bg-[#1D1D1F]"
                      : "bg-[#E3E3E8]"
                }`}
              />
            </div>
            <span
              className={`text-[10px] font-medium leading-tight ${
                step.state === "todo" ? "text-[#A1A1A6]" : "text-[#1D1D1F]"
              }`}
            >
              {step.label}
              {step.state === "current" ? <span className="sr-only"> (next)</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
