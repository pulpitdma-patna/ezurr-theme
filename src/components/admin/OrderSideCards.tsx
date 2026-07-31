import Link from "next/link";
import type { AdminOrder } from "@/data/admin";
import { formatInr } from "@/data/admin";
import { formatMobileDisplay } from "@/lib/auth";
import { mobileDigits } from "@/lib/mobileMatch";

/**
 * The right-hand column of the order screen: four cards, where there were six.
 *
 * The six were Status actions, Customer, Payment, an invented tax panel, Print,
 * and a tracking/notes form — so the answer to "what do I owe this customer" was
 * spread across three of them and contradicted by a fourth. These four each
 * answer one question: who is this, what is the money doing, where is the
 * parcel, what do I print.
 */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4">
      <h2 className="mb-2 text-xs font-semibold tracking-[-0.01em] text-[#1D1D1F]">{title}</h2>
      {children}
    </div>
  );
}

/**
 * Call and WhatsApp are the two most valuable buttons in the admin on a phone,
 * because in a cash-on-delivery market confirming an order IS a phone call. The
 * screen displayed the number and gave him nothing to do with it but read it out
 * to himself while dialling.
 */
export function OrderCustomerCard({ order }: { order: AdminOrder }) {
  const digits = mobileDigits(order.customerMobile);
  const reachable = digits.length === 10;

  return (
    <Card title="Customer">
      <div className="text-sm font-semibold tracking-[-0.02em]">{order.customerName}</div>
      <div className="ez-mono mt-0.5 text-[11px] text-[#86868B]">
        {formatMobileDisplay(order.customerMobile)}
      </div>

      {reachable ? (
        <div className="mt-2 flex gap-2">
          <a
            href={`tel:+91${digits}`}
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-black/10 text-xs font-semibold hover:bg-[#FAFAFB]"
          >
            Call
          </a>
          <a
            href={`https://wa.me/91${digits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-black/10 text-xs font-semibold hover:bg-[#FAFAFB]"
          >
            WhatsApp
          </a>
        </div>
      ) : null}

      <div className="mt-3 rounded-xl bg-[#F7F7F8] px-3 py-2 text-xs text-[#424245]">
        <div className="mb-1 text-[11px] font-semibold text-[#6E6E73]">Send it to</div>
        <div>{order.addressLine1 ?? order.customerName}</div>
        {order.addressLine2 ? <div>{order.addressLine2}</div> : null}
        <div className="ez-mono mt-0.5">
          {order.pincode ?? "No pincode"} · {order.city}
        </div>
      </div>

      {/* By number, not by customer id: the orders list already answers this
          question, a search there spans every pile rather than the tab he last
          left open, and the phone number is the one thing every order has. */}
      {reachable ? (
        <Link
          href={`/admin/orders?q=${digits}`}
          className="mt-3 inline-flex text-xs font-semibold text-[#424245] hover:underline"
        >
          See all their orders →
        </Link>
      ) : null}
    </Card>
  );
}

/**
 * Order total · paid online · to collect · sent back. Nothing else.
 *
 * `notes` is where an action that is missing explains itself. An option that
 * silently is not there reads as a screen with a bug in it; the reason it is not
 * there — cash order, wrong role, already posted — is the actual answer, and it
 * belongs beside the money it is about.
 */
export function OrderMoneyCard({ order, notes = [] }: { order: AdminOrder; notes?: string[] }) {
  const money = order.money;

  return (
    <Card title="Money">
      <dl className="space-y-1.5 text-xs">
        <Row label="Order total" value={money ? formatInr(money.total) : order.total} />
        {money ? (
          <>
            <Row label="Paid online" value={formatInr(money.amountPaid)} />
            <Row
              label={money.method === "cod" ? "To collect at the door" : "Still to pay"}
              value={formatInr(money.balanceDue)}
            />
            {money.refundedTotal > 0 ? (
              <Row label="Sent back" value={formatInr(money.refundedTotal)} tone="danger" />
            ) : null}
          </>
        ) : null}
      </dl>
      {notes.length > 0 ? (
        <div className="mt-3 space-y-1.5 border-t border-black/[0.05] pt-2.5">
          {notes.map((note) => (
            <p key={note} className="text-[11px] text-[#86868B]">
              {note}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[#6E6E73]">{label}</dt>
      <dd className={`font-semibold ${tone === "danger" ? "text-[#9F1239]" : "text-[#1D1D1F]"}`}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Everything printable, in one place, all of it rendered by the document screen
 * — which is the only thing that knows how to leave the order total off a
 * packing list. The courier label is the courier's own artwork and is opened,
 * never redrawn: a label we redraw is a label the courier can refuse.
 */
export function OrderPrintCard({
  order,
  labelUrl,
}: {
  order: AdminOrder;
  labelUrl?: string | null;
}) {
  return (
    <Card title="Print">
      <div className="space-y-2">
        <Link
          href={`/admin/orders/${order.id}/documents?type=packing_slip`}
          className="flex h-9 items-center justify-center rounded-xl border border-black/10 text-xs font-semibold hover:bg-[#FAFAFB]"
        >
          Print packing list
        </Link>
        <Link
          href={`/admin/orders/${order.id}/documents?type=invoice`}
          className="flex h-9 items-center justify-center rounded-xl border border-black/10 text-xs font-semibold hover:bg-[#FAFAFB]"
        >
          Print bill
        </Link>
        {labelUrl ? (
          <a
            href={labelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center justify-center rounded-xl border border-black/10 text-xs font-semibold hover:bg-[#FAFAFB]"
          >
            Print courier label
          </a>
        ) : null}
        <p className="text-[11px] text-[#86868B]">
          The bill works out CGST, SGST or IGST from where it is going, and the HSN code for every
          line.
        </p>
      </div>
    </Card>
  );
}
