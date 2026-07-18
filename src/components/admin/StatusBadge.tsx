import type { AdminCustomerStatus, AdminOrderStatus, AdminProductStatus } from "@/data/admin";
import { orderStatusLabels, productStatusLabels } from "@/data/admin";

const orderTones: Record<AdminOrderStatus, string> = {
  pending: "text-[#92400E] bg-[#FEF3C7]",
  confirmed: "text-[#1D4ED8] bg-[#DBEAFE]",
  packed: "text-[#5B21B6] bg-[#EDE9FE]",
  shipped: "text-[#2D6B3C] bg-[#EAF6ED]",
  delivered: "text-[#6E6E73] bg-[#F0F0F2]",
  cancelled: "text-[#B42318] bg-[#FEE4E2]",
  preorder: "text-[#9A3412] bg-[#FFEDD5]",
  refunded: "text-[#9F1239] bg-[#FFE4E6]",
};

const customerTones: Record<AdminCustomerStatus, string> = {
  active: "text-[#2D6B3C] bg-[#EAF6ED]",
  new: "text-[#1D4ED8] bg-[#DBEAFE]",
  vip: "text-[#1D1D1F] bg-[#E8E8ED]",
  banned: "text-[#B42318] bg-[#FEE4E2]",
};

const productTones: Record<AdminProductStatus, string> = {
  draft: "text-[#6E6E73] bg-[#F0F0F2]",
  published: "text-[#2D6B3C] bg-[#EAF6ED]",
  sold_out: "text-[#B42318] bg-[#FEE4E2]",
};

type StatusBadgeProps =
  | { kind: "order"; status: AdminOrderStatus }
  | { kind: "customer"; status: AdminCustomerStatus }
  | { kind: "product"; status: AdminProductStatus }
  | { kind: "custom"; label: string; className?: string };

export function StatusBadge(props: StatusBadgeProps) {
  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold tracking-[-0.01em]";

  if (props.kind === "order") {
    return (
      <span className={`${base} ${orderTones[props.status]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {orderStatusLabels[props.status]}
      </span>
    );
  }

  if (props.kind === "customer") {
    return (
      <span className={`${base} capitalize ${customerTones[props.status]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {props.status}
      </span>
    );
  }

  if (props.kind === "product") {
    return (
      <span className={`${base} ${productTones[props.status]}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
        {productStatusLabels[props.status]}
      </span>
    );
  }

  return (
    <span className={`${base} ${props.className ?? "bg-[#F0F0F2] text-[#6E6E73]"}`}>
      {props.label}
    </span>
  );
}
